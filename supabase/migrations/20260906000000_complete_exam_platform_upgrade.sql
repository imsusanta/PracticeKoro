-- ==============================================================================
-- Migration: PracticeKoro Complete 9.5/10 Exam Platform Upgrade
-- Date: 2026-09-06
-- Description:
--   1. Question bank metadata (difficulty, year for PYQ, tags, source, subtopic, status, language)
--   2. Mock test negative marking configuration
--   3. Student Bookmarks table
--   4. Student Mistakes notebook table
--   5. Daily practice & streaks tables
--   6. Server-side scoring RPC (submit_exam_attempt) with negative marking
--   7. Secure question retrieval RPC (get_student_exam_questions) to prevent answer leakage
--   8. Exam Leaderboard RPC (get_exam_leaderboard) with privacy protection
-- ==============================================================================

-- 1. Enhance Questions Table
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
ADD COLUMN IF NOT EXISTS year INTEGER NULL,
ADD COLUMN IF NOT EXISTS tags TEXT NULL,
ADD COLUMN IF NOT EXISTS source TEXT NULL,
ADD COLUMN IF NOT EXISTS subtopic TEXT NULL,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'review', 'approved', 'published', 'archived')),
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'bn' CHECK (language IN ('bn', 'en', 'mixed'));

CREATE INDEX IF NOT EXISTS idx_questions_year ON public.questions(year);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_status ON public.questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_language ON public.questions(language);

-- 2. Enhance Mock Tests Table
ALTER TABLE public.mock_tests
ADD COLUMN IF NOT EXISTS negative_marking BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS negative_marks_per_question NUMERIC(4,2) DEFAULT 0.25,
ADD COLUMN IF NOT EXISTS target_exam_name TEXT NULL;

-- 3. Student Bookmarks Table
CREATE TABLE IF NOT EXISTS public.student_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    notes TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_student_bookmarks_user ON public.student_bookmarks(user_id);
ALTER TABLE public.student_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can manage their own bookmarks" ON public.student_bookmarks;
CREATE POLICY "Students can manage their own bookmarks"
ON public.student_bookmarks
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all bookmarks" ON public.student_bookmarks;
CREATE POLICY "Admins can view all bookmarks"
ON public.student_bookmarks
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4. Student Mistakes ("My Mistakes") Notebook Table
CREATE TABLE IF NOT EXISTS public.student_mistakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    attempt_id UUID NULL REFERENCES public.test_attempts(id) ON DELETE SET NULL,
    selected_answer TEXT NULL,
    correct_answer TEXT NOT NULL,
    is_mastered BOOLEAN DEFAULT FALSE,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_student_mistakes_user ON public.student_mistakes(user_id);
CREATE INDEX IF NOT EXISTS idx_student_mistakes_mastered ON public.student_mistakes(user_id, is_mastered);
ALTER TABLE public.student_mistakes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can manage their own mistakes" ON public.student_mistakes;
CREATE POLICY "Students can manage their own mistakes"
ON public.student_mistakes
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all mistakes" ON public.student_mistakes;
CREATE POLICY "Admins can view all mistakes"
ON public.student_mistakes
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 5. Student Streaks & Daily Practice
CREATE TABLE IF NOT EXISTS public.student_streaks (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE DEFAULT CURRENT_DATE,
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.student_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view and update their own streak" ON public.student_streaks;
CREATE POLICY "Students can view and update their own streak"
ON public.student_streaks
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.daily_practice_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    practice_date DATE DEFAULT CURRENT_DATE,
    score INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 10,
    correct_count INTEGER DEFAULT 0,
    time_taken_seconds INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_practice_user_date ON public.daily_practice_attempts(user_id, practice_date);
ALTER TABLE public.daily_practice_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can manage their own daily practice" ON public.daily_practice_attempts;
CREATE POLICY "Students can manage their own daily practice"
ON public.daily_practice_attempts
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Server-Authoritative Exam Scoring RPC
CREATE OR REPLACE FUNCTION public.submit_exam_attempt(
    p_test_id UUID,
    p_answers JSONB,
    p_time_taken_seconds INTEGER,
    p_tab_violations INTEGER DEFAULT 0,
    p_fullscreen_violations INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
    v_test RECORD;
    v_tq RECORD;
    v_attempt_id UUID;
    v_selected TEXT;
    v_is_correct BOOLEAN;
    v_marks_awarded NUMERIC(5,2);
    v_total_score NUMERIC(6,2) := 0.00;
    v_total_marks NUMERIC(6,2) := 0.00;
    v_correct_count INTEGER := 0;
    v_wrong_count INTEGER := 0;
    v_unanswered_count INTEGER := 0;
    v_percentage NUMERIC(5,2) := 0.00;
    v_passed BOOLEAN := false;
    v_negative_val NUMERIC(4,2) := 0.00;
    v_streak RECORD;
    v_today DATE := CURRENT_DATE;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Fetch Mock Test configuration
    SELECT * INTO v_test FROM public.mock_tests WHERE id = p_test_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Mock test not found';
    END IF;

    IF v_test.negative_marking IS TRUE THEN
        v_negative_val := COALESCE(v_test.negative_marks_per_question, 0.25);
    END IF;

    -- Create placeholder attempt record
    INSERT INTO public.test_attempts (
        test_id,
        user_id,
        score,
        total_marks,
        percentage,
        passed,
        started_at,
        completed_at,
        time_taken_seconds,
        tab_violations,
        fullscreen_violations,
        is_active
    ) VALUES (
        p_test_id,
        v_user_id,
        0,
        COALESCE(v_test.total_marks, 100),
        0,
        false,
        now() - (p_time_taken_seconds || ' seconds')::INTERVAL,
        now(),
        p_time_taken_seconds,
        p_tab_violations,
        p_fullscreen_violations,
        false
    )
    RETURNING id INTO v_attempt_id;

    -- Iterate over each test question and calculate scores
    FOR v_tq IN (
        SELECT 
            tq.question_id,
            tq.marks,
            q.correct_answer
        FROM public.test_questions tq
        JOIN public.questions q ON q.id = tq.question_id
        WHERE tq.test_id = p_test_id
    ) LOOP
        v_total_marks := v_total_marks + COALESCE(v_tq.marks, 1.0);
        v_selected := p_answers->>v_tq.question_id::TEXT;

        IF v_selected IS NULL OR trim(v_selected) = '' THEN
            v_unanswered_count := v_unanswered_count + 1;
            v_marks_awarded := 0.00;
            v_is_correct := false;
        ELSIF UPPER(trim(v_selected)) = UPPER(trim(v_tq.correct_answer)) THEN
            v_correct_count := v_correct_count + 1;
            v_marks_awarded := COALESCE(v_tq.marks, 1.0);
            v_total_score := v_total_score + v_marks_awarded;
            v_is_correct := true;
        ELSE
            v_wrong_count := v_wrong_count + 1;
            v_marks_awarded := -v_negative_val;
            v_total_score := v_total_score - v_negative_val;
            v_is_correct := false;

            -- Auto-archive into student mistake notebook
            INSERT INTO public.student_mistakes (
                user_id,
                question_id,
                attempt_id,
                selected_answer,
                correct_answer,
                is_mastered,
                updated_at
            ) VALUES (
                v_user_id,
                v_tq.question_id,
                v_attempt_id,
                v_selected,
                v_tq.correct_answer,
                false,
                now()
            )
            ON CONFLICT (user_id, question_id) 
            DO UPDATE SET
                attempt_id = v_attempt_id,
                selected_answer = v_selected,
                correct_answer = v_tq.correct_answer,
                is_mastered = false,
                retry_count = student_mistakes.retry_count + 1,
                updated_at = now();
        END IF;

        -- Record individual question response
        INSERT INTO public.test_answers (
            attempt_id,
            question_id,
            selected_answer,
            is_correct,
            marks_obtained
        ) VALUES (
            v_attempt_id,
            v_tq.question_id,
            v_selected,
            v_is_correct,
            v_marks_awarded
        );
    END LOOP;

    -- Avoid negative total score floor at 0 if required
    IF v_total_score < 0 THEN
        v_total_score := 0;
    END IF;

    IF v_total_marks > 0 THEN
        v_percentage := ROUND((v_total_score / v_total_marks) * 100, 2);
    ELSE
        v_percentage := 0;
    END IF;

    v_passed := v_total_score >= COALESCE(v_test.passing_marks, 40);

    -- Update finalized attempt
    UPDATE public.test_attempts
    SET 
        score = v_total_score,
        total_marks = v_total_marks,
        percentage = v_percentage,
        passed = v_passed,
        correct_count = v_correct_count,
        wrong_count = v_wrong_count,
        unanswered_count = v_unanswered_count
    WHERE id = v_attempt_id;

    -- Clean up active drafts & timers
    DELETE FROM public.test_answer_drafts WHERE test_id = p_test_id AND user_id = v_user_id;
    DELETE FROM public.test_timers WHERE test_id = p_test_id AND user_id = v_user_id;

    -- Update Streak
    SELECT * INTO v_streak FROM public.student_streaks WHERE user_id = v_user_id;
    IF NOT FOUND THEN
        INSERT INTO public.student_streaks (user_id, current_streak, longest_streak, last_activity_date)
        VALUES (v_user_id, 1, 1, v_today);
    ELSE
        IF v_streak.last_activity_date = v_today - 1 THEN
            UPDATE public.student_streaks
            SET 
                current_streak = v_streak.current_streak + 1,
                longest_streak = GREATEST(v_streak.longest_streak, v_streak.current_streak + 1),
                last_activity_date = v_today,
                updated_at = now()
            WHERE user_id = v_user_id;
        ELSIF v_streak.last_activity_date < v_today - 1 THEN
            UPDATE public.student_streaks
            SET 
                current_streak = 1,
                last_activity_date = v_today,
                updated_at = now()
            WHERE user_id = v_user_id;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'attempt_id', v_attempt_id,
        'score', v_total_score,
        'total_marks', v_total_marks,
        'percentage', v_percentage,
        'passed', v_passed,
        'correct_count', v_correct_count,
        'wrong_count', v_wrong_count,
        'unanswered_count', v_unanswered_count
    );
END;
$$;

-- 7. Secure Question Loader RPC (Does NOT return correct_answer or explanation)
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- 8. Exam Leaderboard RPC (Privacy-Preserving)
CREATE OR REPLACE FUNCTION public.get_exam_leaderboard(p_test_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    display_name TEXT,
    score NUMERIC,
    percentage NUMERIC,
    rank BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH ranked AS (
        SELECT 
            COALESCE(
                CASE 
                    WHEN p.full_name IS NOT NULL AND length(trim(p.full_name)) > 2 THEN
                        split_part(p.full_name, ' ', 1) || ' ' || SUBSTRING(split_part(p.full_name, ' ', 2) FROM 1 FOR 1) || '.'
                    ELSE 'Student'
                END,
                'Candidate'
            ) AS display_name,
            ta.score,
            ta.percentage,
            DENSE_RANK() OVER (ORDER BY ta.score DESC, ta.time_taken_seconds ASC) AS rank
        FROM public.test_attempts ta
        LEFT JOIN public.profiles p ON p.id = ta.user_id
        WHERE ta.test_id = p_test_id
          AND ta.is_active = false
    )
    SELECT display_name, score, percentage, rank
    FROM ranked
    LIMIT p_limit;
$$;

-- 9. Current Affairs Table
CREATE TABLE IF NOT EXISTS public.current_affairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT DEFAULT 'West Bengal' CHECK (category IN ('India', 'West Bengal', 'International', 'Economy', 'Government Schemes', 'Science & Technology', 'Sports', 'Awards', 'Appointments', 'Important Days')),
    published_date DATE DEFAULT CURRENT_DATE,
    source TEXT NULL,
    mcq_data JSONB NULL,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_current_affairs_date ON public.current_affairs(published_date);
CREATE INDEX IF NOT EXISTS idx_current_affairs_category ON public.current_affairs(category);
ALTER TABLE public.current_affairs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published current affairs" ON public.current_affairs;
CREATE POLICY "Anyone can view published current affairs"
ON public.current_affairs
FOR SELECT
USING (is_published = true OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can manage current affairs" ON public.current_affairs;
CREATE POLICY "Admins can manage current affairs"
ON public.current_affairs
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 10. Global / Exam-wise Leaderboard RPC
CREATE OR REPLACE FUNCTION public.get_global_leaderboard(p_timeframe TEXT DEFAULT 'all_time', p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    total_score NUMERIC,
    avg_percentage NUMERIC,
    tests_completed BIGINT,
    rank BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH user_stats AS (
        SELECT 
            ta.user_id,
            COALESCE(
                CASE 
                    WHEN p.full_name IS NOT NULL AND length(trim(p.full_name)) > 2 THEN
                        split_part(p.full_name, ' ', 1) || ' ' || SUBSTRING(split_part(p.full_name, ' ', 2) FROM 1 FOR 1) || '.'
                    ELSE 'Student'
                END,
                'Candidate'
            ) AS display_name,
            SUM(ta.score) AS total_score,
            ROUND(AVG(ta.percentage), 1) AS avg_percentage,
            COUNT(ta.id) AS tests_completed
        FROM public.test_attempts ta
        LEFT JOIN public.profiles p ON p.id = ta.user_id
        WHERE ta.is_active = false
          AND (
            p_timeframe = 'all_time'
            OR (p_timeframe = 'weekly' AND ta.completed_at >= now() - INTERVAL '7 days')
            OR (p_timeframe = 'monthly' AND ta.completed_at >= now() - INTERVAL '30 days')
          )
        GROUP BY ta.user_id, p.full_name
        HAVING COUNT(ta.id) > 0
    ),
    ranked AS (
        SELECT 
            user_id,
            display_name,
            total_score,
            avg_percentage,
            tests_completed,
            DENSE_RANK() OVER (ORDER BY total_score DESC, avg_percentage DESC) AS rank
        FROM user_stats
    )
    SELECT user_id, display_name, total_score, avg_percentage, tests_completed, rank
    FROM ranked
    LIMIT p_limit;
$$;
