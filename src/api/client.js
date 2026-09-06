import { supabase, SUPABASE_FUNCTIONS_URL } from './supabase';

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

export const api = {
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

  publishQuizBank: async (_teacher, topic, questions) => {
    // teacher_id is taken from the signed-in user by RLS; the _teacher arg is ignored.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('You must be signed in to publish.');

    const { error } = await supabase.from('tests').insert({
      teacher_id: user.id,
      title: topic,
      questions: (questions || []).map(toDbQuestion)
    });
    if (error) throw new Error(error.message || 'Could not publish.');
    return { ok: true };
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
      .select('id, title, subject, grade, content, created_at')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message || 'Could not load notes.');
    return { materials: data || [] };
  },

<<<<<<< HEAD
  getPublishedNotes: async () => {
    const { data, error } = await supabase
      .from('study_materials')
      .select('id, title, subject, grade, content, created_at')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message || 'Could not load notes.');
    return { materials: data || [] };
  },

=======
>>>>>>> origin/maze-updates
  createStudyMaterial: async ({ title, subject, grade, content }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('You must be signed in.');
    const { data, error } = await supabase
      .from('study_materials')
      .insert({ teacher_id: user.id, title, subject: subject || null, grade: grade || null, content })
      .select()
      .single();
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

<<<<<<< HEAD
  updateProfile: async (displayName) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('You must be signed in.');
    const { error } = await supabase.from('profiles').update({ display_name: displayName.trim() }).eq('id', user.id);
    if (error) throw new Error(error.message || 'Could not update your profile.');
    return { ok: true };
  },

=======
>>>>>>> origin/maze-updates
  generateQuestions: async (files, topic) => {
    // AI extraction from slides runs in a Supabase Edge Function ("generate-questions").
    // If that function isn't deployed this fails clearly and the rest of the app is fine.
    if (!SUPABASE_FUNCTIONS_URL) throw new Error('Supabase is not configured.');

    const { data: { session } } = await supabase.auth.getSession();
    const form = new FormData();
    files.forEach((f) => {
      form.append('files', { uri: f.uri, name: f.name, type: f.mimeType || 'application/octet-stream' });
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
  }
};
