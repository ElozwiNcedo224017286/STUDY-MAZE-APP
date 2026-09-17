-- =====================================================================
-- Study Maze — Supabase schema (reference, idempotent)
--
-- These tables ALREADY EXIST in the connected project. This file documents
-- the schema the app is wired against (auth.users + profiles + user_roles,
-- append-only game_scores, teacher tests/attempts, avatars storage).
--
-- It is safe to re-run: it uses IF NOT EXISTS / DROP ... IF EXISTS / CREATE OR
-- REPLACE throughout, so running it against the existing project is a no-op.
-- =====================================================================

-- Roles enum (CREATE TYPE has no IF NOT EXISTS, so guard it)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('student', 'teacher', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  grade TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grade TEXT;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own profile read"   ON public.profiles;
DROP POLICY IF EXISTS "own profile write"  ON public.profiles;
DROP POLICY IF EXISTS "own profile update" ON public.profiles;
CREATE POLICY "own profile read"   ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile write"  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ---------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read own roles" ON public.user_roles;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile + default student role on signup. Reads display_name/role
-- from the metadata the app passes to supabase.auth.signUp({ options: { data } }).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'student'));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------
-- Study materials uploaded by teachers
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT,
  grade TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.study_materials ADD COLUMN IF NOT EXISTS grade TEXT;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_materials TO authenticated;
GRANT ALL ON public.study_materials TO service_role;
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "all authenticated can read materials" ON public.study_materials;
DROP POLICY IF EXISTS "teachers can insert own materials"    ON public.study_materials;
DROP POLICY IF EXISTS "teachers can update own materials"    ON public.study_materials;
DROP POLICY IF EXISTS "teachers can delete own materials"    ON public.study_materials;
CREATE POLICY "all authenticated can read materials" ON public.study_materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "teachers can insert own materials" ON public.study_materials FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = teacher_id AND public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "teachers can update own materials" ON public.study_materials FOR UPDATE TO authenticated
  USING (auth.uid() = teacher_id AND public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "teachers can delete own materials" ON public.study_materials FOR DELETE TO authenticated
  USING (auth.uid() = teacher_id AND public.has_role(auth.uid(), 'teacher'));

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;

-- ---------------------------------------------------------------------
-- Scores / leaderboard  (single source of truth for coins & scores)
-- App maps: quiz_maze = Maze Runner, memory_match = Memory Flip, study_quiz = Quiz Rush
-- detail example: { "level": 2 }
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.game_scores (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game       TEXT NOT NULL CHECK (game IN ('quiz_maze', 'memory_match', 'study_quiz')),
  coins      INTEGER NOT NULL DEFAULT 0 CHECK (coins >= 0),
  score      INTEGER NOT NULL DEFAULT 0,
  detail     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS game_scores_user_idx    ON public.game_scores (user_id);
CREATE INDEX IF NOT EXISTS game_scores_created_idx ON public.game_scores (created_at DESC);
GRANT SELECT, INSERT ON public.game_scores TO authenticated;
GRANT ALL ON public.game_scores TO service_role;
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read own scores"   ON public.game_scores;
DROP POLICY IF EXISTS "insert own scores" ON public.game_scores;
CREATE POLICY "read own scores"   ON public.game_scores FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own scores" ON public.game_scores FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Leaderboard + per-user stats (SECURITY DEFINER: aggregates cross-user data safely)
DROP FUNCTION IF EXISTS public.get_leaderboard(INTEGER);
CREATE OR REPLACE FUNCTION public.get_leaderboard(_limit INTEGER DEFAULT 50)
RETURNS TABLE (user_id UUID, display_name TEXT, avatar_url TEXT, total_coins BIGINT, games_played BIGINT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT gs.user_id, COALESCE(p.display_name, 'Player'), p.avatar_url,
         SUM(gs.coins)::BIGINT, COUNT(*)::BIGINT
  FROM public.game_scores gs
  LEFT JOIN public.profiles p ON p.id = gs.user_id
  GROUP BY gs.user_id, p.display_name, p.avatar_url
  ORDER BY SUM(gs.coins) DESC
  LIMIT GREATEST(COALESCE(_limit, 50), 1);
$$;
CREATE OR REPLACE FUNCTION public.get_my_stats()
RETURNS TABLE (total_coins BIGINT, games_played BIGINT, best_maze_level INTEGER)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(coins), 0)::BIGINT, COUNT(*)::BIGINT,
         COALESCE(MAX((detail->>'level')::INT), 0)
  FROM public.game_scores WHERE user_id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_stats() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard(INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_stats() FROM anon;

-- ---------------------------------------------------------------------
-- Avatars storage bucket (files stored at <user_id>/<filename>)
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
DROP POLICY IF EXISTS "avatars insert own"  ON storage.objects;
DROP POLICY IF EXISTS "avatars update own"  ON storage.objects;
DROP POLICY IF EXISTS "avatars delete own"  ON storage.objects;
CREATE POLICY "avatars public read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars insert own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars update own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- Profile images (the file bytes live in the avatars bucket)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_images (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  image_url TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profile_images TO authenticated;
GRANT ALL ON public.profile_images TO service_role;
ALTER TABLE public.profile_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own profile image read" ON public.profile_images;
DROP POLICY IF EXISTS "own profile image insert" ON public.profile_images;
DROP POLICY IF EXISTS "own profile image update" ON public.profile_images;
CREATE POLICY "own profile image read" ON public.profile_images FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own profile image insert" ON public.profile_images FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own profile image update" ON public.profile_images FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Notifications (recipient-specific or broadcast to all authenticated users)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'system',
    'announcement',
    'earnings',
    'document_verification',
    'admin_message'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_recipient_idx ON public.notifications (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_category_idx ON public.notifications (category, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "users mark own notifications read" ON public.notifications;
DROP POLICY IF EXISTS "admins create notifications" ON public.notifications;
CREATE POLICY "users read own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (recipient_id IS NULL OR auth.uid() = recipient_id);
CREATE POLICY "users mark own notifications read" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);
CREATE POLICY "admins create notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

-- ---------------------------------------------------------------------
-- Teacher tests + student attempts
-- The app's "publish quiz to students" writes a tests row; the games read the
-- latest one. questions shape: [{ "q": "...", "choices": [...], "answer": 0, "subject": "MATH" }]
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  subject    TEXT,
  grade      TEXT,
  questions  JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tests_teacher_idx ON public.tests (teacher_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tests TO authenticated;
GRANT ALL ON public.tests TO service_role;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone can read tests"     ON public.tests;
DROP POLICY IF EXISTS "teachers insert own tests" ON public.tests;
DROP POLICY IF EXISTS "teachers update own tests" ON public.tests;
DROP POLICY IF EXISTS "teachers delete own tests" ON public.tests;
CREATE POLICY "anyone can read tests" ON public.tests FOR SELECT TO authenticated USING (true);
CREATE POLICY "teachers insert own tests" ON public.tests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = teacher_id AND public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "teachers update own tests" ON public.tests FOR UPDATE TO authenticated
  USING (auth.uid() = teacher_id AND public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "teachers delete own tests" ON public.tests FOR DELETE TO authenticated
  USING (auth.uid() = teacher_id AND public.has_role(auth.uid(), 'teacher'));

CREATE TABLE IF NOT EXISTS public.test_attempts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id    UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score      INTEGER NOT NULL DEFAULT 0,
  total      INTEGER NOT NULL DEFAULT 0,
  answers    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS test_attempts_test_idx    ON public.test_attempts (test_id);
CREATE INDEX IF NOT EXISTS test_attempts_student_idx ON public.test_attempts (student_id);
GRANT SELECT, INSERT ON public.test_attempts TO authenticated;
GRANT ALL ON public.test_attempts TO service_role;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "students read own attempts"           ON public.test_attempts;
DROP POLICY IF EXISTS "students insert own attempts"         ON public.test_attempts;
DROP POLICY IF EXISTS "teachers read attempts on their tests" ON public.test_attempts;
CREATE POLICY "students read own attempts" ON public.test_attempts FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "students insert own attempts" ON public.test_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
CREATE POLICY "teachers read attempts on their tests" ON public.test_attempts FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_attempts.test_id AND t.teacher_id = auth.uid())
);

DROP FUNCTION IF EXISTS public.get_test_results(UUID);
CREATE OR REPLACE FUNCTION public.get_test_results(_test_id UUID)
RETURNS TABLE (attempt_id UUID, student_id UUID, display_name TEXT, avatar_url TEXT, score INTEGER, total INTEGER, created_at TIMESTAMPTZ)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.student_id, COALESCE(p.display_name, 'Student'), p.avatar_url, a.score, a.total, a.created_at
  FROM public.test_attempts a
  LEFT JOIN public.profiles p ON p.id = a.student_id
  WHERE a.test_id = _test_id
    AND EXISTS (SELECT 1 FROM public.tests t WHERE t.id = _test_id AND t.teacher_id = auth.uid())
  ORDER BY a.created_at DESC;
$$;

DROP FUNCTION IF EXISTS public.get_teacher_marks();
CREATE OR REPLACE FUNCTION public.get_teacher_marks()
RETURNS TABLE (student_id UUID, display_name TEXT, avatar_url TEXT, test_id UUID, test_title TEXT, score INTEGER, total INTEGER, created_at TIMESTAMPTZ)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.student_id, COALESCE(p.display_name, 'Student'), p.avatar_url, a.test_id, t.title, a.score, a.total, a.created_at
  FROM public.test_attempts a
  JOIN public.tests t ON t.id = a.test_id AND t.teacher_id = auth.uid()
  LEFT JOIN public.profiles p ON p.id = a.student_id
  ORDER BY COALESCE(p.display_name, 'Student'), a.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_test_results(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_marks() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_test_results(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_teacher_marks() FROM anon;
