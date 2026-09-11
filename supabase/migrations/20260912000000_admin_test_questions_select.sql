-- ====================================================================
-- FIX: allow admins to READ test_questions (question links on /admin/tests)
-- Date: 2026-09-11
-- Why: test_questions has admin INSERT/DELETE policies and a student
--   SELECT policy, but NO admin SELECT policy. Result: on /admin/tests,
--   editing a test shows zero linked questions even though links save
--   correctly. One-line, additive, idempotent. A superset of this policy
--   also ships in 20260910000000_rls_lockdown_exam_answers.sql — applying
--   that migration instead covers this fix too.
-- Apply: Supabase Dashboard → SQL Editor → paste → Run.
-- Verify (as logged-in admin): SELECT count(*) FROM test_questions;
--   expect row count, not a policy error.
-- ====================================================================

DROP POLICY IF EXISTS "Admins can view all test_questions" ON public.test_questions;
CREATE POLICY "Admins can view all test_questions"
  ON public.test_questions
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
