-- ====================================================================
-- PRACTICEKORO RLS LOCKDOWN: RPC-only exam answer access
-- Date: 2026-09-10
-- Goal: prevent answer-key harvesting via direct SELECT on
--   public.questions (correct_answer, explanation) and
--   public.test_questions (test -> question_id mapping).
--
-- Design:
--   * Exams (high stakes): sanitized access ONLY via SECURITY DEFINER
--     RPCs start_exam_attempt / get_student_exam_questions, grading ONLY
--     via submit_exam_attempt, solutions ONLY via get_attempt_results
--     (post-completion). No direct student SELECT on questions or
--     test_questions.
--   * Practice/drills (learning, instant feedback by design): answers via
--     get_practice_questions RPC (capped, published-only).
--   * Review of OWN data still works via direct join: students may SELECT
--     questions they have attempted (student_mistakes / mistakes_notebook)
--     or bookmarked (student_bookmarks). This keeps Mistakes Notebook,
--     Bookmarks and Review pages working without leaking the bank.
--   * Admins unaffected (full SELECT via has_role).
-- Idempotent: safe to re-run (DROP IF EXISTS / CREATE OR REPLACE).
-- Frontend must use RPC-first paths (drillService, attemptEngineService).
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. Revoke broad student harvesting policies
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Approved students can view questions in published tests"
  ON public.questions;

DROP POLICY IF EXISTS "Approved students can view test questions for published tests"
  ON public.test_questions;

-- --------------------------------------------------------------------
-- 2. Admin SELECT on test_questions (was missing: only insert/update/
--    delete existed; admin UI needs SELECT after student policy removal)
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all test_questions" ON public.test_questions;
CREATE POLICY "Admins can view all test_questions"
  ON public.test_questions
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- --------------------------------------------------------------------
-- 3. Narrow student SELECT on questions: own attempted/bookmarked only
--    (keeps Mistakes Notebook / Bookmarks / Review joins working)
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Students can view attempted or bookmarked questions"
  ON public.questions;
CREATE POLICY "Students can view attempted or bookmarked questions"
  ON public.questions
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR (
      public.has_role(auth.uid(), 'student'::public.app_role)
      AND (
        EXISTS (
          SELECT 1 FROM public.student_mistakes sm
          WHERE sm.question_id = questions.id AND sm.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.mistakes_notebook mn
          WHERE mn.question_id = questions.id AND mn.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.student_bookmarks sb
          WHERE sb.question_id = questions.id AND sb.user_id = auth.uid()
        )
      )
    )
  );

-- --------------------------------------------------------------------
-- 4. Harden get_student_exam_questions: was STABLE/SECURITY DEFINER with
--    NO auth, publication or entitlement checks (enumeration risk).
--    Same signature, now fail-closed for unpublished/paid tests.
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_student_exam_questions(p_test_id UUID)
RETURNS TABLE (
    id UUID,
    question_id UUID,
    question_order INTEGER,
    marks NUMERIC,
    question_text TEXT,
    option_a TEXT,
    option_b TEXT,
    option_c TEXT,
    option_d TEXT,
    subject TEXT,
    topic TEXT,
    difficulty TEXT,
    year INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_test RECORD;
    v_is_subscribed BOOLEAN := false;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT * INTO v_test FROM public.mock_tests WHERE id = p_test_id;
    IF v_test.id IS NULL THEN
        RAISE EXCEPTION 'Mock test not found';
    END IF;

    IF NOT COALESCE(v_test.is_published, false) THEN
        IF NOT public.has_role(v_user_id, 'admin'::public.app_role) THEN
            RAISE EXCEPTION 'This test is not published yet';
        END IF;
    END IF;

    IF COALESCE(v_test.is_paid, false) THEN
        IF public.has_role(v_user_id, 'admin'::public.app_role) THEN
            v_is_subscribed := true;
        ELSE
            SELECT EXISTS (
                SELECT 1 FROM public.purchases
                WHERE user_id = v_user_id
                  AND content_type = 'subscription'
                  AND status = 'completed'
                  AND created_at > (now() - INTERVAL '365 days')
            ) INTO v_is_subscribed;
        END IF;
        IF NOT v_is_subscribed THEN
            RAISE EXCEPTION 'Active VIP Subscription required';
        END IF;
    END IF;

    RETURN QUERY
    SELECT
        tq.id,
        tq.question_id,
        tq.question_order,
        tq.marks,
        q.question_text,
        q.option_a,
        q.option_b,
        q.option_c,
        q.option_d,
        q.subject,
        q.topic,
        COALESCE(q.difficulty, 'medium') AS difficulty,
        q.year
    FROM public.test_questions tq
    JOIN public.questions q ON q.id = tq.question_id
    WHERE tq.test_id = p_test_id
    ORDER BY tq.question_order ASC, tq.created_at ASC;
END;
$$;

-- --------------------------------------------------------------------
-- 5. Practice RPC (learning context, instant feedback by design):
--    returns answers but capped, published-only, no unpublished access.
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_practice_questions(
    p_subject TEXT DEFAULT NULL,
    p_topic TEXT DEFAULT NULL,
    p_difficulty TEXT DEFAULT NULL,
    p_year INTEGER DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    question_text TEXT,
    option_a TEXT,
    option_b TEXT,
    option_c TEXT,
    option_d TEXT,
    correct_answer TEXT,
    explanation TEXT,
    subject TEXT,
    topic TEXT,
    difficulty TEXT,
    year INTEGER,
    source TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_cap INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    v_cap := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);

    RETURN QUERY
    SELECT
        q.id,
        q.question_text,
        q.option_a,
        q.option_b,
        q.option_c,
        q.option_d,
        q.correct_answer,
        q.explanation,
        q.subject,
        q.topic,
        COALESCE(q.difficulty, 'medium') AS difficulty,
        q.year,
        q.source
    FROM public.questions q
    WHERE (q.status IS NULL OR q.status = 'published')
      AND (p_subject IS NULL OR p_subject = 'all' OR q.subject = p_subject)
      AND (p_topic IS NULL OR p_topic = 'all' OR p_topic = 'All Topics' OR q.topic = p_topic)
      AND (p_difficulty IS NULL OR p_difficulty = 'all' OR LOWER(COALESCE(q.difficulty, 'medium')) = LOWER(p_difficulty))
      AND (p_year IS NULL OR q.year = p_year)
    ORDER BY q.created_at DESC
    LIMIT v_cap;
END;
$$;

-- --------------------------------------------------------------------
-- 6. Grants: RPCs usable by logged-in clients; base tables stay
--    RLS-guarded (SECURITY DEFINER RPCs bypass RLS by design).
-- --------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_student_exam_questions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_practice_questions(TEXT, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_exam_attempt(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_exam_progress(UUID, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_exam_attempt(UUID, JSONB, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_attempt_results(UUID) TO authenticated;

-- ====================================================================
-- Verification (run after `supabase db push` / migration up):
--   As a student JWT (NOT admin):
--   1. SELECT * FROM questions LIMIT 1                    -> 0 rows
--      (unless question is in own mistakes/bookmarks)
--   2. SELECT * FROM test_questions LIMIT 1               -> 0 rows
--   3. SELECT * FROM get_student_exam_questions('<published_test_uuid>')
--      -> sanitized rows, NO correct_answer/explanation columns
--   4. SELECT * FROM get_practice_questions('all','all','all',NULL,5)
--      -> <=5 rows WITH answers (practice context only)
--   5. Mistakes Notebook page still loads (own-attempt join policy)
--   6. TakeTest -> submit still grades via submit_exam_attempt RPC
-- Rollback: re-create the two dropped "Approved students..." policies
--   from 20251203034002 + remix dump lines 909-913.
-- ====================================================================
