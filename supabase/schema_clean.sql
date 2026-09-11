-- ==============================================================================
-- PracticeKoro Clean Supabase Database Schema (Production Ready)
-- File: supabase/schema_clean.sql
-- Description:
--   Complete, streamlined schema for PracticeKoro exam platform.
--   Includes authentication triggers, profiles, user roles, exam engine,
--   mock tests, question bank, server-side scoring, mistakes notebook,
--   bookmarks, study notes, current affairs, VIP purchases, and RLS security.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS & CUSTOM TYPES
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'student', 'super_admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.approval_status_type AS ENUM ('pending', 'approved', 'rejected', 'deactivated', 'payment_locked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.test_type AS ENUM ('full_mock', 'topic_wise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    full_name TEXT,
    phone TEXT,
    whatsapp_number TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. USER ROLES TABLE
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role public.app_role NOT NULL DEFAULT 'student',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, role)
);

-- 5. APPROVAL STATUS TABLE
CREATE TABLE IF NOT EXISTS public.approval_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    status public.approval_status_type NOT NULL DEFAULT 'approved',
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Helper function: has_role (Security Definer, bypasses RLS safely)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND (role::text = _role OR (_role = 'admin' AND role = 'super_admin'))
    );
$$;

-- Trigger to automatically create profile, student role, and approval upon signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);

    -- Assign default student role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Default approved status for immediate access
    INSERT INTO public.approval_status (user_id, status)
    VALUES (NEW.id, 'approved')
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. EXAMS TABLE (WBP, WBCS, KP, SSC, Railway, etc.)
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. SUBJECTS TABLE
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. TOPICS TABLE
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. QUESTION BANK TABLE (Bilingual, PYQ, Tags, Options)
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL,
    subject TEXT,
    topic TEXT,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
    explanation TEXT,
    difficulty TEXT DEFAULT 'medium',
    year INTEGER,
    source TEXT,
    tags TEXT,
    subtopic TEXT,
    language TEXT DEFAULT 'bn' CHECK (language IN ('bn', 'en', 'mixed')),
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'review', 'approved', 'published', 'archived')),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questions_exam ON public.questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON public.questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_year ON public.questions(year);

-- 10. MOCK TESTS TABLE
CREATE TABLE IF NOT EXISTS public.mock_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    test_type public.test_type DEFAULT 'full_mock',
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    total_marks NUMERIC(6,2) NOT NULL DEFAULT 100,
    passing_marks NUMERIC(6,2) NOT NULL DEFAULT 40,
    negative_marking BOOLEAN DEFAULT FALSE,
    negative_marks_per_question NUMERIC(4,2) DEFAULT 0.25,
    shuffle_questions BOOLEAN DEFAULT TRUE,
    shuffle_options BOOLEAN DEFAULT FALSE,
    allow_retake BOOLEAN DEFAULT TRUE,
    retake_limit INTEGER DEFAULT 10,
    is_published BOOLEAN DEFAULT FALSE,
    is_paid BOOLEAN DEFAULT FALSE,
    price NUMERIC(8,2) DEFAULT 0,
    target_exam_name TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. TEST QUESTIONS JUNCTION TABLE
CREATE TABLE IF NOT EXISTS public.test_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES public.mock_tests(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    marks NUMERIC(5,2) DEFAULT 1.0,
    negative_marks NUMERIC(4,2) DEFAULT 0.25,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(test_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_test_questions_test ON public.test_questions(test_id);

-- 12. TEST ATTEMPTS & RESULTS TABLE
CREATE TABLE IF NOT EXISTS public.test_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES public.mock_tests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    score NUMERIC(6,2) DEFAULT 0,
    total_marks NUMERIC(6,2) DEFAULT 100,
    percentage NUMERIC(5,2) DEFAULT 0,
    passed BOOLEAN DEFAULT FALSE,
    correct_count INTEGER DEFAULT 0,
    wrong_count INTEGER DEFAULT 0,
    unanswered_count INTEGER DEFAULT 0,
    time_taken_seconds INTEGER DEFAULT 0,
    tab_violations INTEGER DEFAULT 0,
    fullscreen_violations INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_test_attempts_user ON public.test_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_test ON public.test_attempts(test_id);

-- 13. TEST INDIVIDUAL QUESTION ANSWERS
CREATE TABLE IF NOT EXISTS public.test_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    selected_answer TEXT,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    marks_obtained NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(attempt_id, question_id)
);

-- 14. STUDENT MISTAKES NOTEBOOK (ভুল খাতা)
CREATE TABLE IF NOT EXISTS public.student_mistakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    attempt_id UUID REFERENCES public.test_attempts(id) ON DELETE SET NULL,
    selected_answer TEXT,
    correct_answer TEXT NOT NULL,
    is_mastered BOOLEAN DEFAULT FALSE,
    retry_count INTEGER DEFAULT 0,
    last_attempted_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_student_mistakes_user ON public.student_mistakes(user_id, is_mastered);

-- 15. STUDENT BOOKMARKS TABLE
CREATE TABLE IF NOT EXISTS public.student_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_student_bookmarks_user ON public.student_bookmarks(user_id);

-- 16. DAILY PRACTICE & STREAKS
CREATE TABLE IF NOT EXISTS public.student_streaks (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE DEFAULT CURRENT_DATE,
    updated_at TIMESTAMPTZ DEFAULT now()
);

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

-- 17. CURRENT AFFAIRS TABLE (Bilingual Daily/Monthly Digest)
CREATE TABLE IF NOT EXISTS public.current_affairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL DEFAULT 'General',
    date_display TEXT NOT NULL,
    read_time TEXT DEFAULT '3 min read',
    title_bn TEXT NOT NULL,
    title_en TEXT NOT NULL,
    summary_bn TEXT NOT NULL,
    bullet_points JSONB DEFAULT '[]'::jsonb,
    exam_relevance TEXT DEFAULT 'WBCS, WBP, SSC, Railway',
    is_important BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_current_affairs_date ON public.current_affairs(created_at DESC);

-- 18. STUDY NOTES / PDFS TABLE
CREATE TABLE IF NOT EXISTS public.pdfs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    file_path TEXT,
    file_size INTEGER DEFAULT 0,
    content TEXT,
    is_paid BOOLEAN DEFAULT FALSE,
    price NUMERIC(8,2) DEFAULT 0,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 19. BLOG POSTS TABLE
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    summary TEXT,
    content TEXT,
    cover_image TEXT,
    author TEXT DEFAULT 'Practice Koro Editorial',
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 20. PURCHASES TABLE (VIP Pass & Paid Mock Test Purchases)
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('test', 'note', 'subscription')),
    content_id TEXT NOT NULL,
    amount NUMERIC(8,2) NOT NULL,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchases_user ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON public.purchases(status);

-- 21. SITE SETTINGS & NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Default Settings Seed
INSERT INTO public.site_settings (key, value)
VALUES 
    ('yearly_subscription_fee', '199'),
    ('maintenance_mode', 'false'),
    ('auto_approve_students', 'true'),
    ('openrouter_api_key', ''),
    ('openrouter_model', 'meta-llama/llama-3.1-405b-instruct:free')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id TEXT,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 22. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_practice_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_affairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are readable by authenticated users" ON public.profiles;
CREATE POLICY "Public profiles are readable by authenticated users"
ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
CREATE POLICY "Admins have full access to profiles"
ON public.profiles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- User Roles & Approval
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins have full access to user_roles" ON public.user_roles;
CREATE POLICY "Admins have full access to user_roles"
ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view their own approval status" ON public.approval_status;
CREATE POLICY "Users can view their own approval status"
ON public.approval_status FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins have full access to approval_status" ON public.approval_status;
CREATE POLICY "Admins have full access to approval_status"
ON public.approval_status FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Exams, Subjects, Topics
DROP POLICY IF EXISTS "Anyone can view active exams" ON public.exams;
CREATE POLICY "Anyone can view active exams"
ON public.exams FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage exams" ON public.exams;
CREATE POLICY "Admins manage exams"
ON public.exams FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can view active subjects" ON public.subjects;
CREATE POLICY "Anyone can view active subjects"
ON public.subjects FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage subjects" ON public.subjects;
CREATE POLICY "Admins manage subjects"
ON public.subjects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can view active topics" ON public.topics;
CREATE POLICY "Anyone can view active topics"
ON public.topics FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage topics" ON public.topics;
CREATE POLICY "Admins manage topics"
ON public.topics FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Questions
DROP POLICY IF EXISTS "Authenticated users can read published questions" ON public.questions;
CREATE POLICY "Authenticated users can read published questions"
ON public.questions FOR SELECT TO authenticated
USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage questions" ON public.questions;
CREATE POLICY "Admins manage questions"
ON public.questions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Mock Tests & Test Questions
DROP POLICY IF EXISTS "Anyone can view published tests" ON public.mock_tests;
CREATE POLICY "Anyone can view published tests"
ON public.mock_tests FOR SELECT
USING (is_published = true OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage mock tests" ON public.mock_tests;
CREATE POLICY "Admins manage mock tests"
ON public.mock_tests FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can read test questions for published tests" ON public.test_questions;
CREATE POLICY "Anyone can read test questions for published tests"
ON public.test_questions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.mock_tests m
        WHERE m.id = test_questions.test_id
          AND (m.is_published = true OR public.has_role(auth.uid(), 'admin'))
    )
);

DROP POLICY IF EXISTS "Admins manage test questions" ON public.test_questions;
CREATE POLICY "Admins manage test questions"
ON public.test_questions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Test Attempts & Answers
DROP POLICY IF EXISTS "Students manage their own test attempts" ON public.test_attempts;
CREATE POLICY "Students manage their own test attempts"
ON public.test_attempts FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all test attempts" ON public.test_attempts;
CREATE POLICY "Admins view all test attempts"
ON public.test_attempts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Students manage their own answers" ON public.test_answers;
CREATE POLICY "Students manage their own answers"
ON public.test_answers FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.test_attempts a
        WHERE a.id = test_answers.attempt_id AND a.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.test_attempts a
        WHERE a.id = test_answers.attempt_id AND a.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Admins view all answers" ON public.test_answers;
CREATE POLICY "Admins view all answers"
ON public.test_answers FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Student Mistakes, Bookmarks & Streaks
DROP POLICY IF EXISTS "Students manage their own mistakes" ON public.student_mistakes;
CREATE POLICY "Students manage their own mistakes"
ON public.student_mistakes FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all mistakes" ON public.student_mistakes;
CREATE POLICY "Admins view all mistakes"
ON public.student_mistakes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Students manage their own bookmarks" ON public.student_bookmarks;
CREATE POLICY "Students manage their own bookmarks"
ON public.student_bookmarks FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all bookmarks" ON public.student_bookmarks;
CREATE POLICY "Admins view all bookmarks"
ON public.student_bookmarks FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Students view and update their own streak" ON public.student_streaks;
CREATE POLICY "Students view and update their own streak"
ON public.student_streaks FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students manage their own daily practice" ON public.daily_practice_attempts;
CREATE POLICY "Students manage their own daily practice"
ON public.daily_practice_attempts FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Current Affairs, PDFs, Blogs, Settings
DROP POLICY IF EXISTS "Anyone can view published current affairs" ON public.current_affairs;
CREATE POLICY "Anyone can view published current affairs"
ON public.current_affairs FOR SELECT USING (is_published = true OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage current affairs" ON public.current_affairs;
CREATE POLICY "Admins manage current affairs"
ON public.current_affairs FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can view pdfs" ON public.pdfs;
CREATE POLICY "Anyone can view pdfs"
ON public.pdfs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage pdfs" ON public.pdfs;
CREATE POLICY "Admins manage pdfs"
ON public.pdfs FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can view published blogs" ON public.blog_posts;
CREATE POLICY "Anyone can view published blogs"
ON public.blog_posts FOR SELECT USING (is_published = true OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage blogs" ON public.blog_posts;
CREATE POLICY "Admins manage blogs"
ON public.blog_posts FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;
CREATE POLICY "Anyone can read site settings"
ON public.site_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage site settings" ON public.site_settings;
CREATE POLICY "Admins manage site settings"
ON public.site_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Purchases, Notifications, Chat, Audit
DROP POLICY IF EXISTS "Students view and create their own purchases" ON public.purchases;
CREATE POLICY "Students view and create their own purchases"
ON public.purchases FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all purchases" ON public.purchases;
CREATE POLICY "Admins view all purchases"
ON public.purchases FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users read and update their own notifications" ON public.notifications;
CREATE POLICY "Users read and update their own notifications"
ON public.notifications FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage notifications" ON public.notifications;
CREATE POLICY "Admins manage notifications"
ON public.notifications FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users read and write their own chat" ON public.chat_messages;
CREATE POLICY "Users read and write their own chat"
ON public.chat_messages FOR ALL TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins view audit logs" ON public.audit_logs;
CREATE POLICY "Admins view audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins can insert audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ==============================================================================
-- 23. CORE RPC FUNCTIONS (Server-Authoritative Test Scoring)
-- ==============================================================================
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
    v_passed BOOLEAN := FALSE;
    v_negative_val NUMERIC(4,2) := 0.00;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_test FROM public.mock_tests WHERE id = p_test_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Mock test not found';
    END IF;

    IF v_test.negative_marking IS TRUE THEN
        v_negative_val := COALESCE(v_test.negative_marks_per_question, 0.25);
    END IF;

    -- Create test attempt record
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
        FALSE,
        now() - (p_time_taken_seconds || ' seconds')::INTERVAL,
        now(),
        p_time_taken_seconds,
        p_tab_violations,
        p_fullscreen_violations,
        FALSE
    )
    RETURNING id INTO v_attempt_id;

    -- Calculate marks question by question
    FOR v_tq IN (
        SELECT 
            tq.question_id,
            COALESCE(tq.marks, 1.0) AS marks,
            q.correct_answer
        FROM public.test_questions tq
        JOIN public.questions q ON q.id = tq.question_id
        WHERE tq.test_id = p_test_id
    ) LOOP
        v_total_marks := v_total_marks + v_tq.marks;
        v_selected := p_answers->>v_tq.question_id::TEXT;

        IF v_selected IS NULL OR trim(v_selected) = '' THEN
            v_unanswered_count := v_unanswered_count + 1;
            v_marks_awarded := 0.00;
            v_is_correct := FALSE;
        ELSIF UPPER(trim(v_selected)) = UPPER(trim(v_tq.correct_answer)) THEN
            v_correct_count := v_correct_count + 1;
            v_marks_awarded := v_tq.marks;
            v_total_score := v_total_score + v_marks_awarded;
            v_is_correct := TRUE;
        ELSE
            v_wrong_count := v_wrong_count + 1;
            v_marks_awarded := -v_negative_val;
            v_total_score := v_total_score - v_negative_val;
            v_is_correct := FALSE;

            -- Auto-save into Mistakes Notebook
            INSERT INTO public.student_mistakes (
                user_id,
                question_id,
                attempt_id,
                selected_answer,
                correct_answer,
                is_mastered,
                last_attempted_at,
                updated_at
            ) VALUES (
                v_user_id,
                v_tq.question_id,
                v_attempt_id,
                v_selected,
                v_tq.correct_answer,
                FALSE,
                now(),
                now()
            )
            ON CONFLICT (user_id, question_id) DO UPDATE
            SET retry_count = public.student_mistakes.retry_count + 1,
                selected_answer = EXCLUDED.selected_answer,
                is_mastered = FALSE,
                last_attempted_at = now(),
                updated_at = now();
        END IF;

        -- Save answer detail
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
        )
        ON CONFLICT (attempt_id, question_id) DO UPDATE
        SET selected_answer = EXCLUDED.selected_answer,
            is_correct = EXCLUDED.is_correct,
            marks_obtained = EXCLUDED.marks_obtained;
    END LOOP;

    -- Update final attempt results
    IF v_total_marks > 0 THEN
        v_percentage := ROUND((GREATEST(v_total_score, 0) / v_total_marks) * 100, 2);
    ELSE
        v_percentage := 0.00;
    END IF;

    v_passed := (v_total_score >= COALESCE(v_test.passing_marks, 40));

    UPDATE public.test_attempts
    SET score = GREATEST(v_total_score, 0),
        total_marks = v_total_marks,
        percentage = v_percentage,
        passed = v_passed,
        correct_count = v_correct_count,
        wrong_count = v_wrong_count,
        unanswered_count = v_unanswered_count,
        is_active = FALSE
    WHERE id = v_attempt_id;

    RETURN jsonb_build_object(
        'attempt_id', v_attempt_id,
        'score', GREATEST(v_total_score, 0),
        'total_marks', v_total_marks,
        'percentage', v_percentage,
        'passed', v_passed,
        'correct_count', v_correct_count,
        'wrong_count', v_wrong_count,
        'unanswered_count', v_unanswered_count,
        'time_taken_seconds', p_time_taken_seconds
    );
END;
$$;

-- ==============================================================================
-- 24. PROMOTING ADMIN HELPER SCRIPT
-- ==============================================================================
-- To promote any user to Admin or Super Admin, run:
-- 
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'admin' FROM auth.users WHERE email = 'your-email@gmail.com'
-- ON CONFLICT (user_id, role) DO NOTHING;
-- 
-- UPDATE public.approval_status
-- SET status = 'approved'
-- WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@gmail.com');

-- ==============================================================================
-- 25. OPTIONAL SEED DATA (Default Exams & Core Subjects)
-- ==============================================================================
INSERT INTO public.exams (name, slug, description, order_index, is_active)
VALUES
    ('WBP Constable', 'wbp-constable', 'West Bengal Police Constable & Lady Constable Exam Preparation', 1, true),
    ('KP Constable', 'kp-constable', 'Kolkata Police Constable & Lady Constable Exam Preparation', 2, true),
    ('WBCS Prelims', 'wbcs-prelims', 'West Bengal Civil Service Executive & Allied Services Preliminary', 3, true),
    ('WBPSC Clerkship', 'wbpsc-clerkship', 'West Bengal Public Service Commission Clerkship Examination', 4, true),
    ('WBPSC Food SI', 'wbpsc-food-si', 'West Bengal Sub-Inspector of Food Examination', 5, true),
    ('SSC GD & MTS', 'ssc-gd-mts', 'Staff Selection Commission General Duty & Multi-Tasking Staff', 6, true),
    ('Railway RRB NTPC & Group D', 'railway-rrb', 'Railway Recruitment Board Non-Technical & Group D', 7, true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.subjects (name, slug, description, order_index, is_active)
VALUES
    ('General Knowledge & Current Affairs', 'general-knowledge', 'ইতিহাস, ভূগোল, সংবিধান, বিজ্ঞান এবং সাম্প্রতিক ঘটনাবলী', 1, true),
    ('Elementary Mathematics', 'mathematics', 'পাটিগণিত, বীজগণিত, অনুপাত ও শতকরা', 2, true),
    ('Reasoning & Logical Ability', 'reasoning', 'যুক্তি ও সাধারণ বুদ্ধিমত্তা', 3, true),
    ('English Grammar & Vocabulary', 'english', 'Grammar, Synonyms, Antonyms, One Word Substitution', 4, true),
    ('Bengali Language', 'bengali', 'বাংলা ব্যাকরণ ও সাহিত্য', 5, true)
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 26. STORAGE BUCKETS (Avatars & Blog Images)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('avatars', 'avatars', true),
    ('blog_images', 'blog_images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public avatar access" ON storage.objects;
CREATE POLICY "Public avatar access" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Public blog images access" ON storage.objects;
CREATE POLICY "Public blog images access" ON storage.objects FOR SELECT TO public USING (bucket_id = 'blog_images');

DROP POLICY IF EXISTS "Authenticated users upload blog images" ON storage.objects;
CREATE POLICY "Authenticated users upload blog images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'blog_images');

-- ==============================================================================
-- 27. INITIAL ADMIN & STUDENT ACCOUNT (Susanta Lohar)
-- ==============================================================================
DO $$
DECLARE
  v_user_id UUID := gen_random_uuid();
  v_email TEXT := 'susantalohr@gmail.com';
  v_password TEXT := 'practicekorp@2026';
BEGIN
  -- 1. Check if user already exists in auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
    UPDATE auth.users
    SET encrypted_password = crypt(v_password, gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now()
    WHERE id = v_user_id;
  ELSE
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud,
      confirmation_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      v_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Susanta Lohar"}'::jsonb,
      now(),
      now(),
      'authenticated',
      'authenticated',
      ''
    );
  END IF;

  -- 2. Profiles table
  INSERT INTO public.profiles (id, email, full_name, is_active, created_at, updated_at)
  VALUES (v_user_id, v_email, 'Susanta Lohar', true, now(), now())
  ON CONFLICT (id) DO UPDATE
  SET full_name = 'Susanta Lohar', is_active = true;

  -- 3. Roles: both Admin and Student!
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'student')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 4. Approval status: Approved
  INSERT INTO public.approval_status (user_id, status)
  VALUES (v_user_id, 'approved')
  ON CONFLICT (user_id) DO UPDATE
  SET status = 'approved';

END $$;


