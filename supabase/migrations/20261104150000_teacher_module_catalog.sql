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
  WITH teacher_modules AS (
    SELECT sm.module_name
    FROM public.study_materials sm
    JOIN public.class_subjects cs
      ON cs.id = sm.class_subject_id
     AND cs.teacher_id = sm.teacher_id
    WHERE sm.class_subject_id = _class_subject_id
      AND NULLIF(trim(sm.module_name), '') IS NOT NULL

    UNION

    SELECT t.module_name
    FROM public.tests t
    JOIN public.class_subjects cs
      ON cs.id = t.class_subject_id
     AND cs.teacher_id = t.teacher_id
    WHERE t.class_subject_id = _class_subject_id
      AND NULLIF(trim(t.module_name), '') IS NOT NULL
      AND jsonb_array_length(
        CASE
          WHEN jsonb_typeof(t.questions) = 'array' THEN t.questions
          ELSE '[]'::jsonb
        END
      ) > 0
  )
  SELECT min(trim(tm.module_name))::text
  FROM teacher_modules tm
  GROUP BY lower(trim(tm.module_name))
  ORDER BY lower(min(trim(tm.module_name)));
END;
$function$;

REVOKE ALL ON FUNCTION public.student_list_subject_modules(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.student_list_subject_modules(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
