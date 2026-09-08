-- ====================================================================
-- PRACTICEKORO: MISTAKES NOTEBOOK & REVISION ENGINE UPGRADE
-- Adds error classification (conceptual, careless, time pressure, guess),
-- student reflection notes, re-attempt streaks, and mastery tracking.
-- ====================================================================

-- 1. Schema Enhancements on student_mistakes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'student_mistakes' AND column_name = 'error_type') THEN
        ALTER TABLE public.student_mistakes ADD COLUMN error_type VARCHAR(30) NOT NULL DEFAULT 'unclassified';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'student_mistakes' AND column_name = 'student_notes') THEN
        ALTER TABLE public.student_mistakes ADD COLUMN student_notes TEXT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'student_mistakes' AND column_name = 'streak') THEN
        ALTER TABLE public.student_mistakes ADD COLUMN streak INTEGER NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'student_mistakes' AND column_name = 'last_retry_at') THEN
        ALTER TABLE public.student_mistakes ADD COLUMN last_retry_at TIMESTAMPTZ NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'student_mistakes' AND column_name = 'mastered_at') THEN
        ALTER TABLE public.student_mistakes ADD COLUMN mastered_at TIMESTAMPTZ NULL;
    END IF;
END $$;

-- 2. Performance Indexes for Mistakes Filtering & Analytics
CREATE INDEX IF NOT EXISTS idx_student_mistakes_user_error_type ON public.student_mistakes(user_id, error_type);
CREATE INDEX IF NOT EXISTS idx_student_mistakes_user_mastered ON public.student_mistakes(user_id, is_mastered);
CREATE INDEX IF NOT EXISTS idx_student_mistakes_question ON public.student_mistakes(question_id);

-- 3. Compatibility View for mistakes_notebook
CREATE OR REPLACE VIEW public.mistakes_notebook AS
SELECT * FROM public.student_mistakes;

-- 4. RPC: classify_student_mistake
CREATE OR REPLACE FUNCTION public.classify_student_mistake(
    p_mistake_id UUID,
    p_error_type TEXT,
    p_student_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_updated RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    UPDATE public.student_mistakes
    SET 
        error_type = COALESCE(p_error_type, 'unclassified'),
        student_notes = p_student_notes,
        updated_at = now()
    WHERE id = p_mistake_id AND user_id = v_user_id
    RETURNING * INTO v_updated;

    IF v_updated.id IS NULL THEN
        RAISE EXCEPTION 'Mistake item not found or unauthorized';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'mistakeId', v_updated.id,
        'errorType', v_updated.error_type,
        'studentNotes', v_updated.student_notes,
        'updatedAt', v_updated.updated_at
    );
END;
$$;

-- 5. RPC: record_mistake_reattempt
CREATE OR REPLACE FUNCTION public.record_mistake_reattempt(
    p_mistake_id UUID,
    p_is_correct BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_item RECORD;
    v_new_streak INT;
    v_is_mastered BOOLEAN;
    v_mastered_at TIMESTAMPTZ;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT * INTO v_item 
    FROM public.student_mistakes 
    WHERE id = p_mistake_id AND user_id = v_user_id;

    IF v_item.id IS NULL THEN
        RAISE EXCEPTION 'Mistake item not found or unauthorized';
    END IF;

    IF p_is_correct THEN
        v_new_streak := COALESCE(v_item.streak, 0) + 1;
        v_is_mastered := true;
        v_mastered_at := now();
    ELSE
        v_new_streak := 0;
        v_is_mastered := false;
        v_mastered_at := NULL;
    END IF;

    UPDATE public.student_mistakes
    SET
        retry_count = COALESCE(retry_count, 0) + 1,
        streak = v_new_streak,
        is_mastered = v_is_mastered,
        mastered_at = COALESCE(v_mastered_at, mastered_at),
        last_retry_at = now(),
        updated_at = now()
    WHERE id = p_mistake_id AND user_id = v_user_id
    RETURNING * INTO v_item;

    RETURN jsonb_build_object(
        'success', true,
        'mistakeId', v_item.id,
        'isMastered', v_item.is_mastered,
        'retryCount', v_item.retry_count,
        'streak', v_item.streak,
        'lastRetryAt', v_item.last_retry_at
    );
END;
$$;
