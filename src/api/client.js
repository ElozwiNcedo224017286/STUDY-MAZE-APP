import { supabase, SUPABASE_FUNCTIONS_URL } from './supabase';
import { File } from 'expo-file-system';

async function getEdgeFunctionErrorMessage(error, fallback) {
  const response = error?.context;
  if (response && typeof response.clone === 'function') {
    try {
      const payload = await response.clone().json();
      const message = payload?.error || payload?.message || payload?.msg;
      if (typeof message === 'string' && message.trim()) return message;
    } catch {
      try {
        const body = await response.clone().text();
        if (body.trim()) return body.slice(0, 500);
      } catch {
        // Fall back to the SDK error when the response body is unavailable.
      }
    }
  }
  return error?.message || fallback;
}

// The games speak in { subject, q, opts, correct }; the `tests` table stores questions
// as { q, choices, answer } (+ subject). Convert at the boundary in both directions.
function toAppQuestion(row) {
  return {
    subject: row.subject || 'QUIZ',
    q: row.q,
    opts: row.opts || row.choices || [],
    correct: typeof row.correct === 'number' ? row.correct : (row.answer ?? 0)
  };
}

function toDbQuestion(q) {
  return { subject: q.subject || 'QUIZ', q: q.q, choices: q.opts, answer: q.correct };
}

// Trusted Quiz Rush responses are validated before the screen adopts any state.
function validateStudyQuizQuestion(question) {
  if (!question || typeof question.question_id !== 'string' || !question.question_id ||
      typeof question.subject !== 'string' || typeof question.prompt !== 'string' ||
      !Number.isFinite(Date.parse(question.deadline_at)) ||
      !Array.isArray(question.options) || question.options.length < 2 ||
      question.options.some((option) => !option || typeof option.id !== 'string' || !option.id || typeof option.text !== 'string') ||
      new Set(question.options.map((option) => option.id)).size !== question.options.length) {
    throw new Error('Invalid Study Quiz question response.');
  }
}

function validateStudyQuizState(state) {
  if (!state || typeof state.attempt_id !== 'string' || !state.attempt_id ||
      !Number.isInteger(state.correct_count) || state.correct_count < 0 || state.correct_count > 10 ||
      !Number.isInteger(state.lives_remaining) || state.lives_remaining < 0 || state.lives_remaining > 3) {
    throw new Error('Invalid Study Quiz attempt response.');
  }
}

async function resolveStudyQuizQuestion(rpc, attemptId, questionId, selectedOptionId) {
  const args = { _attempt_id: attemptId, _question_id: questionId };
  if (rpc === 'submit_study_quiz_answer') args._selected_option_id = selectedOptionId;
  const { data, error } = await supabase.rpc(rpc, args);
  if (error) throw new Error(error.message || 'Could not resolve the question.');
  validateStudyQuizState(data);
  if (data.attempt_id !== attemptId ||
      (data.question_id != null && data.question_id !== questionId) ||
      typeof data.already_resolved !== 'boolean' ||
      (!data.already_resolved && (data.question_id !== questionId ||
        !['correct', 'incorrect', 'timeout'].includes(data.outcome) || typeof data.is_correct !== 'boolean')) ||
      !Number.isInteger(data.xp_awarded) || data.xp_awarded < 0 ||
      !['in_progress', 'completed'].includes(data.status)) {
    throw new Error('Invalid Study Quiz answer response.');
  }
  if (data.status === 'in_progress') {
    validateStudyQuizQuestion(data.next_question);
    if (data.next_question.question_id === questionId) throw new Error('Study Quiz did not advance the question.');
  } else if (data.next_question !== null || typeof data.completed_target !== 'boolean') {
    throw new Error('Invalid Study Quiz completion response.');
  }
  return data;
}

// Memory uses safe recovery projections; flip responses may be action deltas.
function memoryResponse(data, expectedAttemptId, requireBoard = false) {
  const state = Array.isArray(data) && data.length === 1 ? data[0] : data;
  if (!state || typeof state !== 'object' || Array.isArray(state) ||
      (state.attempt_id != null && (typeof state.attempt_id !== 'string' || !state.attempt_id)) ||
      (expectedAttemptId && state.attempt_id != null && state.attempt_id !== expectedAttemptId)) {
    throw new Error('Invalid Memory Match response.');
  }
  if (requireBoard) {
    if (typeof state.attempt_id !== 'string' || !state.attempt_id ||
        !['in_progress', 'completed'].includes(state.status) ||
        !Number.isFinite(Date.parse(state.deadline_at)) ||
        !Number.isInteger(state.moves) || state.moves < 0 ||
        !Number.isInteger(state.matched_pairs) || state.matched_pairs < 0 || state.matched_pairs > 8 ||
        !Number.isInteger(state.xp_awarded) || state.xp_awarded < 0 ||
        (state.state_version != null && (!Number.isInteger(state.state_version) || state.state_version < 0)) ||
        (state.server_now != null && !Number.isFinite(Date.parse(state.server_now))) ||
        (state.status === 'completed' && typeof state.won !== 'boolean') ||
        !Array.isArray(state.cards) || state.cards.length !== 16) {
      throw new Error('Invalid Memory Match state.');
    }
    const ids = new Set();
    const positions = new Set();
    for (const card of state.cards) {
      if (!card || typeof card.card_id !== 'string' || !card.card_id || ids.has(card.card_id) ||
          !Number.isInteger(card.position) || positions.has(card.position) ||
          typeof card.matched !== 'boolean' || typeof card.face_up !== 'boolean' ||
          ((card.face_up || card.matched) && typeof card.face_value !== 'string')) {
        throw new Error('Invalid Memory Match card projection.');
      }
      ids.add(card.card_id);
      positions.add(card.position);
    }
    // Explicit safe projection: no private layout/pair fields are retained.
    return {
      attempt_id: state.attempt_id, status: state.status, rules_version: state.rules_version,
      started_at: state.started_at, deadline_at: state.deadline_at, completed_at: state.completed_at,
      matched_pairs: state.matched_pairs, moves: state.moves, xp_awarded: state.xp_awarded,
      ...(Number.isInteger(state.coins_awarded) && state.coins_awarded >= 0 ? { coins_awarded: state.coins_awarded } : {}),
      state_version: state.state_version, won: state.won, reason: state.reason, server_now: state.server_now,
      cards: state.cards.map((card) => ({
        card_id: card.card_id, position: card.position, matched: card.matched, face_up: card.face_up,
        ...((card.face_up || card.matched) ? { face_value: card.face_value } : {}),
      })).sort((a, b) => a.position - b.position),
    };
  }
  return state;
}

async function callMemoryRpc(name, args, requireBoard = false) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    const failure = new Error(error.message || 'Memory Match request failed.');
    failure.code = error.code;
    failure.rejected = /^[0-9A-Z]{5}$/.test(error.code || '');
    throw failure;
  }
  return memoryResponse(data, args?._attempt_id, requireBoard);
}

// Maze V1 validates attempt boundaries; real-time gameplay remains local.
function validateMazeResponse(data, status, attemptId, level) {
  if (!data || typeof data !== 'object' || Array.isArray(data) ||
      typeof data.attempt_id !== 'string' || !data.attempt_id ||
      (attemptId && data.attempt_id !== attemptId) || data.status !== status ||
      !Number.isInteger(data.xp_awarded) || data.xp_awarded < 0 ||
      (data.game != null && data.game !== 'quiz_maze') ||
      (level != null && (data.level !== level || data.game !== 'quiz_maze' ||
        data.rules_version !== 1 || !Number.isFinite(Date.parse(data.started_at))))) {
    throw new Error('Invalid Maze attempt response.');
  }
  return data;
}

// Admin operations use the existing authenticated client; RPCs enforce authorization.
async function adminRpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message || 'Could not complete the Admin request.');
  return data;
}

function adminRows(data) {
  if (!Array.isArray(data)) throw new Error('Invalid Admin list response.');
  return data;
}

function rewardsRows(data) {
  if (!Array.isArray(data)) throw new Error('Invalid Rewards list response.');
  return data;
}

// Rewards mutations preserve error codes so callers can retain uncertain request IDs.
async function rewardsRpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    const failure = new Error(error.message || 'Could not complete the Rewards request.');
    failure.code = error.code;
    throw failure;
  }
  return data;
}

export const api = {
  getCoinBalance: async () => {
    const data = await rewardsRpc('get_coin_balance');
    const normalized = typeof data === 'number' ? data :
      typeof data === 'string' && data.trim() !== '' ? Number(data) : NaN;
    if (!Number.isFinite(normalized)) {
      throw new Error('Invalid trusted coin balance response.');
    }
    return normalized;
  },
  getRewards: async () => rewardsRows(await rewardsRpc('get_rewards')),
  getMyRedemptions: async () => rewardsRows(await rewardsRpc('get_my_redemptions')),
  redeemReward: async (rewardId, requestId) => {
    const data = await rewardsRpc('redeem_reward', { _reward_id: rewardId, _request_id: requestId });
    if (!data || typeof data.redemption_id !== 'string' || data.reward_id !== rewardId ||
        typeof data.balance !== 'number' || !Number.isFinite(data.balance) || typeof data.idempotent !== 'boolean') {
      throw new Error('Redemption response was unclear. Retry the same request to confirm it.');
    }
    return data;
  },
  adminListRewards: async () => rewardsRows(await rewardsRpc('admin_list_rewards')),
  adminSaveReward: async (payload) => {
    const id = await rewardsRpc('admin_save_reward', {
      _reward_id: payload.id ?? null, _name: payload.name, _description: payload.description,
      _coin_cost: payload.coin_cost, _is_enabled: payload.is_enabled, _stock_quantity: payload.stock_quantity,
    });
    if (typeof id !== 'string' || !id) throw new Error('Reward save response was unclear. Refresh before trying again.');
    return id;
  },
  adminListRedemptions: async () => rewardsRows(await rewardsRpc('admin_list_redemptions')),
  adminTransitionRedemption: async (redemptionId, action) => {
    const data = await rewardsRpc('admin_transition_redemption', { _redemption_id: redemptionId, _action: action });
    if (!data || data.redemption_id !== redemptionId ||
        data.status !== (action === 'fulfill' ? 'fulfilled' : 'cancelled') || typeof data.idempotent !== 'boolean') {
      throw new Error('Redemption status response was unclear. Refresh to check its current status.');
    }
    return data;
  },

  adminGetOverview: async () => {
    const data = await adminRpc('admin_get_overview');
    const row = Array.isArray(data) && data.length === 1 ? data[0] : data;
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('Invalid Admin overview response.');
    return row;
  },
  adminListClasses: async () => adminRows(await adminRpc('admin_list_classes')),
  adminGetClass: async (classId) => {
    const data = await adminRpc('admin_get_class', { _class_id: classId });
    if (!data || data.id !== classId || !Array.isArray(data.students) || !Array.isArray(data.teachers)) {
      throw new Error('Invalid class detail response.');
    }
    return data;
  },
  adminListChallenges: async () => adminRows(await adminRpc('admin_list_challenges')),
  adminSaveChallenge: async (payload) => {
    const id = await adminRpc('admin_save_challenge', {
      _challenge_id: payload.id ?? null, _title: payload.title, _description: payload.description,
      _challenge_type: payload.challenge_type, _starts_at: payload.starts_at,
      _ends_at: payload.ends_at, _class_id: payload.class_id,
    });
    if (typeof id !== 'string' || !id) throw new Error('Save response was unclear. Refresh challenges before trying again.');
    return id;
  },
  adminTransitionChallenge: (challengeId, action) => adminRpc('admin_transition_challenge', {
    _challenge_id: challengeId, _action: action,
  }),

  getActiveChallenge: async () => {
    const { data, error } = await supabase.rpc('get_active_challenge');
    if (error) throw new Error(error.message || 'Could not load your challenge.');
    if (data == null || (Array.isArray(data) && data.length === 0)) return null;
    if (Array.isArray(data) && data.length !== 1) throw new Error('Invalid active challenge response.');
    const challenge = Array.isArray(data) ? data[0] : data;
    if (!challenge || typeof challenge.id !== 'string' || !challenge.id ||
        typeof challenge.title !== 'string' || typeof challenge.status !== 'string' ||
        !Number.isFinite(Date.parse(challenge.starts_at)) || !Number.isFinite(Date.parse(challenge.ends_at))) {
      throw new Error('Invalid active challenge response.');
    }
    return challenge;
  },
  getChallengeLeaderboard: async (challengeId) => {
    if (typeof challengeId !== 'string' || !challengeId) throw new Error('A challenge is required.');
    const { data, error } = await supabase.rpc('get_challenge_leaderboard', { _challenge_id: challengeId });
    if (error) throw new Error(error.message || 'Could not load challenge standings.');
    const rows = data ?? [];
    if (!Array.isArray(rows) || rows.some((row) => !row || typeof row.user_id !== 'string' ||
        !/^[1-9][0-9]*$/.test(String(row.rank)) || !/^[0-9]+$/.test(String(row.total_xp)))) {
      throw new Error('Invalid challenge leaderboard response.');
    }
    // Preserve server row order, dense ranks, and zero-XP students. Never aggregate locally.
    return { rows };
  },

  startMazeAttempt: async (level) => {
    if (!Number.isInteger(level) || level < 1 || level > 3) throw new Error('Invalid Maze level.');
    const { data, error } = await supabase.rpc('start_maze_attempt', { _level: level });
    if (error) throw new Error(error.message || 'Could not start Maze.');
    return validateMazeResponse(data, 'in_progress', null, level);
  },
  completeMazeAttempt: async (attemptId, outcome) => {
    if (!attemptId || !['won', 'lost'].includes(outcome)) throw new Error('Invalid Maze completion request.');
    const { data, error } = await supabase.rpc('complete_maze_attempt', {
      _attempt_id: attemptId, _outcome: outcome,
    });
    if (error) throw new Error(error.message || 'Could not finalize Maze.');
    return validateMazeResponse(data, 'completed', attemptId);
  },

  startMemoryMatchAttempt: async (classSubjectId) => {
    if (typeof classSubjectId !== 'string' || !classSubjectId.trim()) throw new Error('Choose your current subject first.');
    const state = await callMemoryRpc('start_memory_match_attempt', { _class_subject_id: classSubjectId });
    if (typeof state.attempt_id !== 'string' || !state.attempt_id) throw new Error('Missing Memory Match attempt ID.');
    return { attempt_id: state.attempt_id };
  },
  flipMemoryMatchCard: async (attemptId, cardId, actionId) => {
    await callMemoryRpc('flip_memory_match_card', { _attempt_id: attemptId, _card_id: cardId, _action_id: actionId });
    // The screen fetches authoritative recovery state rather than interpreting action deltas.
  },
  getMemoryMatchState: (attemptId) =>
    callMemoryRpc('get_memory_match_state', { _attempt_id: attemptId }, true),
  timeoutMemoryMatchAttempt: async (attemptId) => {
    await callMemoryRpc('timeout_memory_match_attempt', { _attempt_id: attemptId });
  },

  startStudyQuizAttempt: async (classSubjectId) => {
    if (typeof classSubjectId !== 'string' || !classSubjectId.trim()) throw new Error('Choose your current subject first.');
    const { data, error } = await supabase.rpc('start_study_quiz_attempt', {
      _class_subject_id: classSubjectId,
    });
    if (error) throw new Error(error.message || 'Could not start Study Quiz.');
    if (!Array.isArray(data) || data.length !== 1) throw new Error('Invalid Study Quiz start response.');
    const attempt = data[0];
    validateStudyQuizState(attempt);
    validateStudyQuizQuestion(attempt);
    return attempt;
  },

  startStudyQuizChapterAttempt: async (classSubjectId, testId) => {
    if (typeof classSubjectId !== 'string' || !classSubjectId.trim() ||
        typeof testId !== 'string' || !testId.trim()) throw new Error('Select a subject and chapter first.');
    const { data, error } = await supabase.rpc('start_study_quiz_chapter_attempt', {
      _class_subject_id: classSubjectId,
      _test_id: testId,
    });
    if (error) throw new Error(error.message || 'Could not start Study Quiz.');
    if (!Array.isArray(data) || data.length !== 1) throw new Error('Invalid Study Quiz start response.');
    const attempt = data[0];
    validateStudyQuizState(attempt);
    validateStudyQuizQuestion(attempt);
    return attempt;
  },

  submitStudyQuizAnswer: (attemptId, questionId, selectedOptionId) =>
    resolveStudyQuizQuestion('submit_study_quiz_answer', attemptId, questionId, selectedOptionId),

  timeoutStudyQuizQuestion: (attemptId, questionId) =>
    resolveStudyQuizQuestion('timeout_study_quiz_question', attemptId, questionId),

  // The most recently published test acts as the "active" question set for the games.
  getQuizBank: async () => {
    const { data, error } = await supabase
      .from('tests')
      .select('title, questions, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message || 'Could not load quiz bank.');
    if (!data) return { meta: null, questions: [] };

    return {
      // profiles RLS is own-row-only, so students can't read the author's name here.
      meta: { topic: data.title, teacher: 'your teacher' },
      questions: (data.questions || []).map(toAppQuestion)
    };
  },

  getMazeChapterBank: async (classSubjectId, testId) => {
    if (typeof classSubjectId !== 'string' || !classSubjectId.trim() ||
      typeof testId !== 'string' || !testId.trim()) throw new Error('Select a subject and chapter first.');
    const { data, error } = await supabase.rpc('student_get_maze_chapter_bank', {
      _class_subject_id: classSubjectId, _test_id: testId,
    });
    if (error) throw error;
    const bank = Array.isArray(data) && data.length === 1 ? data[0] : data;
    const fields = ['chapter_title', 'subject_name', 'teacher_id', 'created_at'];
    if (!bank || typeof bank !== 'object' || Array.isArray(bank) ||
      bank.test_id !== testId || bank.class_subject_id !== classSubjectId ||
      fields.some((field) => typeof bank[field] !== 'string' || !bank[field].trim()) ||
      (bank.teacher_name != null && typeof bank.teacher_name !== 'string') || !Array.isArray(bank.questions)) {
      throw new Error('Invalid Maze chapter bank response.');
    }
    if (bank.questions.length === 0) throw new Error('This chapter has no questions. Choose another chapter.');
    const questions = bank.questions.map((question) => {
      if (!question || typeof question.q !== 'string' || !question.q.trim() ||
        !Array.isArray(question.choices) || question.choices.length < 2 ||
        question.choices.some((choice) => typeof choice !== 'string' || !choice.trim()) ||
        !Number.isInteger(question.answer) || question.answer < 0 || question.answer >= question.choices.length) {
        throw new Error('This chapter contains an invalid Maze question. Ask your teacher to review it.');
      }
      return { subject: bank.subject_name, q: question.q, opts: [...question.choices], correct: question.answer };
    });
    return {
      test_id: bank.test_id, class_subject_id: bank.class_subject_id,
      chapter_title: bank.chapter_title, subject_name: bank.subject_name,
      teacher_id: bank.teacher_id, teacher_name: bank.teacher_name,
      created_at: bank.created_at, questions,
    };
  },

  getMySubjects: async () => {
    const { data, error } = await supabase.rpc('student_list_my_subjects');
    if (error) throw error;
    if (data == null) return [];
    const fields = ['class_subject_id', 'class_id', 'class_name', 'subject_name', 'teacher_id'];
    if (!Array.isArray(data) || data.some((row) => !row ||
      fields.some((field) => typeof row[field] !== 'string' || !row[field].trim()) ||
      (row.teacher_name != null && typeof row.teacher_name !== 'string'))) {
      throw new Error('Invalid enrolled subjects response.');
    }
    return data.map(({ class_subject_id, class_id, class_name, subject_name, teacher_id, teacher_name }) => ({
      class_subject_id, class_id, class_name, subject_name, teacher_id, teacher_name,
    }));
  },

  getSubjectChapters: async (classSubjectId, moduleName) => {
    if (typeof classSubjectId !== 'string' || !classSubjectId.trim()) throw new Error('Select a subject first.');
    const moduleFilter = typeof moduleName === 'string' && moduleName.trim();
    const { data, error } = moduleFilter
      ? await supabase.rpc('student_list_subject_module_chapters', {
        _class_subject_id: classSubjectId, _module_name: moduleName.trim(),
      })
      : await supabase.rpc('student_list_subject_chapters', { _class_subject_id: classSubjectId });
    if (error) throw error;
    if (data == null) return [];
    if (!Array.isArray(data)) throw new Error('Invalid subject chapters response.');
    return data.map((row) => {
      const count = typeof row?.question_count === 'number' ? row.question_count :
        typeof row?.question_count === 'string' && row.question_count.trim() ? Number(row.question_count) : NaN;
      const fields = ['test_id', 'chapter_title', 'subject_name', 'teacher_id', 'created_at'];
      if (!row || fields.some((field) => typeof row[field] !== 'string' || !row[field].trim()) ||
        (row.teacher_name != null && typeof row.teacher_name !== 'string') || !Number.isSafeInteger(count) || count < 0) {
        throw new Error('Invalid subject chapters response.');
      }
      return {
        test_id: row.test_id, chapter_title: row.chapter_title, subject_name: row.subject_name,
        teacher_id: row.teacher_id, teacher_name: row.teacher_name,
        question_count: count, created_at: row.created_at,
      };
    });
  },

  getTeacherSubjectAssignments: async () => {
    const { data, error } = await supabase.rpc('teacher_list_subject_assignments');
    if (error) throw error;
    if (data == null) return [];
    const fields = ['class_subject_id', 'class_id', 'class_name', 'subject_name'];
    if (!Array.isArray(data) || data.some((row) => !row ||
      fields.some((field) => typeof row[field] !== 'string' || !row[field].trim()))) {
      throw new Error('Invalid teacher subject assignments response.');
    }
    return data.map(({ class_subject_id, class_id, class_name, subject_name }) => ({
      class_subject_id, class_id, class_name, subject_name,
    }));
  },

  publishQuizBank: async (classSubjectId, chapterTitle, questions, moduleName) => {
    if (!classSubjectId || typeof chapterTitle !== 'string' || !chapterTitle.trim() ||
      !Array.isArray(questions) || questions.length === 0 ||
      typeof moduleName !== 'string' || !moduleName.trim() || moduleName.trim().length > 100) {
      throw new Error('Select an assigned subject, enter a module and chapter name, and add questions.');
    }
    const { data, error } = await supabase.rpc('teacher_publish_quiz_bank', {
      _class_subject_id: classSubjectId,
      _chapter_title: chapterTitle.trim(),
      _questions: questions.map(toDbQuestion),
      _module_name: moduleName.trim(),
    });
    if (error) throw error;
    return data;
  },

  // Removes this teacher's published tests (RLS restricts deletes to their own rows).
  clearQuizBank: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('You must be signed in.');
    const { error } = await supabase.from('tests').delete().eq('teacher_id', user.id);
    if (error) throw new Error(error.message || 'Could not clear quiz bank.');
    return { ok: true };
  },

  // The current teacher's most recently published test, so they can manage its questions.
  getMyLatestTest: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('You must be signed in.');
    const { data, error } = await supabase
      .from('tests')
      .select('id, title, questions, created_at')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message || 'Could not load your quiz.');
    if (!data) return null;
    return { id: data.id, topic: data.title, questions: (data.questions || []).map(toAppQuestion) };
  },

  // Overwrites a test's questions (used for editing/removing individual questions).
  updateTestQuestions: async (id, questions) => {
    const { error } = await supabase
      .from('tests')
      .update({ questions: (questions || []).map(toDbQuestion) })
      .eq('id', id);
    if (error) throw new Error(error.message || 'Could not update the quiz.');
    return { ok: true };
  },

  // ---- Study materials (teacher notes for students) ----
  getStudyMaterials: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('You must be signed in.');
    const { data, error } = await supabase
      .from('study_materials')
      .select('id, title, subject, grade, content, module_name, created_at')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message || 'Could not load notes.');
    return { materials: data || [] };
  },

  getPublishedNotes: async () => {
    const { data, error } = await supabase
      .from('study_materials')
      .select('id, title, subject, grade, content, created_at')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message || 'Could not load notes.');
    return { materials: data || [] };
  },

  getSubjectMaterials: async (classSubjectId) => {
    if (typeof classSubjectId !== 'string' || !classSubjectId.trim()) throw new Error('Choose your current subject first.');
    const { data, error } = await supabase.rpc('student_list_subject_materials', { _class_subject_id: classSubjectId });
    if (error) throw error;
    if (data != null && !Array.isArray(data)) throw new Error('Invalid subject materials response.');
    return { materials: data || [] };
  },

  getSubjectModules: async (classSubjectId) => {
    if (typeof classSubjectId !== 'string' || !classSubjectId.trim()) throw new Error('Choose your current subject first.');
    const { data, error } = await supabase.rpc('student_list_subject_modules', {
      _class_subject_id: classSubjectId,
    });
    if (error) throw error;
    if (data != null && (!Array.isArray(data) ||
      data.some((row) => typeof row?.module_name !== 'string' || !row.module_name.trim()))) {
      throw new Error('Invalid subject modules response.');
    }
    return data || [];
  },

  getSubjectModuleMaterials: async (classSubjectId, moduleName) => {
    if (typeof classSubjectId !== 'string' || !classSubjectId.trim() ||
      typeof moduleName !== 'string' || !moduleName.trim()) {
      throw new Error('Choose a subject and module to view teacher materials.');
    }
    const { data, error } = await supabase.rpc('student_list_subject_module_materials', {
      _class_subject_id: classSubjectId,
      _module_name: moduleName.trim(),
    });
    if (error) throw error;
    if (data != null && !Array.isArray(data)) throw new Error('Invalid subject materials response.');
    return { materials: data || [] };
  },

  createStudyMaterial: async ({ classSubjectId, moduleName, title, grade, content }) => {
    if (typeof classSubjectId !== 'string' || !classSubjectId.trim()) throw new Error('Select an assigned class subject first.');
    if (typeof moduleName !== 'string' || !moduleName.trim() || moduleName.trim().length > 100) {
      throw new Error('Enter a module name up to 100 characters.');
    }
    if (!title?.trim() || !content?.trim()) throw new Error('Add a title and some content.');
    const { data, error } = await supabase.rpc('teacher_publish_study_material', {
      _class_subject_id: classSubjectId, _title: title.trim(), _grade: grade?.trim() || null,
      _content: content.trim(), _module_name: moduleName.trim(),
    });
    if (error) throw new Error(error.message || 'Could not post the note.');
    return { material: data };
  },

  deleteStudyMaterial: async (id) => {
    const { error } = await supabase.from('study_materials').delete().eq('id', id);
    if (error) throw new Error(error.message || 'Could not delete the note.');
    return { ok: true };
  },

  // ---- Class leaderboard (SECURITY DEFINER RPC — aggregates everyone's coins) ----
  getLeaderboard: async (limit = 50) => {
    const { data, error } = await supabase.rpc('get_leaderboard', { _limit: limit });
    if (error) throw new Error(error.message || 'Could not load the leaderboard.');
    return { rows: data || [] };
  },

  updateProfile: async (displayName) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('You must be signed in.');
    const { error } = await supabase.from('profiles').update({ display_name: displayName.trim() }).eq('id', user.id);
    if (error) throw new Error(error.message || 'Could not update your profile.');
    return { ok: true };
  },

  uploadProfileImage: async (asset) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('You must be signed in.');
    if (!asset?.uri) throw new Error('No image was selected.');

    const extension = (asset.name?.split('.').pop() || asset.mimeType?.split('/').pop() || 'jpg').toLowerCase();
    const contentType = asset.mimeType || `image/${extension === 'jpg' ? 'jpeg' : extension}`;
    const path = `${user.id}/profile-${Date.now()}.${extension}`;
    const response = await fetch(asset.uri);
    if (!response.ok) throw new Error('Could not read the selected image.');
    const imageData = await response.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, imageData, { contentType, upsert: false });
    if (uploadError) throw new Error(uploadError.message || 'Could not upload profile image.');

    const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(path);
    const imageUrl = `${publicData.publicUrl}?v=${Date.now()}`;
    const { error: imageError } = await supabase.from('profile_images').upsert({
      user_id: user.id,
      storage_path: path,
      image_url: imageUrl,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    if (imageError) throw new Error(imageError.message || 'Could not save profile image.');

    const { error: profileError } = await supabase.from('profiles').update({ avatar_url: imageUrl }).eq('id', user.id);
    if (profileError) throw new Error(profileError.message || 'Could not update profile image.');
    return { imageUrl };
  },

  uploadStudentSlides: async (file, classSubjectId) => {
    if (typeof classSubjectId !== 'string' || !classSubjectId.trim()) {
      throw new Error('Choose your current subject before uploading a PDF.');
    }
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('You must be signed in.');
    }

    if (!file?.uri) {
      throw new Error('No PDF was selected.');
    }

    const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const storagePath = `${user.id}/${uploadId}.pdf`;

    const response = await fetch(file.uri);

    if (!response.ok) {
      throw new Error('Could not read the selected PDF.');
    }

    const pdfData = await response.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('student-slides')
      .upload(storagePath, pdfData, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(
        uploadError.message || 'Could not upload your PDF.'
      );
    }

    let registeredId;
    try {
      const { data, error } = await supabase.rpc('student_register_subject_upload', {
        _class_subject_id: classSubjectId,
        _title: file.name || 'Study slides',
        _file_name: file.name || 'study-slides.pdf',
        _storage_path: storagePath,
        _file_size: file.size || null,
      });
      if (error) throw error;
      if (typeof data !== 'string' || !data) throw new Error('Invalid upload registration response.');
      registeredId = data;
    } catch (registrationError) {
      // Cleanup is best-effort; it must never hide the original registration error.
      try { await supabase.storage.from('student-slides').remove([storagePath]); }
      catch { /* The registration error remains the actionable failure. */ }
      throw registrationError;
    }

    return { upload: { id: registeredId }, storagePath };
  },

    validateStudentUpload: async (uploadId) => {
    if (!uploadId) {
      throw new Error('Upload ID is required.');
    }

    const { data, error } = await supabase.functions.invoke(
      'validate-student-upload',
      {
        body: {
          upload_id: uploadId,
        },
      }
    );

    if (error) {
      throw new Error(await getEdgeFunctionErrorMessage(error, 'Could not validate your PDF.'));
    }

    if (!data?.valid) {
      throw new Error(
        data?.error || 'Your PDF did not pass validation.'
      );
    }

    return data;
  },

  generateStudyNotes: async (uploadId) => {
    if (!uploadId) {
      throw new Error('Upload ID is required.');
    }

    const { data, error } = await supabase.functions.invoke(
      'generate-study-notes',
      {
        body: {
          upload_id: uploadId,
        },
      }
    );

    if (error) {
      throw new Error(await getEdgeFunctionErrorMessage(error, 'Could not generate study notes.'));
    }

    if (!data?.success) {
      throw new Error(
        data?.error || 'Could not generate study notes.'
      );
    }

    return data;
  },

  getStudentStudyNotes: async (classSubjectId) => {
    if (typeof classSubjectId !== 'string' || !classSubjectId.trim()) {
      throw new Error('Choose your current subject to view personal notes.');
    }
    const { data, error } = await supabase.rpc('student_list_subject_study_notes', {
      _class_subject_id: classSubjectId,
    });
    if (error) throw error;
    if (data != null && !Array.isArray(data)) throw new Error('Invalid personal study notes response.');
    return (data || []).map((row) => {
      if (!row || typeof row.note_id !== 'string' || typeof row.upload_id !== 'string' ||
          row.class_subject_id !== classSubjectId) throw new Error('Invalid subject-linked personal note response.');
      return {
        id: row.note_id,
        upload_id: row.upload_id,
        summary: row.summary,
        key_concepts: row.key_concepts,
        examples: row.examples,
        revision_summary: row.revision_summary,
        created_at: row.note_created_at,
        student_uploads: {
          id: row.upload_id,
          title: row.upload_title,
          file_name: row.file_name,
          page_count: row.page_count,
          created_at: row.upload_created_at,
          subject: row.subject,
          class_subject_id: row.class_subject_id,
        },
      };
    });
  },

  getNotifications: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('You must be signed in.');
    const { data, error } = await supabase
      .from('notifications')
      .select('id, category, title, message, data, read_at, created_at')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message || 'Could not load notifications.');
    return data || [];
  },

  markNotificationRead: async (id) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message || 'Could not update notification.');
    return { ok: true };
  },

  createAnnouncement: async ({ title, message }) => {
    const cleanTitle = title?.trim();
    const cleanMessage = message?.trim();
    if (!cleanTitle || !cleanMessage) {
      throw new Error('Enter an announcement title and message.');
    }
    if (cleanTitle.length > 120 || cleanMessage.length > 2000) {
      throw new Error('Keep the title under 120 characters and the message under 2,000 characters.');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('You must be signed in to send an announcement.');

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        recipient_id: null,
        category: 'announcement',
        title: cleanTitle,
        message: cleanMessage,
        created_by: user.id,
      })
      .select('id, title, message, created_at')
      .single();

    if (error) throw new Error(error.message || 'Could not publish the announcement.');
    return data;
  },

  generateQuestions: async (files, topic) => {
    // AI extraction from slides runs in a Supabase Edge Function ("generate-questions").
    // If that function isn't deployed this fails clearly and the rest of the app is fine.
    if (!SUPABASE_FUNCTIONS_URL) throw new Error('Supabase is not configured.');

    const { data: { session } } = await supabase.auth.getSession();
    const form = new FormData();
    files.forEach((f) => {
      const file = new File(f.uri);

      form.append('files', file, f.name);

      console.log('Teacher PDF upload details:', {
        uri: f.uri,
        name: f.name,
        mimeType: f.mimeType,
      });
    });
    form.append('topic', topic || '');

    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/generate-questions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`
      },
      body: form
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Question generation failed.');
    return data;
  },
};
