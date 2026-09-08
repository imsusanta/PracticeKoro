-- ====================================================================
-- PRACTICEKORO: SERVER-AUTHORITATIVE ATTEMPT ENGINE & SECURITY UPGRADE
-- Prevents answer key leakage, enforces server deadlines, and performs
-- deterministic transactional grading on the backend.
-- ====================================================================

-- 1. Schema Enhancements on test_attempts
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'test_attempts' AND column_name = 'started_at') THEN
        ALTER TABLE public.test_attempts ADD COLUMN started_at TIMESTAMPTZ NOT NULL DEFAULT now();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'test_attempts' AND column_name = 'expires_at') THEN
        ALTER TABLE public.test_attempts ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'test_attempts' AND column_name = 'submitted_at') THEN
        ALTER TABLE public.test_attempts ADD COLUMN submitted_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'test_attempts' AND column_name = 'status') THEN
        ALTER TABLE public.test_attempts ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'in_progress';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'test_attempts' AND column_name = 'tab_violations') THEN
        ALTER TABLE public.test_attempts ADD COLUMN tab_violations INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'test_attempts' AND column_name = 'fullscreen_violations') THEN
        ALTER TABLE public.test_attempts ADD COLUMN fullscreen_violations INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'test_attempts' AND column_name = 'exam_mode') THEN
        ALTER TABLE public.test_attempts ADD COLUMN exam_mode VARCHAR(20) DEFAULT 'simulation';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_test_attempts_user_status ON public.test_attempts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_test_attempts_test_id ON public.test_attempts(test_id);

-- 2. Schema Enhancements on test_answers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'test_answers' AND column_name = 'is_marked_for_review') THEN
        ALTER TABLE public.test_answers ADD COLUMN is_marked_for_review BOOLEAN DEFAULT false;
    END IF;
END $$;

DO $$
BEGIN
    ALTER TABLE public.test_answers ADD CONSTRAINT test_answers_attempt_question_key UNIQUE (attempt_id, question_id);
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_test_answers_attempt_id ON public.test_answers(attempt_id);

-- 3. RPC: start_exam_attempt (Sanitized, Server-Timed, Zero Answer Leakage)
CREATE OR REPLACE FUNCTION public.start_exam_attempt(
    p_test_id UUID,
    p_mode TEXT DEFAULT 'simulation'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_test RECORD;
    v_attempt RECORD;
    v_attempt_id UUID;
    v_duration_mins INT;
    v_expires_at TIMESTAMPTZ;
    v_questions JSONB;
    v_saved_answers JSONB := '{}'::jsonb;
    v_saved_reviews JSONB := '[]'::jsonb;
    v_is_subscribed BOOLEAN := false;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Validate test existence and publication
    SELECT * INTO v_test FROM public.mock_tests WHERE id = p_test_id;
    IF v_test.id IS NULL THEN
        RAISE EXCEPTION 'Mock test not found';
    END IF;

    IF NOT COALESCE(v_test.is_published, false) THEN
        -- Only admin can preview unpublished tests
        IF NOT public.has_role(v_user_id, 'admin'::public.app_role) THEN
            RAISE EXCEPTION 'This test is not published yet';
        END IF;
    END IF;

    -- Validate entitlement if paid
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
            RAISE EXCEPTION 'Active VIP Subscription required to attempt this test';
        END IF;
    END IF;

    -- Check for existing active in-progress attempt (Idempotency / Interrupted Recovery)
    SELECT * INTO v_attempt 
    FROM public.test_attempts 
    WHERE user_id = v_user_id 
      AND test_id = p_test_id 
      AND status = 'in_progress'
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY created_at DESC 
    LIMIT 1;

    IF v_attempt.id IS NOT NULL THEN
        v_attempt_id := v_attempt.id;
        v_expires_at := v_attempt.expires_at;

        -- Load existing draft answers
        SELECT COALESCE(
            jsonb_object_agg(ta.question_id::text, ta.selected_answer),
            '{}'::jsonb
        )
        INTO v_saved_answers
        FROM public.test_answers ta
        WHERE ta.attempt_id = v_attempt_id
          AND ta.selected_answer IS NOT NULL;

        -- Load existing review flags
        SELECT COALESCE(
            jsonb_agg(ta.question_id::text),
            '[]'::jsonb
        )
        INTO v_saved_reviews
        FROM public.test_answers ta
        WHERE ta.attempt_id = v_attempt_id
          AND ta.is_marked_for_review = true;
    ELSE
        -- Calculate authoritative deadline
        v_duration_mins := COALESCE(v_test.duration_minutes, 60);
        v_expires_at := now() + (v_duration_mins * INTERVAL '1 minute');

        INSERT INTO public.test_attempts (
            test_id,
            user_id,
            score,
            total_marks,
            percentage,
            passed,
            status,
            started_at,
            expires_at,
            exam_mode
        ) VALUES (
            p_test_id,
            v_user_id,
            0,
            COALESCE(v_test.total_marks, 100),
            0,
            false,
            'in_progress',
            now(),
            v_expires_at,
            p_mode
        ) RETURNING id INTO v_attempt_id;
    END IF;

    -- Fetch SANITIZED questions (Zero correct_answer, Zero explanation leakage!)
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', tq.id,
                'questionId', q.id,
                'orderIndex', COALESCE(tq.question_order, 1),
                'marks', COALESCE(tq.marks, 1),
                'negativeMarks', CASE 
                    WHEN COALESCE(v_test.negative_marking, true) THEN COALESCE(v_test.negative_marks_per_question, 0.25)
                    ELSE 0 
                END,
                'questionText', q.question_text,
                'optionA', q.option_a,
                'optionB', q.option_b,
                'optionC', q.option_c,
                'optionD', q.option_d,
                'subject', q.subject,
                'topic', q.topic,
                'difficulty', COALESCE(q.difficulty, 'medium'),
                'year', q.year
            )
            ORDER BY tq.question_order ASC, tq.created_at ASC
        ),
        '[]'::jsonb
    )
    INTO v_questions
    FROM public.test_questions tq
    JOIN public.questions q ON q.id = tq.question_id
    WHERE tq.test_id = p_test_id;

    RETURN jsonb_build_object(
        'attemptId', v_attempt_id,
        'testId', v_test.id,
        'testTitle', v_test.title,
        'durationMinutes', COALESCE(v_test.duration_minutes, 60),
        'totalMarks', COALESCE(v_test.total_marks, 100),
        'passingMarks', COALESCE(v_test.passing_marks, 40),
        'negativeMarking', COALESCE(v_test.negative_marking, true),
        'negativeMarksPerQuestion', COALESCE(v_test.negative_marks_per_question, 0.25),
        'serverTime', now(),
        'startedAt', now(),
        'expiresAt', v_expires_at,
        'questions', v_questions,
        'savedResponses', v_saved_answers,
        'savedReviews', v_saved_reviews
    );
END;
$$;

-- 4. RPC: save_exam_progress (Periodic Autosave / Sync Outbox)
CREATE OR REPLACE FUNCTION public.save_exam_progress(
    p_attempt_id UUID,
    p_answers JSONB,
    p_review_flags JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_attempt RECORD;
    v_q_id UUID;
    v_selected TEXT;
    v_is_review BOOLEAN;
    v_key TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT * INTO v_attempt FROM public.test_attempts WHERE id = p_attempt_id;
    IF v_attempt.id IS NULL THEN
        RAISE EXCEPTION 'Attempt not found';
    END IF;

    IF v_attempt.user_id != v_user_id THEN
        RAISE EXCEPTION 'Unauthorized attempt access';
    END IF;

    IF v_attempt.status != 'in_progress' THEN
        RETURN jsonb_build_object(
            'success', false,
            'serverTime', now(),
            'remainingSeconds', 0,
            'isExpired', true,
            'status', v_attempt.status
        );
    END IF;

    -- Check server deadline (allowing 10s grace for network latency)
    IF v_attempt.expires_at IS NOT NULL AND now() > (v_attempt.expires_at + INTERVAL '10 seconds') THEN
        UPDATE public.test_attempts 
        SET status = 'expired' 
        WHERE id = p_attempt_id;

        RETURN jsonb_build_object(
            'success', false,
            'serverTime', now(),
            'remainingSeconds', 0,
            'isExpired', true,
            'status', 'expired'
        );
    END IF;

    -- Upsert answers
    FOR v_key, v_selected IN SELECT * FROM jsonb_each_text(p_answers)
    LOOP
        BEGIN
            v_q_id := v_key::UUID;
            v_is_review := p_review_flags ? v_key;

            INSERT INTO public.test_answers (
                attempt_id,
                question_id,
                selected_answer,
                is_marked_for_review,
                updated_at
            ) VALUES (
                p_attempt_id,
                v_q_id,
                NULLIF(trim(v_selected), ''),
                v_is_review,
                now()
            )
            ON CONFLICT (attempt_id, question_id) 
            DO UPDATE SET
                selected_answer = EXCLUDED.selected_answer,
                is_marked_for_review = EXCLUDED.is_marked_for_review,
                updated_at = now();
        EXCEPTION WHEN OTHERS THEN
            -- Ignore invalid UUID keys
            NULL;
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'serverTime', now(),
        'remainingSeconds', GREATEST(0, EXTRACT(EPOCH FROM (v_attempt.expires_at - now()))::INT),
        'isExpired', false
    );
END;
$$;

-- 5. RPC: submit_exam_attempt (Deterministic Transactional Server-Side Grading)
CREATE OR REPLACE FUNCTION public.submit_exam_attempt(
    p_attempt_id UUID,
    p_final_answers JSONB DEFAULT NULL,
    p_time_taken_seconds INT DEFAULT 0,
    p_tab_violations INT DEFAULT 0,
    p_fullscreen_violations INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_attempt RECORD;
    v_test RECORD;
    v_q RECORD;
    v_selected TEXT;
    v_correct_answer TEXT;
    v_is_correct BOOLEAN;
    v_marks NUMERIC;
    v_neg_mark NUMERIC;
    v_marks_obtained NUMERIC;
    v_total_score NUMERIC := 0;
    v_total_marks NUMERIC := 0;
    v_correct_count INT := 0;
    v_incorrect_count INT := 0;
    v_unanswered_count INT := 0;
    v_percentage NUMERIC := 0;
    v_passed BOOLEAN := false;
    v_key TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT * INTO v_attempt FROM public.test_attempts WHERE id = p_attempt_id;
    IF v_attempt.id IS NULL THEN
        RAISE EXCEPTION 'Attempt not found';
    END IF;

    IF v_attempt.user_id != v_user_id THEN
        RAISE EXCEPTION 'Unauthorized attempt submission';
    END IF;

    -- Idempotent check: if already completed, return existing authoritative score
    IF v_attempt.status = 'completed' THEN
        RETURN jsonb_build_object(
            'attemptId', v_attempt.id,
            'testId', v_attempt.test_id,
            'status', 'completed',
            'score', v_attempt.score,
            'totalMarks', v_attempt.total_marks,
            'percentage', v_attempt.percentage,
            'correctCount', COALESCE((SELECT COUNT(*) FROM public.test_answers WHERE attempt_id = v_attempt.id AND is_correct = true), 0),
            'incorrectCount', COALESCE((SELECT COUNT(*) FROM public.test_answers WHERE attempt_id = v_attempt.id AND is_correct = false AND selected_answer IS NOT NULL), 0),
            'unansweredCount', COALESCE((SELECT COUNT(*) FROM public.test_answers WHERE attempt_id = v_attempt.id AND selected_answer IS NULL), 0),
            'passed', v_attempt.passed,
            'submittedAt', v_attempt.submitted_at
        );
    END IF;

    -- Retrieve test configuration
    SELECT * INTO v_test FROM public.mock_tests WHERE id = v_attempt.test_id;
    v_neg_mark := CASE 
        WHEN COALESCE(v_test.negative_marking, true) THEN COALESCE(v_test.negative_marks_per_question, 0.25)
        ELSE 0 
    END;

    -- Save any final responses passed with submission
    IF p_final_answers IS NOT NULL AND jsonb_typeof(p_final_answers) = 'object' THEN
        FOR v_key, v_selected IN SELECT * FROM jsonb_each_text(p_final_answers)
        LOOP
            BEGIN
                INSERT INTO public.test_answers (
                    attempt_id,
                    question_id,
                    selected_answer,
                    updated_at
                ) VALUES (
                    p_attempt_id,
                    v_key::UUID,
                    NULLIF(trim(v_selected), ''),
                    now()
                )
                ON CONFLICT (attempt_id, question_id) 
                DO UPDATE SET
                    selected_answer = EXCLUDED.selected_answer,
                    updated_at = now();
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END LOOP;
    END IF;

    -- Grade every question assigned to this test authoritatively
    FOR v_q IN 
        SELECT 
            tq.question_id,
            COALESCE(tq.marks, 1) AS q_marks,
            UPPER(TRIM(q.correct_answer)) AS correct_answer,
            q.subject,
            q.topic,
            ta.selected_answer
        FROM public.test_questions tq
        JOIN public.questions q ON q.id = tq.question_id
        LEFT JOIN public.test_answers ta ON ta.attempt_id = p_attempt_id AND ta.question_id = tq.question_id
        WHERE tq.test_id = v_attempt.test_id
    LOOP
        v_total_marks := v_total_marks + v_q.q_marks;
        v_selected := UPPER(TRIM(COALESCE(v_q.selected_answer, '')));

        IF v_selected = '' OR v_selected IS NULL THEN
            v_unanswered_count := v_unanswered_count + 1;
            v_is_correct := false;
            v_marks_obtained := 0;
        ELSIF v_selected = v_q.correct_answer THEN
            v_correct_count := v_correct_count + 1;
            v_is_correct := true;
            v_marks_obtained := v_q.q_marks;
            v_total_score := v_total_score + v_marks_obtained;
        ELSE
            v_incorrect_count := v_incorrect_count + 1;
            v_is_correct := false;
            v_marks_obtained := -v_neg_mark;
            v_total_score := v_total_score + v_marks_obtained;

            -- Record mistake in notebook
            BEGIN
                INSERT INTO public.mistakes_notebook (
                    user_id,
                    question_id,
                    selected_answer,
                    correct_answer,
                    is_mastered,
                    updated_at
                ) VALUES (
                    v_user_id,
                    v_q.question_id,
                    v_selected,
                    v_q.correct_answer,
                    false,
                    now()
                )
                ON CONFLICT (user_id, question_id)
                DO UPDATE SET
                    selected_answer = EXCLUDED.selected_answer,
                    correct_answer = EXCLUDED.correct_answer,
                    is_mastered = false,
                    updated_at = now();
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;

        -- Record individual answer evaluation
        INSERT INTO public.test_answers (
            attempt_id,
            question_id,
            selected_answer,
            is_correct,
            marks_obtained,
            updated_at
        ) VALUES (
            p_attempt_id,
            v_q.question_id,
            NULLIF(v_selected, ''),
            v_is_correct,
            v_marks_obtained,
            now()
        )
        ON CONFLICT (attempt_id, question_id)
        DO UPDATE SET
            selected_answer = EXCLUDED.selected_answer,
            is_correct = EXCLUDED.is_correct,
            marks_obtained = EXCLUDED.marks_obtained,
            updated_at = now();
    END LOOP;

    -- Floor score at 0
    IF v_total_score < 0 THEN
        v_total_score := 0;
    END IF;

    IF v_total_marks = 0 THEN
        v_total_marks := COALESCE(v_test.total_marks, 100);
    END IF;

    v_percentage := ROUND((v_total_score / v_total_marks) * 100, 2);
    v_passed := v_total_score >= COALESCE(v_test.passing_marks, 40);

    -- Commit authoritative attempt result
    UPDATE public.test_attempts
    SET 
        score = v_total_score,
        total_marks = v_total_marks,
        percentage = v_percentage,
        passed = v_passed,
        status = 'completed',
        submitted_at = now(),
        time_taken_seconds = p_time_taken_seconds,
        tab_violations = p_tab_violations,
        fullscreen_violations = p_fullscreen_violations
    WHERE id = p_attempt_id;

    RETURN jsonb_build_object(
        'attemptId', p_attempt_id,
        'testId', v_test.id,
        'status', 'completed',
        'score', v_total_score,
        'totalMarks', v_total_marks,
        'percentage', v_percentage,
        'correctCount', v_correct_count,
        'incorrectCount', v_incorrect_count,
        'unansweredCount', v_unanswered_count,
        'passed', v_passed,
        'submittedAt', now()
    );
END;
$$;

-- 6. RPC: get_attempt_results (Returns Results & Permitted Solutions ONLY after completion)
CREATE OR REPLACE FUNCTION public.get_attempt_results(p_attempt_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_attempt RECORD;
    v_test RECORD;
    v_solutions JSONB;
    v_breakdown JSONB;
    v_correct_count INT;
    v_incorrect_count INT;
    v_unanswered_count INT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT * INTO v_attempt FROM public.test_attempts WHERE id = p_attempt_id;
    IF v_attempt.id IS NULL THEN
        RAISE EXCEPTION 'Attempt not found';
    END IF;

    -- Must be attempt owner or admin
    IF v_attempt.user_id != v_user_id AND NOT public.has_role(v_user_id, 'admin'::public.app_role) THEN
        RAISE EXCEPTION 'Unauthorized attempt result access';
    END IF;

    -- Strict protection: NEVER disclose answers or explanations if attempt is still in progress!
    IF v_attempt.status = 'in_progress' AND (v_attempt.expires_at IS NULL OR v_attempt.expires_at > now()) THEN
        RAISE EXCEPTION 'Results cannot be viewed while test is actively in progress';
    END IF;

    SELECT * INTO v_test FROM public.mock_tests WHERE id = v_attempt.test_id;

    -- Detailed question solutions (Answers & Explanations safely released)
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'questionId', q.id,
                'orderIndex', COALESCE(tq.question_order, 1),
                'questionText', q.question_text,
                'optionA', q.option_a,
                'optionB', q.option_b,
                'optionC', q.option_c,
                'optionD', q.option_d,
                'selectedOption', ta.selected_answer,
                'correctAnswer', q.correct_answer,
                'isCorrect', COALESCE(ta.is_correct, false),
                'marksObtained', COALESCE(ta.marks_obtained, 0),
                'explanation', q.explanation,
                'subject', q.subject,
                'topic', q.topic
            )
            ORDER BY tq.question_order ASC, tq.created_at ASC
        ),
        '[]'::jsonb
    )
    INTO v_solutions
    FROM public.test_questions tq
    JOIN public.questions q ON q.id = tq.question_id
    LEFT JOIN public.test_answers ta ON ta.attempt_id = p_attempt_id AND ta.question_id = q.id
    WHERE tq.test_id = v_attempt.test_id;

    -- Section breakdown
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'subject', sec.subject,
                'score', GREATEST(0, sec.sec_score),
                'totalMarks', sec.sec_total,
                'correct', sec.sec_correct,
                'incorrect', sec.sec_incorrect,
                'unanswered', sec.sec_unanswered
            )
        ),
        '[]'::jsonb
    )
    INTO v_breakdown
    FROM (
        SELECT 
            COALESCE(q.subject, 'General') AS subject,
            SUM(COALESCE(ta.marks_obtained, 0)) AS sec_score,
            SUM(COALESCE(tq.marks, 1)) AS sec_total,
            COUNT(*) FILTER (WHERE ta.is_correct = true) AS sec_correct,
            COUNT(*) FILTER (WHERE ta.is_correct = false AND ta.selected_answer IS NOT NULL) AS sec_incorrect,
            COUNT(*) FILTER (WHERE ta.selected_answer IS NULL) AS sec_unanswered
        FROM public.test_questions tq
        JOIN public.questions q ON q.id = tq.question_id
        LEFT JOIN public.test_answers ta ON ta.attempt_id = p_attempt_id AND ta.question_id = q.id
        WHERE tq.test_id = v_attempt.test_id
        GROUP BY COALESCE(q.subject, 'General')
    ) sec;

    -- Accurate counts
    SELECT 
        COUNT(*) FILTER (WHERE is_correct = true),
        COUNT(*) FILTER (WHERE is_correct = false AND selected_answer IS NOT NULL),
        COUNT(*) FILTER (WHERE selected_answer IS NULL)
    INTO v_correct_count, v_incorrect_count, v_unanswered_count
    FROM public.test_answers
    WHERE attempt_id = p_attempt_id;

    RETURN jsonb_build_object(
        'attemptId', v_attempt.id,
        'testId', v_test.id,
        'testTitle', v_test.title,
        'score', v_attempt.score,
        'totalMarks', v_attempt.total_marks,
        'percentage', v_attempt.percentage,
        'passed', v_attempt.passed,
        'passingMarks', COALESCE(v_test.passing_marks, 40),
        'timeTakenSeconds', COALESCE(v_attempt.time_taken_seconds, 0),
        'correctCount', COALESCE(v_correct_count, 0),
        'incorrectCount', COALESCE(v_incorrect_count, 0),
        'unansweredCount', COALESCE(v_unanswered_count, 0),
        'sectionBreakdown', v_breakdown,
        'solutions', v_solutions
    );
END;
$$;

-- 7. Hardened Row-Level Security on test_attempts
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Approved students can insert their own attempts" ON public.test_attempts;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Students can insert their own attempts" ON public.test_attempts;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Students can view their own attempts" ON public.test_attempts;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Students can view their own attempts"
ON public.test_attempts FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

