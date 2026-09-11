-- ========================================================================
-- Migration: Normalized Relational Question Management System Architecture
-- Date: 2026-09-11
-- Path: supabase/migrations/20260911150000_normalized_question_management.sql
-- ========================================================================

-- Enable pgcrypto / uuid generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================================================
-- 1. DEDUPLICATE & NORMALIZE `subjects`
-- ========================================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Deduplicate any duplicate slugs in subjects table
    FOR r IN (
        SELECT slug, MIN(id::text)::uuid AS keep_id
        FROM public.subjects
        WHERE slug IS NOT NULL
        GROUP BY slug
        HAVING COUNT(*) > 1
    ) LOOP
        -- Reassign any topics pointing to duplicate subjects to the keeper
        UPDATE public.topics
        SET subject_id = r.keep_id
        WHERE subject_id IN (
            SELECT id FROM public.subjects WHERE slug = r.slug AND id <> r.keep_id
        );

        -- Reassign any questions pointing to duplicate subjects
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'subject_id') THEN
            UPDATE public.questions
            SET subject_id = r.keep_id
            WHERE subject_id IN (
                SELECT id FROM public.subjects WHERE slug = r.slug AND id <> r.keep_id
            );
        END IF;

        -- Delete duplicate subject records
        DELETE FROM public.subjects
        WHERE slug = r.slug AND id <> r.keep_id;
    END LOOP;

    -- Add unique constraint on slug if not present
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_subjects_slug'
    ) THEN
        ALTER TABLE public.subjects ADD CONSTRAINT uq_subjects_slug UNIQUE (slug);
    END IF;
END $$;

-- Ensure subjects columns
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ========================================================================
-- 2. STANDARDIZE `topics`
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_topics_subject_id ON public.topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_topics_slug ON public.topics(slug);

-- ========================================================================
-- 3. NORMALIZE `questions`
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL,
    explanation TEXT,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    difficulty TEXT DEFAULT 'medium',
    question_type TEXT DEFAULT 'mcq',
    marks NUMERIC DEFAULT 1,
    negative_marks NUMERIC DEFAULT 0,
    language TEXT DEFAULT 'bn',
    source TEXT,
    year INTEGER,
    status TEXT DEFAULT 'published',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    -- Legacy columns preserved for non-breaking backward-compatibility
    option_a TEXT,
    option_b TEXT,
    option_c TEXT,
    option_d TEXT,
    correct_answer TEXT,
    subject TEXT,
    topic TEXT,
    exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL
);

-- Ensure all target columns exist on questions
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'mcq';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS marks NUMERIC DEFAULT 1;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS negative_marks NUMERIC DEFAULT 0;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'bn';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Safe check constraint on difficulty
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'questions_difficulty_check') THEN
        ALTER TABLE public.questions ADD CONSTRAINT questions_difficulty_check 
        CHECK (difficulty IN ('easy', 'medium', 'hard'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'questions_status_check') THEN
        ALTER TABLE public.questions ADD CONSTRAINT questions_status_check 
        CHECK (status IN ('draft', 'published', 'archived'));
    END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_subject_id ON public.questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_topic_id ON public.questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_status ON public.questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_language ON public.questions(language);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON public.questions(created_at DESC);

-- ========================================================================
-- 4. CREATE `question_options` (1:N with questions)
-- ========================================================================
CREATE TABLE IF NOT EXISTS public.question_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    option_order INTEGER NOT NULL,
    is_correct BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_question_option_order UNIQUE (question_id, option_order)
);

CREATE INDEX IF NOT EXISTS idx_question_options_question_id ON public.question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_question_options_is_correct ON public.question_options(question_id, is_correct);

-- ========================================================================
-- 5. STANDARDIZE `mock_tests` & CREATE `mock_test_questions`
-- ========================================================================
ALTER TABLE public.mock_tests ADD COLUMN IF NOT EXISTS total_questions INTEGER DEFAULT 0;
ALTER TABLE public.mock_tests ADD COLUMN IF NOT EXISTS negative_marks NUMERIC DEFAULT 0;
ALTER TABLE public.mock_tests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE public.mock_tests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mock_tests_status_check') THEN
        ALTER TABLE public.mock_tests ADD CONSTRAINT mock_tests_status_check 
        CHECK (status IN ('draft', 'published', 'archived'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.mock_test_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mock_test_id UUID NOT NULL REFERENCES public.mock_tests(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE RESTRICT,
    question_number INTEGER NOT NULL,
    marks NUMERIC DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_mock_test_question UNIQUE (mock_test_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_mock_test_questions_test_id ON public.mock_test_questions(mock_test_id);
CREATE INDEX IF NOT EXISTS idx_mock_test_questions_question_id ON public.mock_test_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_mock_test_questions_order ON public.mock_test_questions(mock_test_id, question_number);

-- ========================================================================
-- 6. MIGRATE ANY EXISTING LEGACY QUESTIONS INTO question_options
-- ========================================================================
DO $$
DECLARE
    q RECORD;
BEGIN
    FOR q IN (
        SELECT id, option_a, option_b, option_c, option_d, correct_answer
        FROM public.questions
        WHERE id NOT IN (SELECT DISTINCT question_id FROM public.question_options)
          AND (option_a IS NOT NULL OR option_b IS NOT NULL)
    ) LOOP
        IF q.option_a IS NOT NULL AND TRIM(q.option_a) <> '' THEN
            INSERT INTO public.question_options (question_id, option_text, option_order, is_correct)
            VALUES (q.id, q.option_a, 1, (UPPER(TRIM(COALESCE(q.correct_answer, ''))) = 'A'))
            ON CONFLICT (question_id, option_order) DO UPDATE SET option_text = EXCLUDED.option_text;
        END IF;

        IF q.option_b IS NOT NULL AND TRIM(q.option_b) <> '' THEN
            INSERT INTO public.question_options (question_id, option_text, option_order, is_correct)
            VALUES (q.id, q.option_b, 2, (UPPER(TRIM(COALESCE(q.correct_answer, ''))) = 'B'))
            ON CONFLICT (question_id, option_order) DO UPDATE SET option_text = EXCLUDED.option_text;
        END IF;

        IF q.option_c IS NOT NULL AND TRIM(q.option_c) <> '' THEN
            INSERT INTO public.question_options (question_id, option_text, option_order, is_correct)
            VALUES (q.id, q.option_c, 3, (UPPER(TRIM(COALESCE(q.correct_answer, ''))) = 'C'))
            ON CONFLICT (question_id, option_order) DO UPDATE SET option_text = EXCLUDED.option_text;
        END IF;

        IF q.option_d IS NOT NULL AND TRIM(q.option_d) <> '' THEN
            INSERT INTO public.question_options (question_id, option_text, option_order, is_correct)
            VALUES (q.id, q.option_d, 4, (UPPER(TRIM(COALESCE(q.correct_answer, ''))) = 'D'))
            ON CONFLICT (question_id, option_order) DO UPDATE SET option_text = EXCLUDED.option_text;
        END IF;
    END LOOP;

    -- Migrate any test_questions to mock_test_questions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'test_questions') THEN
        INSERT INTO public.mock_test_questions (mock_test_id, question_id, question_number, marks, created_at)
        SELECT test_id, question_id, COALESCE(question_order, 1), COALESCE(marks, 1), created_at
        FROM public.test_questions
        ON CONFLICT (mock_test_id, question_id) DO NOTHING;
    END IF;
END $$;

-- ========================================================================
-- 7. BIDIRECTIONAL BACKWARD-COMPATIBILITY TRIGGERS
-- ========================================================================
-- Trigger: Sync question_options to legacy questions columns (option_a..d, correct_answer)
CREATE OR REPLACE FUNCTION public.sync_question_options_to_legacy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_q_id UUID;
    v_opt1 TEXT := NULL;
    v_opt2 TEXT := NULL;
    v_opt3 TEXT := NULL;
    v_opt4 TEXT := NULL;
    v_correct TEXT := NULL;
    r RECORD;
BEGIN
    v_q_id := COALESCE(NEW.question_id, OLD.question_id);
    IF v_q_id IS NULL THEN
        RETURN NULL;
    END IF;

    FOR r IN (
        SELECT option_order, option_text, is_correct
        FROM public.question_options
        WHERE question_id = v_q_id
        ORDER BY option_order ASC
    ) LOOP
        IF r.option_order = 1 THEN
            v_opt1 := r.option_text;
            IF r.is_correct THEN v_correct := 'A'; END IF;
        ELSIF r.option_order = 2 THEN
            v_opt2 := r.option_text;
            IF r.is_correct THEN v_correct := 'B'; END IF;
        ELSIF r.option_order = 3 THEN
            v_opt3 := r.option_text;
            IF r.is_correct THEN v_correct := 'C'; END IF;
        ELSIF r.option_order = 4 THEN
            v_opt4 := r.option_text;
            IF r.is_correct THEN v_correct := 'D'; END IF;
        END IF;
    END LOOP;

    UPDATE public.questions
    SET 
        option_a = COALESCE(v_opt1, option_a),
        option_b = COALESCE(v_opt2, option_b),
        option_c = COALESCE(v_opt3, option_c),
        option_d = COALESCE(v_opt4, option_d),
        correct_answer = COALESCE(v_correct, correct_answer),
        updated_at = now()
    WHERE id = v_q_id;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_question_options ON public.question_options;
CREATE TRIGGER trg_sync_question_options
AFTER INSERT OR UPDATE OR DELETE ON public.question_options
FOR EACH ROW
EXECUTE FUNCTION public.sync_question_options_to_legacy();

-- Trigger: Sync mock_test_questions to legacy test_questions
CREATE OR REPLACE FUNCTION public.sync_mock_test_questions_to_legacy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.test_questions (test_id, question_id, question_order, marks, created_at)
        VALUES (NEW.mock_test_id, NEW.question_id, NEW.question_number, COALESCE(NEW.marks, 1), NEW.created_at)
        ON CONFLICT DO NOTHING;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE public.test_questions
        SET question_order = NEW.question_number,
            marks = COALESCE(NEW.marks, 1)
        WHERE test_id = NEW.mock_test_id AND question_id = NEW.question_id;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.test_questions
        WHERE test_id = OLD.mock_test_id AND question_id = OLD.question_id;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_mock_test_questions ON public.mock_test_questions;
CREATE TRIGGER trg_sync_mock_test_questions
AFTER INSERT OR UPDATE OR DELETE ON public.mock_test_questions
FOR EACH ROW
EXECUTE FUNCTION public.sync_mock_test_questions_to_legacy();

-- ========================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================================
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_test_questions ENABLE ROW LEVEL SECURITY;

-- question_options RLS
DROP POLICY IF EXISTS "Admins have full access to question_options" ON public.question_options;
CREATE POLICY "Admins have full access to question_options"
ON public.question_options
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Anyone can view options for published questions" ON public.question_options;
CREATE POLICY "Anyone can view options for published questions"
ON public.question_options
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.questions q
        WHERE q.id = question_options.question_id
          AND q.status = 'published'
    )
);

-- mock_test_questions RLS
DROP POLICY IF EXISTS "Admins have full access to mock_test_questions" ON public.mock_test_questions;
CREATE POLICY "Admins have full access to mock_test_questions"
ON public.mock_test_questions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Anyone can view mock_test_questions for published tests" ON public.mock_test_questions;
CREATE POLICY "Anyone can view mock_test_questions for published tests"
ON public.mock_test_questions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.mock_tests mt
        WHERE mt.id = mock_test_questions.mock_test_id
          AND mt.is_published = true
    )
);

-- questions RLS
DROP POLICY IF EXISTS "Admins have full access to questions" ON public.questions;
CREATE POLICY "Admins have full access to questions"
ON public.questions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Students can view published questions" ON public.questions;
CREATE POLICY "Students can view published questions"
ON public.questions
FOR SELECT
USING (
    status = 'published'
    AND (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'student'::public.app_role)
        OR auth.role() = 'authenticated'
    )
);

-- ========================================================================
-- 9. TRANSACTIONAL BULK QUESTION IMPORT RPC
-- ========================================================================
CREATE OR REPLACE FUNCTION public.bulk_import_questions_json(
    p_questions JSONB,
    p_auto_create_taxonomy BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id UUID;
    v_item JSONB;
    v_q_id UUID;
    v_subject_id UUID;
    v_topic_id UUID;
    v_subject_name TEXT;
    v_topic_name TEXT;
    v_subject_slug TEXT;
    v_topic_slug TEXT;
    v_options JSONB;
    v_opt JSONB;
    v_opt_order INT;
    v_inserted_count INT := 0;
    v_created_subjects INT := 0;
    v_created_topics INT := 0;
BEGIN
    v_admin_id := auth.uid();
    IF v_admin_id IS NULL OR NOT public.has_role(v_admin_id, 'admin'::public.app_role) THEN
        RAISE EXCEPTION 'Admin authorization required for bulk question import';
    END IF;

    IF jsonb_typeof(p_questions) <> 'array' THEN
        RAISE EXCEPTION 'p_questions must be a JSON array';
    END IF;

    -- Process each question inside the single transaction
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_questions)
    LOOP
        -- Reset loop variables
        v_subject_id := NULL;
        v_topic_id := NULL;
        v_subject_name := TRIM(COALESCE(v_item->>'subject', ''));
        v_topic_name := TRIM(COALESCE(v_item->>'topic', ''));

        -- Resolve subject
        IF v_subject_name <> '' THEN
            SELECT id INTO v_subject_id FROM public.subjects 
            WHERE LOWER(name) = LOWER(v_subject_name) OR LOWER(slug) = LOWER(v_subject_name)
            LIMIT 1;

            IF v_subject_id IS NULL AND p_auto_create_taxonomy THEN
                v_subject_slug := LOWER(REGEXP_REPLACE(v_subject_name, '[^a-zA-Z0-9]+', '-', 'g'));
                INSERT INTO public.subjects (name, slug, is_active, created_by)
                VALUES (v_subject_name, v_subject_slug, true, v_admin_id)
                RETURNING id INTO v_subject_id;
                v_created_subjects := v_created_subjects + 1;
            END IF;
        END IF;

        -- Resolve topic
        IF v_topic_name <> '' AND v_subject_id IS NOT NULL THEN
            SELECT id INTO v_topic_id FROM public.topics 
            WHERE subject_id = v_subject_id AND LOWER(name) = LOWER(v_topic_name)
            LIMIT 1;

            IF v_topic_id IS NULL AND p_auto_create_taxonomy THEN
                v_topic_slug := LOWER(REGEXP_REPLACE(v_topic_name, '[^a-zA-Z0-9]+', '-', 'g'));
                INSERT INTO public.topics (subject_id, name, slug, is_active, created_by)
                VALUES (v_subject_id, v_topic_name, v_topic_slug, true, v_admin_id)
                RETURNING id INTO v_topic_id;
                v_created_topics := v_created_topics + 1;
            END IF;
        END IF;

        -- Insert into questions
        INSERT INTO public.questions (
            question_text,
            explanation,
            subject_id,
            topic_id,
            difficulty,
            question_type,
            marks,
            negative_marks,
            language,
            source,
            year,
            status,
            created_by
        ) VALUES (
            v_item->>'question_text',
            NULLIF(TRIM(v_item->>'explanation'), ''),
            v_subject_id,
            v_topic_id,
            COALESCE(NULLIF(TRIM(v_item->>'difficulty'), ''), 'medium'),
            COALESCE(NULLIF(TRIM(v_item->>'question_type'), ''), 'mcq'),
            COALESCE((v_item->>'marks')::NUMERIC, 1),
            COALESCE((v_item->>'negative_marks')::NUMERIC, 0),
            COALESCE(NULLIF(TRIM(v_item->>'language'), ''), 'bn'),
            NULLIF(TRIM(v_item->>'source'), ''),
            NULLIF(v_item->>'year', '')::INTEGER,
            COALESCE(NULLIF(TRIM(v_item->>'status'), ''), 'published'),
            v_admin_id
        ) RETURNING id INTO v_q_id;

        -- Insert question options
        v_options := v_item->'options';
        IF v_options IS NOT NULL AND jsonb_typeof(v_options) = 'array' THEN
            v_opt_order := 1;
            FOR v_opt IN SELECT * FROM jsonb_array_elements(v_options)
            LOOP
                INSERT INTO public.question_options (
                    question_id,
                    option_text,
                    option_order,
                    is_correct
                ) VALUES (
                    v_q_id,
                    COALESCE(v_opt->>'option_text', ''),
                    COALESCE((v_opt->>'option_order')::INT, v_opt_order),
                    COALESCE((v_opt->>'is_correct')::BOOLEAN, false)
                );
                v_opt_order := v_opt_order + 1;
            END LOOP;
        END IF;

        v_inserted_count := v_inserted_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'inserted_count', v_inserted_count,
        'created_subjects', v_created_subjects,
        'created_topics', v_created_topics
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_import_questions_json(JSONB, BOOLEAN) TO authenticated;
