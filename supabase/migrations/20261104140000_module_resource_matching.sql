ALTER TABLE public.student_uploads
  ADD COLUMN IF NOT EXISTS module_name text;

ALTER TABLE public.study_materials
  ADD COLUMN IF NOT EXISTS module_name text;

ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS module_name text;

CREATE INDEX IF NOT EXISTS student_uploads_subject_module_idx
  ON public.student_uploads (class_subject_id, lower(trim(module_name)))
  WHERE module_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS study_materials_subject_module_idx
  ON public.study_materials (class_subject_id, lower(trim(module_name)))
  WHERE module_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS tests_subject_module_idx
  ON public.tests (class_subject_id, lower(trim(module_name)))
  WHERE module_name IS NOT NULL;

CREATE OR REPLACE FUNCTION public.student_register_subject_upload(
  _class_subject_id uuid,
  _title text,
  _file_name text,
  _storage_path text,
  _file_size bigint,
  _module_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_upload_id uuid;
  v_module_name text := trim(COALESCE(_module_name, ''));
BEGIN
  IF char_length(v_module_name) = 0 OR char_length(v_module_name) > 100 THEN
    RAISE EXCEPTION 'Enter a module name up to 100 characters.';
  END IF;

  v_upload_id := public.student_register_subject_upload(
    _class_subject_id,
    _title,
    _file_name,
    _storage_path,
    _file_size
  );

  UPDATE public.student_uploads
  SET module_name = v_module_name
  WHERE id = v_upload_id
    AND student_id = auth.uid()
    AND class_subject_id = _class_subject_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Could not link this upload to its module.';
  END IF;

  RETURN v_upload_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.teacher_publish_study_material(
  _class_subject_id uuid,
  _title text,
  _grade text,
  _content text,
  _module_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_material_id uuid;
  v_module_name text := trim(COALESCE(_module_name, ''));
BEGIN
  IF char_length(v_module_name) = 0 OR char_length(v_module_name) > 100 THEN
    RAISE EXCEPTION 'Enter a module name up to 100 characters.';
  END IF;

  v_material_id := public.teacher_publish_study_material(
    _class_subject_id,
    _title,
    _grade,
    _content
  );

  UPDATE public.study_materials
  SET module_name = v_module_name
  WHERE id = v_material_id
    AND teacher_id = auth.uid()
    AND class_subject_id = _class_subject_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Could not link this teacher note to its module.';
  END IF;

  RETURN v_material_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.teacher_publish_quiz_bank(
  _class_subject_id uuid,
  _chapter_title text,
  _questions jsonb,
  _module_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_test_id uuid;
  v_module_name text := trim(COALESCE(_module_name, ''));
BEGIN
  IF char_length(v_module_name) = 0 OR char_length(v_module_name) > 100 THEN
    RAISE EXCEPTION 'Enter a module name up to 100 characters.';
  END IF;

  v_test_id := public.teacher_publish_quiz_bank(
    _class_subject_id,
    _chapter_title,
    _questions
  );

  UPDATE public.tests
  SET module_name = v_module_name
  WHERE id = v_test_id
    AND teacher_id = auth.uid()
    AND class_subject_id = _class_subject_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Could not link this quiz to its module.';
  END IF;

  RETURN v_test_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.student_list_subject_modules(_class_subject_id uuid)
RETURNS TABLE(module_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_student_id uuid := auth.uid();
BEGIN
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in.';
  END IF;
  IF _class_subject_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.student_subjects ss
    WHERE ss.student_id = v_student_id
      AND ss.class_subject_id = _class_subject_id
  ) THEN
    RAISE EXCEPTION 'You are not enrolled in this subject.';
  END IF;

  RETURN QUERY
  SELECT min(trim(su.module_name))
  FROM public.student_uploads su
  WHERE su.student_id = v_student_id
    AND su.class_subject_id = _class_subject_id
    AND NULLIF(trim(su.module_name), '') IS NOT NULL
  GROUP BY lower(trim(su.module_name))
  ORDER BY lower(min(trim(su.module_name)));
END;
$function$;

CREATE OR REPLACE FUNCTION public.student_list_subject_module_materials(
  _class_subject_id uuid,
  _module_name text
)
RETURNS TABLE(
  material_id uuid,
  title text,
  subject text,
  grade text,
  content text,
  teacher_id uuid,
  teacher_name text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_student_id uuid := auth.uid();
  v_module_name text := lower(trim(COALESCE(_module_name, '')));
BEGIN
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in.';
  END IF;
  IF _class_subject_id IS NULL OR char_length(v_module_name) = 0 THEN
    RAISE EXCEPTION 'Subject and module are required.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.student_subjects ss
    WHERE ss.student_id = v_student_id
      AND ss.class_subject_id = _class_subject_id
  ) THEN
    RAISE EXCEPTION 'You are not enrolled in this subject.';
  END IF;

  RETURN QUERY
  SELECT
    sm.id,
    sm.title,
    cs.subject_name,
    sm.grade,
    sm.content,
    sm.teacher_id,
    COALESCE(NULLIF(trim(p.display_name), ''), 'Teacher'),
    sm.created_at
  FROM public.study_materials sm
  JOIN public.class_subjects cs
    ON cs.id = sm.class_subject_id
   AND cs.teacher_id = sm.teacher_id
  LEFT JOIN public.profiles p
    ON p.id = sm.teacher_id
  WHERE sm.class_subject_id = _class_subject_id
    AND lower(trim(sm.module_name)) = v_module_name
  ORDER BY sm.created_at DESC, sm.id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.student_list_subject_module_chapters(
  _class_subject_id uuid,
  _module_name text
)
RETURNS TABLE(
  test_id uuid,
  chapter_title text,
  subject_name text,
  teacher_id uuid,
  teacher_name text,
  question_count integer,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_student_id uuid := auth.uid();
  v_module_name text := lower(trim(COALESCE(_module_name, '')));
BEGIN
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in.';
  END IF;
  IF _class_subject_id IS NULL OR char_length(v_module_name) = 0 THEN
    RAISE EXCEPTION 'Subject and module are required.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.student_subjects ss
    WHERE ss.student_id = v_student_id
      AND ss.class_subject_id = _class_subject_id
  ) THEN
    RAISE EXCEPTION 'You are not enrolled in this subject.';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.title,
    cs.subject_name,
    t.teacher_id,
    COALESCE(NULLIF(trim(p.display_name), ''), 'Teacher'),
    jsonb_array_length(t.questions)::integer,
    t.created_at
  FROM public.tests t
  JOIN public.class_subjects cs
    ON cs.id = t.class_subject_id
   AND cs.teacher_id = t.teacher_id
  LEFT JOIN public.profiles p
    ON p.id = t.teacher_id
  WHERE t.class_subject_id = _class_subject_id
    AND lower(trim(t.module_name)) = v_module_name
    AND jsonb_typeof(t.questions) = 'array'
    AND jsonb_array_length(t.questions) > 0
  ORDER BY t.created_at DESC, t.id;
END;
$function$;

REVOKE ALL ON FUNCTION public.student_register_subject_upload(uuid, text, text, text, bigint, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.teacher_publish_study_material(uuid, text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.teacher_publish_quiz_bank(uuid, text, jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.student_list_subject_modules(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.student_list_subject_module_materials(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.student_list_subject_module_chapters(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.student_register_subject_upload(uuid, text, text, text, bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_publish_study_material(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_publish_quiz_bank(uuid, text, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_list_subject_modules(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_list_subject_module_materials(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_list_subject_module_chapters(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
