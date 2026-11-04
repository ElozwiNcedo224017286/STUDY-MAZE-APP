CREATE OR REPLACE FUNCTION public.issue_study_quiz_question(_attempt_id uuid, _sequence integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_question_id uuid;
  v_source_kind text := 'builtin';
  v_source_context jsonb := '{}'::jsonb;
  v_source_question_ref text;
  v_source_revision text;
  v_source_test_id uuid;
  v_question_source_kind text;
  v_subject text;
  v_prompt text;
  v_source_options jsonb;
  v_correct_index integer;
  v_builtin_id text;
  v_builtin_revision integer;
  v_teacher_questions jsonb;
  v_teacher_question jsonb;
  v_teacher_ordinal bigint;
  v_note_concepts jsonb;
  v_note_question jsonb;
  v_note_ordinal bigint;
  v_snapshot_options jsonb := '[]'::jsonb;
  v_correct_option_id text;
  v_option_text text;
  v_option_id text;
  v_index integer := 0;
  v_issued_at timestamptz := clock_timestamp();
  v_deadline_at timestamptz;
BEGIN
  IF _attempt_id IS NULL THEN
    RAISE EXCEPTION 'Attempt ID is required.';
  END IF;
  IF _sequence IS NULL OR _sequence <= 0 THEN
    RAISE EXCEPTION 'Question sequence must be positive.';
  END IF;

  SELECT COALESCE(ga.source_context, '{}'::jsonb)
  INTO v_source_context
  FROM public.game_attempts ga
  WHERE ga.id = _attempt_id
    AND ga.game = 'study_quiz'
    AND ga.status = 'in_progress';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active study quiz attempt not found.';
  END IF;

  v_source_kind := COALESCE(NULLIF(trim(v_source_context->>'source_kind'), ''), 'builtin');

  IF v_source_kind = 'teacher_test' THEN
    IF jsonb_typeof(v_source_context->'questions') <> 'array'
       OR jsonb_array_length(v_source_context->'questions') = 0 THEN
      RAISE EXCEPTION 'Study quiz chapter snapshot is unavailable.';
    END IF;
    v_teacher_questions := v_source_context->'questions';
    IF COALESCE(char_length(trim(v_source_context->>'subject_name')), 0) = 0 THEN
      RAISE EXCEPTION 'Study quiz chapter subject is unavailable.';
    END IF;
    v_subject := trim(v_source_context->>'subject_name');
    BEGIN
      v_source_test_id := (v_source_context->>'test_id')::uuid;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Study quiz chapter test ID is invalid.';
    END;
    IF v_source_test_id IS NULL THEN
      RAISE EXCEPTION 'Study quiz chapter test ID is unavailable.';
    END IF;

    SELECT q.item, q.ord
    INTO v_teacher_question, v_teacher_ordinal
    FROM jsonb_array_elements(v_teacher_questions) WITH ORDINALITY AS q(item, ord)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.study_quiz_attempt_questions aq
      WHERE aq.attempt_id = _attempt_id
        AND aq.source_kind = 'teacher_test'
        AND aq.source_test_id = v_source_test_id
        AND aq.source_question_ref = (q.ord - 1)::text
    )
    ORDER BY random()
    LIMIT 1;

    IF v_teacher_question IS NULL THEN
      SELECT q.item, q.ord
      INTO v_teacher_question, v_teacher_ordinal
      FROM jsonb_array_elements(v_teacher_questions) WITH ORDINALITY AS q(item, ord)
      ORDER BY random()
      LIMIT 1;
    END IF;
    IF v_teacher_question IS NULL THEN
      RAISE EXCEPTION 'No study quiz chapter questions are available.';
    END IF;
    IF jsonb_typeof(v_teacher_question) <> 'object'
       OR COALESCE(char_length(trim(v_teacher_question->>'q')), 0) = 0
       OR jsonb_typeof(v_teacher_question->'choices') <> 'array'
       OR jsonb_array_length(v_teacher_question->'choices') < 2
       OR NOT (v_teacher_question ? 'answer')
       OR (v_teacher_question->>'answer') !~ '^[0-9]+$' THEN
      RAISE EXCEPTION 'Selected study quiz chapter question is invalid.';
    END IF;
    v_prompt := trim(v_teacher_question->>'q');
    v_source_options := v_teacher_question->'choices';
    v_correct_index := (v_teacher_question->>'answer')::integer;
    IF v_correct_index < 0 OR v_correct_index >= jsonb_array_length(v_source_options) THEN
      RAISE EXCEPTION 'Selected study quiz chapter answer index is invalid.';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_source_options) AS choice(item)
      WHERE jsonb_typeof(choice.item) <> 'string'
         OR char_length(trim(choice.item #>> '{}')) = 0
    ) THEN
      RAISE EXCEPTION 'Selected study quiz chapter options are invalid.';
    END IF;
    v_source_question_ref := (v_teacher_ordinal - 1)::text;
    v_source_revision := md5(v_teacher_questions::text);
    v_question_source_kind := 'teacher_test';

  ELSIF v_source_kind = 'student_notes' THEN
    v_note_concepts := v_source_context->'concepts';
    IF jsonb_typeof(v_note_concepts) <> 'array'
       OR jsonb_array_length(v_note_concepts) < 4 THEN
      RAISE EXCEPTION 'These notes need at least four concepts or examples with explanations to make a Quiz Rush run.';
    END IF;
    v_subject := COALESCE(NULLIF(trim(v_source_context->>'subject_name'), ''), 'STUDY NOTES');

    SELECT c.item, c.ord
    INTO v_note_question, v_note_ordinal
    FROM jsonb_array_elements(v_note_concepts) WITH ORDINALITY AS c(item, ord)
    WHERE COALESCE(char_length(trim(c.item->>'concept')), 0) > 0
      AND COALESCE(char_length(trim(c.item->>'explanation')), 0) > 0
      AND NOT EXISTS (
        SELECT 1
        FROM public.study_quiz_attempt_questions aq
        WHERE aq.attempt_id = _attempt_id
            AND aq.source_kind = 'builtin'
          AND aq.source_question_ref = (c.ord - 1)::text
      )
    ORDER BY random()
    LIMIT 1;

    IF v_note_question IS NULL THEN
      SELECT c.item, c.ord
      INTO v_note_question, v_note_ordinal
      FROM jsonb_array_elements(v_note_concepts) WITH ORDINALITY AS c(item, ord)
      WHERE COALESCE(char_length(trim(c.item->>'concept')), 0) > 0
        AND COALESCE(char_length(trim(c.item->>'explanation')), 0) > 0
      ORDER BY random()
      LIMIT 1;
    END IF;
    IF v_note_question IS NULL THEN
      RAISE EXCEPTION 'These notes do not contain usable concepts or examples with explanations for Quiz Rush.';
    END IF;

    v_prompt := 'Which explanation best matches "' || trim(v_note_question->>'concept') || '"?';
    v_source_question_ref := (v_note_ordinal - 1)::text;
    v_source_revision := md5(v_note_concepts::text);
    v_question_source_kind := 'builtin';

    WITH selected_options AS (
      SELECT trim(c.item->>'explanation') AS option_text, true AS is_correct
      FROM jsonb_array_elements(v_note_concepts) WITH ORDINALITY AS c(item, ord)
      WHERE c.ord = v_note_ordinal
      UNION ALL
      (
        SELECT trim(c.item->>'explanation') AS option_text, false AS is_correct
        FROM jsonb_array_elements(v_note_concepts) WITH ORDINALITY AS c(item, ord)
        WHERE c.ord <> v_note_ordinal
          AND COALESCE(char_length(trim(c.item->>'concept')), 0) > 0
          AND COALESCE(char_length(trim(c.item->>'explanation')), 0) > 0
        ORDER BY random()
        LIMIT 3
      )
    ),
    shuffled_options AS (
      SELECT option_text, is_correct, row_number() OVER (ORDER BY random()) AS option_order
      FROM selected_options
    )
    SELECT jsonb_agg(option_text ORDER BY option_order),
           (max(option_order) FILTER (WHERE is_correct))::integer - 1
    INTO v_source_options, v_correct_index
    FROM shuffled_options;

    IF jsonb_typeof(v_source_options) <> 'array'
       OR jsonb_array_length(v_source_options) <> 4
       OR v_correct_index IS NULL THEN
      RAISE EXCEPTION 'These notes need four distinct explained concepts or examples to make Quiz Rush questions.';
    END IF;

  ELSIF v_source_kind = 'builtin' THEN
    SELECT b.id, b.revision, b.subject, b.prompt, b.options, b.correct_option_index
    INTO v_builtin_id, v_builtin_revision, v_subject, v_prompt, v_source_options, v_correct_index
    FROM public.study_quiz_builtin_questions b
    WHERE b.is_active = true
      AND NOT EXISTS (
        SELECT 1
        FROM public.study_quiz_attempt_questions aq
        WHERE aq.attempt_id = _attempt_id
          AND aq.source_kind = 'builtin'
          AND aq.source_question_ref = b.id
      )
    ORDER BY random()
    LIMIT 1;

    IF v_builtin_id IS NULL THEN
      SELECT b.id, b.revision, b.subject, b.prompt, b.options, b.correct_option_index
      INTO v_builtin_id, v_builtin_revision, v_subject, v_prompt, v_source_options, v_correct_index
      FROM public.study_quiz_builtin_questions b
      WHERE b.is_active = true
      ORDER BY random()
      LIMIT 1;
    END IF;
    IF v_builtin_id IS NULL THEN
      RAISE EXCEPTION 'No active study quiz questions are available.';
    END IF;
    IF jsonb_typeof(v_source_options) <> 'array'
       OR jsonb_array_length(v_source_options) < 2 THEN
      RAISE EXCEPTION 'Selected study quiz question has invalid options.';
    END IF;
    IF v_correct_index < 0 OR v_correct_index >= jsonb_array_length(v_source_options) THEN
      RAISE EXCEPTION 'Selected study quiz question has an invalid answer index.';
    END IF;
    v_source_question_ref := v_builtin_id;
    v_source_revision := v_builtin_revision::text;
    v_source_test_id := NULL;
    v_question_source_kind := 'builtin';
  ELSE
    RAISE EXCEPTION 'Unsupported study quiz question source.';
  END IF;

  FOR v_option_text IN
    SELECT value FROM jsonb_array_elements_text(v_source_options)
  LOOP
    v_option_id := gen_random_uuid()::text;
    v_snapshot_options := v_snapshot_options ||
      jsonb_build_array(jsonb_build_object('id', v_option_id, 'text', v_option_text));
    IF v_index = v_correct_index THEN
      v_correct_option_id := v_option_id;
    END IF;
    v_index := v_index + 1;
  END LOOP;
  IF v_correct_option_id IS NULL THEN
    RAISE EXCEPTION 'Could not determine the correct option.';
  END IF;

  v_deadline_at := v_issued_at + interval '10 seconds';
  -- Keep the question-row kind within the existing builtin/teacher_test set.
  INSERT INTO public.study_quiz_attempt_questions (
    attempt_id, sequence, source_kind, source_test_id, source_question_ref,
    source_revision, subject, prompt, options, correct_option_id, issued_at, deadline_at
  )
  VALUES (
    _attempt_id, _sequence, v_question_source_kind, v_source_test_id, v_source_question_ref,
    v_source_revision, v_subject, v_prompt, v_snapshot_options,
    v_correct_option_id, v_issued_at, v_deadline_at
  )
  RETURNING id INTO v_question_id;

  RETURN v_question_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.start_study_quiz_attempt(_class_subject_id uuid)
RETURNS TABLE(
  attempt_id uuid,
  question_id uuid,
  subject text,
  prompt text,
  options jsonb,
  deadline_at timestamptz,
  lives_remaining integer,
  correct_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_subject_name text;
  v_concepts jsonb;
  v_attempt_id uuid;
  v_question_id uuid;
  v_subject text;
  v_prompt text;
  v_options jsonb;
  v_deadline_at timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to start a study quiz.';
  END IF;
  IF _class_subject_id IS NULL THEN
    RAISE EXCEPTION 'Subject assignment is required.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.student_subjects ss
    WHERE ss.student_id = v_user_id
      AND ss.class_subject_id = _class_subject_id
  ) THEN
    RAISE EXCEPTION 'You are not enrolled in this subject.';
  END IF;

  SELECT cs.subject_name
  INTO v_subject_name
  FROM public.class_subjects cs
  WHERE cs.id = _class_subject_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selected subject is unavailable.';
  END IF;

  WITH extracted_topics AS (
    SELECT
      trim(k.item->>'concept') AS concept,
      trim(k.item->>'explanation') AS explanation,
      sn.id AS note_id,
      sn.created_at AS note_created_at,
      k.ord AS concept_order
    FROM public.study_notes sn
    JOIN public.student_uploads su
      ON su.id = sn.upload_id
     AND su.student_id = v_user_id
     AND su.class_subject_id = _class_subject_id
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(sn.key_concepts) = 'array'
        THEN sn.key_concepts ELSE '[]'::jsonb END
    ) WITH ORDINALITY AS k(item, ord)
    WHERE sn.student_id = v_user_id
      AND COALESCE(char_length(trim(k.item->>'concept')), 0) > 0
      AND COALESCE(char_length(trim(k.item->>'explanation')), 0) > 0
    UNION ALL
    SELECT
      'Example: ' || trim(e.item->>'title') AS concept,
      trim(e.item->>'explanation') AS explanation,
      sn.id AS note_id,
      sn.created_at AS note_created_at,
      1000000 + e.ord AS concept_order
    FROM public.study_notes sn
    JOIN public.student_uploads su
      ON su.id = sn.upload_id
     AND su.student_id = v_user_id
     AND su.class_subject_id = _class_subject_id
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(sn.examples) = 'array'
        THEN sn.examples ELSE '[]'::jsonb END
    ) WITH ORDINALITY AS e(item, ord)
    WHERE sn.student_id = v_user_id
      AND COALESCE(char_length(trim(e.item->>'title')), 0) > 0
      AND COALESCE(char_length(trim(e.item->>'explanation')), 0) > 0
  ),
  unique_concepts AS (
    SELECT DISTINCT ON (lower(concept)) concept, explanation, note_id, note_created_at, concept_order
    FROM extracted_topics
    ORDER BY lower(concept), note_created_at DESC, note_id, concept_order
  ),
  unique_explanations AS (
    SELECT DISTINCT ON (lower(explanation)) concept, explanation, note_id, note_created_at, concept_order
    FROM unique_concepts
    ORDER BY lower(explanation), note_created_at DESC, note_id, concept_order
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'concept', concept,
      'explanation', explanation,
      'note_id', note_id
    )
    ORDER BY note_created_at, note_id, concept_order
  )
  INTO v_concepts
  FROM unique_explanations;

  IF COALESCE(jsonb_array_length(v_concepts), 0) < 4 THEN
    RAISE EXCEPTION 'Upload notes with at least four explained key concepts or examples for this subject before starting Quiz Rush.';
  END IF;

  INSERT INTO public.game_attempts (
    user_id, game, status, rules_version, correct_count, lives_remaining,
    xp_awarded, source_context
  )
  VALUES (
    v_user_id, 'study_quiz', 'in_progress', 1, 0, 3, 0,
    jsonb_build_object(
      'source_kind', 'student_notes',
      'class_subject_id', _class_subject_id,
      'subject_name', v_subject_name,
      'concepts', v_concepts
    )
  )
  RETURNING id INTO v_attempt_id;

  v_question_id := public.issue_study_quiz_question(v_attempt_id, 1);
  SELECT q.subject, q.prompt, q.options, q.deadline_at
  INTO v_subject, v_prompt, v_options, v_deadline_at
  FROM public.study_quiz_attempt_questions q
  WHERE q.id = v_question_id
    AND q.attempt_id = v_attempt_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Could not create the first study quiz question.';
  END IF;

  RETURN QUERY SELECT v_attempt_id, v_question_id, v_subject, v_prompt,
                      v_options, v_deadline_at, 3, 0;
END;
$function$;

CREATE OR REPLACE FUNCTION public.start_memory_match_attempt(_class_subject_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_subject_name text;
  v_pairs jsonb;
  v_attempt_id uuid;
  v_started_at timestamptz;
  v_deadline_at timestamptz;
  v_board jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF _class_subject_id IS NULL THEN
    RAISE EXCEPTION 'Subject assignment is required';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.student_subjects ss
    WHERE ss.student_id = v_user_id
      AND ss.class_subject_id = _class_subject_id
  ) THEN
    RAISE EXCEPTION 'You are not enrolled in this subject.';
  END IF;

  SELECT cs.subject_name
  INTO v_subject_name
  FROM public.class_subjects cs
  WHERE cs.id = _class_subject_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selected subject is unavailable.';
  END IF;

  WITH note_labels AS (
    SELECT
      trim(k.item->>'concept') AS label,
      left(trim(k.item->>'explanation'), 64) AS paired_value
    FROM public.study_notes sn
    JOIN public.student_uploads su
      ON su.id = sn.upload_id
     AND su.student_id = v_user_id
     AND su.class_subject_id = _class_subject_id
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(sn.key_concepts) = 'array'
        THEN sn.key_concepts ELSE '[]'::jsonb END
    ) AS k(item)
    WHERE sn.student_id = v_user_id
      AND COALESCE(char_length(trim(k.item->>'concept')), 0) > 0
      AND COALESCE(char_length(trim(k.item->>'explanation')), 0) > 0
    UNION ALL
    SELECT
      trim(e.item->>'title') AS label,
      left(trim(e.item->>'explanation'), 64) AS paired_value
    FROM public.study_notes sn
    JOIN public.student_uploads su
      ON su.id = sn.upload_id
     AND su.student_id = v_user_id
     AND su.class_subject_id = _class_subject_id
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(sn.examples) = 'array'
        THEN sn.examples ELSE '[]'::jsonb END
    ) AS e(item)
    WHERE sn.student_id = v_user_id
      AND COALESCE(char_length(trim(e.item->>'title')), 0) > 0
      AND COALESCE(char_length(trim(e.item->>'explanation')), 0) > 0
  ),
  unique_labels AS (
    SELECT DISTINCT ON (lower(label)) label, paired_value
    FROM note_labels
    WHERE COALESCE(char_length(label), 0) > 0
      AND COALESCE(char_length(paired_value), 0) > 0
    ORDER BY lower(label), label, paired_value
  ),
  chosen_labels AS (
    SELECT label, paired_value,
           row_number() OVER (ORDER BY random()) AS pair_number
    FROM unique_labels
    ORDER BY random()
    LIMIT 8
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'pair_key', 'pair_' || pair_number,
      'face_value', label,
      'paired_value', paired_value
    )
    ORDER BY pair_number
  )
  INTO v_pairs
  FROM chosen_labels;

  IF COALESCE(jsonb_array_length(v_pairs), 0) < 8 THEN
    RAISE EXCEPTION 'These notes need at least eight different concepts or example titles with explanations for Memory Flip.';
  END IF;

  v_started_at := clock_timestamp();
  v_deadline_at := v_started_at + interval '60 seconds';

  INSERT INTO public.game_attempts (
    user_id, game, status, rules_version, xp_awarded, started_at, source_context
  )
  VALUES (
    v_user_id, 'memory_match', 'in_progress', 1, 0, v_started_at,
    jsonb_build_object(
      'source_kind', 'student_notes',
      'class_subject_id', _class_subject_id
    )
  )
  RETURNING id INTO v_attempt_id;

  INSERT INTO public.memory_match_attempts (
    attempt_id, matched_pairs, moves, first_selected_card_id, deadline_at, state_version
  )
  VALUES (v_attempt_id, 0, 0, NULL, v_deadline_at, 1);

  WITH pair_definitions AS (
    SELECT
      p.item->>'pair_key' AS pair_key,
      p.item->>'face_value' AS face_value,
      p.item->>'paired_value' AS paired_value
    FROM jsonb_array_elements(v_pairs) AS p(item)
  ),
  duplicated_cards AS (
    SELECT pair_key, face_value
    FROM pair_definitions
    UNION ALL
    SELECT pair_key, paired_value AS face_value
    FROM pair_definitions
  ),
  shuffled_cards AS (
    SELECT pair_key, face_value,
           row_number() OVER (ORDER BY random()) - 1 AS position
    FROM duplicated_cards
  )
  INSERT INTO public.memory_match_cards (
    attempt_id, position, pair_key, face_value, matched
  )
  SELECT v_attempt_id, position::integer, pair_key, face_value, false
  FROM shuffled_cards;

  SELECT jsonb_agg(
    jsonb_build_object(
      'card_id', c.id,
      'position', c.position,
      'matched', false,
      'face_up', false
    )
    ORDER BY c.position
  )
  INTO v_board
  FROM public.memory_match_cards c
  WHERE c.attempt_id = v_attempt_id;

  RETURN jsonb_build_object(
    'attempt_id', v_attempt_id,
    'status', 'in_progress',
    'rules_version', 1,
    'started_at', v_started_at,
    'deadline_at', v_deadline_at,
    'matched_pairs', 0,
    'moves', 0,
    'xp_awarded', 0,
    'state_version', 1,
    'cards', COALESCE(v_board, '[]'::jsonb)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.start_study_quiz_attempt(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_study_quiz_attempt(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.start_memory_match_attempt(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_memory_match_attempt(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
