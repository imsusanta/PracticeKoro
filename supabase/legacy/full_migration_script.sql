-- ============================================================
-- PRACTICE KORO - FULL DATABASE MIGRATION SCRIPT
-- Generated: 2026-01-23
-- ============================================================
-- This script contains:
-- 1. ENUMS
-- 2. TABLES (with all columns)
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- 4. DATABASE FUNCTIONS
-- 5. TRIGGERS
-- 6. STORAGE BUCKETS
-- 7. DATA (INSERT statements)
-- ============================================================

-- =====================
-- PART 1: ENUMS
-- =====================

CREATE TYPE public.app_role AS ENUM ('admin', 'student', 'instructor');

CREATE TYPE public.approval_status_type AS ENUM ('pending', 'approved', 'rejected', 'deactivated', 'payment_locked');

CREATE TYPE public.test_type AS ENUM ('full_mock', 'topic_wise');

-- =====================
-- PART 2: TABLES
-- =====================

-- Profiles Table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    whatsapp_number TEXT,
    age INTEGER,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User Roles Table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Approval Status Table
CREATE TABLE public.approval_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    status approval_status_type NOT NULL DEFAULT 'pending',
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Exams Table
CREATE TABLE public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Subjects Table
CREATE TABLE public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    exam_id UUID REFERENCES public.exams(id),
    category TEXT DEFAULT 'notes',
    order_index INTEGER DEFAULT 0,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Topics Table
CREATE TABLE public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    subject_id UUID NOT NULL REFERENCES public.subjects(id),
    category TEXT DEFAULT 'notes',
    content TEXT,
    order_index INTEGER DEFAULT 0,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Questions Table
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    subject TEXT,
    topic TEXT,
    exam_id UUID NOT NULL REFERENCES public.exams(id),
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Mock Tests Table
CREATE TABLE public.mock_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    exam_id UUID NOT NULL REFERENCES public.exams(id),
    test_type test_type NOT NULL,
    duration_minutes INTEGER NOT NULL,
    passing_marks INTEGER NOT NULL,
    total_marks INTEGER NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT false,
    shuffle_questions BOOLEAN DEFAULT false,
    shuffle_options BOOLEAN DEFAULT false,
    allow_retake BOOLEAN DEFAULT true,
    retake_limit INTEGER DEFAULT 0,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Test Questions Table (Junction)
CREATE TABLE public.test_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES public.mock_tests(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    question_order INTEGER NOT NULL,
    marks INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Test Attempts Table
CREATE TABLE public.test_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES public.mock_tests(id),
    user_id UUID NOT NULL,
    score INTEGER NOT NULL,
    total_marks INTEGER NOT NULL,
    percentage NUMERIC NOT NULL,
    passed BOOLEAN NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    is_active BOOLEAN DEFAULT false,
    time_taken_seconds INTEGER,
    correct_count INTEGER DEFAULT 0,
    wrong_count INTEGER DEFAULT 0,
    unanswered_count INTEGER DEFAULT 0,
    tab_violations INTEGER DEFAULT 0,
    fullscreen_violations INTEGER DEFAULT 0,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Test Answers Table
CREATE TABLE public.test_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id),
    selected_answer TEXT,
    is_correct BOOLEAN NOT NULL,
    marks_obtained INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Test Answer Drafts Table
CREATE TABLE public.test_answer_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES public.mock_tests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    question_id UUID NOT NULL REFERENCES public.questions(id),
    selected_answer TEXT,
    marked_for_review BOOLEAN DEFAULT false,
    last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Test Timers Table
CREATE TABLE public.test_timers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES public.mock_tests(id),
    user_id UUID NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    duration_minutes INTEGER NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- PDFs Table
CREATE TABLE public.pdfs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    file_path TEXT,
    file_size BIGINT,
    content TEXT,
    exam_id UUID REFERENCES public.exams(id),
    subject_id UUID REFERENCES public.subjects(id),
    topic_id UUID REFERENCES public.topics(id),
    uploaded_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Courses Table
CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    exam_id UUID REFERENCES public.exams(id),
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Course Materials Table
CREATE TABLE public.course_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    uploaded_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Notifications Table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Chat Messages Table
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id),
    sender_id UUID NOT NULL,
    sender_role TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Certificates Table
CREATE TABLE public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    test_id UUID NOT NULL REFERENCES public.mock_tests(id),
    attempt_id UUID NOT NULL REFERENCES public.test_attempts(id),
    certificate_number TEXT NOT NULL,
    certificate_data JSONB,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Audit Logs Table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Blog Posts Table
CREATE TABLE public.blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    excerpt TEXT,
    content TEXT,
    image_url TEXT,
    author TEXT DEFAULT 'Admin',
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now())
);

-- Site Settings Table
CREATE TABLE public.site_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================
-- PART 3: DATABASE FUNCTIONS
-- =====================

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- handle_new_user function (creates profile on signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, whatsapp_number, age)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'whatsapp_number',
    (NEW.raw_user_meta_data->>'age')::integer
  );
  
  -- Create student role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  -- Create approval status entry
  INSERT INTO public.approval_status (user_id, status)
  VALUES (NEW.id, 'pending');
  
  RETURN NEW;
END;
$$;

-- generate_certificate_number function
CREATE OR REPLACE FUNCTION public.generate_certificate_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cert_number TEXT;
BEGIN
  cert_number := 'CERT-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN cert_number;
END;
$$;

-- =====================
-- PART 4: TRIGGERS
-- =====================

-- Auto-update timestamps
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mock_tests_updated_at BEFORE UPDATE ON public.mock_tests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_approval_status_updated_at BEFORE UPDATE ON public.approval_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================
-- PART 5: ENABLE RLS ON ALL TABLES
-- =====================

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
ALTER TABLE public.test_answer_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- =====================
-- PART 6: RLS POLICIES
-- =====================

-- PROFILES POLICIES
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- USER_ROLES POLICIES
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- APPROVAL_STATUS POLICIES
CREATE POLICY "Students can view their own approval status" ON public.approval_status FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all approval statuses" ON public.approval_status FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update approval statuses" ON public.approval_status FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- EXAMS POLICIES
CREATE POLICY "Approved students can view active exams" ON public.exams FOR SELECT USING (
    is_active = true AND (
        has_role(auth.uid(), 'admin') OR 
        (has_role(auth.uid(), 'student') AND EXISTS (
            SELECT 1 FROM approval_status WHERE user_id = auth.uid() AND status = 'approved'
        ))
    )
);
CREATE POLICY "public_read_exams" ON public.exams FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can insert exams" ON public.exams FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update exams" ON public.exams FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete exams" ON public.exams FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- SUBJECTS POLICIES
CREATE POLICY "Admins can view subjects" ON public.subjects FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Approved students can view subjects" ON public.subjects FOR SELECT USING (
    has_role(auth.uid(), 'student') AND EXISTS (
        SELECT 1 FROM approval_status WHERE user_id = auth.uid() AND status = 'approved'
    )
);
CREATE POLICY "Admins can insert subjects" ON public.subjects FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update subjects" ON public.subjects FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete subjects" ON public.subjects FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- TOPICS POLICIES
CREATE POLICY "Admins can view topics" ON public.topics FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Approved students can view topics" ON public.topics FOR SELECT USING (
    has_role(auth.uid(), 'student') AND EXISTS (
        SELECT 1 FROM approval_status WHERE user_id = auth.uid() AND status = 'approved'
    )
);
CREATE POLICY "Admins can insert topics" ON public.topics FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update topics" ON public.topics FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete topics" ON public.topics FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- QUESTIONS POLICIES
CREATE POLICY "Admins can view all questions" ON public.questions FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Approved students can view questions in published tests" ON public.questions FOR SELECT USING (
    has_role(auth.uid(), 'admin') OR (
        has_role(auth.uid(), 'student') AND 
        EXISTS (SELECT 1 FROM approval_status WHERE user_id = auth.uid() AND status = 'approved') AND
        EXISTS (
            SELECT 1 FROM test_questions tq
            JOIN mock_tests mt ON mt.id = tq.test_id
            WHERE tq.question_id = questions.id AND mt.is_published = true
        )
    )
);
CREATE POLICY "Admins can insert questions" ON public.questions FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update questions" ON public.questions FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete questions" ON public.questions FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- MOCK_TESTS POLICIES
CREATE POLICY "Admins can view all tests" ON public.mock_tests FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Approved students can view published tests" ON public.mock_tests FOR SELECT USING (
    is_published = true AND (
        has_role(auth.uid(), 'admin') OR (
            has_role(auth.uid(), 'student') AND 
            EXISTS (SELECT 1 FROM approval_status WHERE user_id = auth.uid() AND status = 'approved')
        )
    )
);
CREATE POLICY "public_read_mock_tests" ON public.mock_tests FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can insert tests" ON public.mock_tests FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update tests" ON public.mock_tests FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete tests" ON public.mock_tests FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- TEST_QUESTIONS POLICIES
CREATE POLICY "Approved students can view test questions for published tests" ON public.test_questions FOR SELECT USING (
    EXISTS (SELECT 1 FROM mock_tests WHERE id = test_questions.test_id AND is_published = true) AND (
        has_role(auth.uid(), 'admin') OR (
            has_role(auth.uid(), 'student') AND 
            EXISTS (SELECT 1 FROM approval_status WHERE user_id = auth.uid() AND status = 'approved')
        )
    )
);
CREATE POLICY "Admins can insert test questions" ON public.test_questions FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete test questions" ON public.test_questions FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- TEST_ATTEMPTS POLICIES
CREATE POLICY "Students can view their own attempts" ON public.test_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all attempts" ON public.test_attempts FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Approved students can insert their own attempts" ON public.test_attempts FOR INSERT WITH CHECK (
    auth.uid() = user_id AND EXISTS (
        SELECT 1 FROM approval_status WHERE user_id = auth.uid() AND status = 'approved'
    )
);

-- TEST_ANSWERS POLICIES
CREATE POLICY "Students can view their own answers" ON public.test_answers FOR SELECT USING (
    EXISTS (SELECT 1 FROM test_attempts WHERE id = test_answers.attempt_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can view all answers" ON public.test_answers FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can insert their own answers" ON public.test_answers FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM test_attempts WHERE id = test_answers.attempt_id AND user_id = auth.uid())
);

-- TEST_ANSWER_DRAFTS POLICIES
CREATE POLICY "Students can view their own answer drafts" ON public.test_answer_drafts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Students can insert their own answer drafts" ON public.test_answer_drafts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Students can update their own answer drafts" ON public.test_answer_drafts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Students can delete their own answer drafts" ON public.test_answer_drafts FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all answer drafts" ON public.test_answer_drafts FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- TEST_TIMERS POLICIES
CREATE POLICY "Students can view their own test timers" ON public.test_timers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all test timers" ON public.test_timers FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can insert their own test timers" ON public.test_timers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Students can delete their own test timers" ON public.test_timers FOR DELETE USING (auth.uid() = user_id);

-- PDFS POLICIES
CREATE POLICY "Approved students can view PDFs" ON public.pdfs FOR SELECT USING (
    has_role(auth.uid(), 'admin') OR (
        has_role(auth.uid(), 'student') AND 
        EXISTS (SELECT 1 FROM approval_status WHERE user_id = auth.uid() AND status = 'approved')
    )
);
CREATE POLICY "Admins can insert PDFs" ON public.pdfs FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update PDFs" ON public.pdfs FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete PDFs" ON public.pdfs FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- COURSES POLICIES
CREATE POLICY "Approved students can view active courses" ON public.courses FOR SELECT USING (
    is_active = true AND (
        has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'instructor') OR (
            has_role(auth.uid(), 'student') AND 
            EXISTS (SELECT 1 FROM approval_status WHERE user_id = auth.uid() AND status = 'approved')
        )
    )
);
CREATE POLICY "Admins and instructors can manage courses" ON public.courses FOR ALL USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'instructor')
);

-- COURSE_MATERIALS POLICIES
CREATE POLICY "Students can view materials" ON public.course_materials FOR SELECT USING (
    EXISTS (SELECT 1 FROM courses WHERE id = course_materials.course_id AND is_active = true) AND (
        has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'instructor') OR (
            has_role(auth.uid(), 'student') AND 
            EXISTS (SELECT 1 FROM approval_status WHERE user_id = auth.uid() AND status = 'approved')
        )
    )
);
CREATE POLICY "Admins and instructors can manage materials" ON public.course_materials FOR ALL USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'instructor')
);

-- NOTIFICATIONS POLICIES
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert notifications" ON public.notifications FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'instructor')
);

-- CHAT_MESSAGES POLICIES
CREATE POLICY "Allow all select" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.chat_messages FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON public.chat_messages FOR DELETE USING (true);

-- CERTIFICATES POLICIES
CREATE POLICY "Users can view their own certificates" ON public.certificates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all certificates" ON public.certificates FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert certificates" ON public.certificates FOR INSERT WITH CHECK (auth.uid() = user_id);

-- AUDIT_LOGS POLICIES
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- BLOG_POSTS POLICIES
CREATE POLICY "Anyone can read published blog posts" ON public.blog_posts FOR SELECT USING (is_published = true);
CREATE POLICY "Authenticated users can manage blog posts" ON public.blog_posts FOR ALL USING (true) WITH CHECK (true);

-- SITE_SETTINGS POLICIES
CREATE POLICY "Public read site_settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage site_settings" ON public.site_settings FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- =====================
-- PART 7: STORAGE BUCKETS
-- =====================

INSERT INTO storage.buckets (id, name, public) VALUES ('pdfs_library', 'pdfs_library', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('study-materials', 'study-materials', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('course-materials', 'course-materials', false) ON CONFLICT (id) DO NOTHING;

-- Storage policies for pdfs_library
CREATE POLICY "Admins can upload to pdfs_library" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'pdfs_library' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update pdfs_library" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'pdfs_library' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete from pdfs_library" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'pdfs_library' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Library PDFs are accessible to authenticated users" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'pdfs_library');

-- ============================================================
-- PART 8: DATA INSERT STATEMENTS
-- ============================================================

-- NOTE: Replace 'YOUR_ADMIN_USER_ID' with your actual admin user ID after creating the admin user

-- EXAMS DATA
INSERT INTO public.exams (id, name, description, is_active, created_by, created_at, updated_at) VALUES
('d3b9360e-a02c-411d-8562-e2b7a53f4ab9', 'WBSSC Group D&C', NULL, true, '5384c730-f930-4fc6-9acb-189b12775a39', '2025-12-02 10:41:23.133578+00', '2025-12-04 02:04:23.03623+00'),
('a2d1a83d-09fe-4632-a4e8-d9364c9ea8a6', 'WBSSC Group C', NULL, true, '5384c730-f930-4fc6-9acb-189b12775a39', '2025-12-03 06:27:26.390998+00', '2025-12-04 02:05:26.680611+00'),
('8f1eac7a-dbe7-403c-b65e-4b571e071907', 'WBSSC Group D', NULL, true, '5384c730-f930-4fc6-9acb-189b12775a39', '2025-12-04 02:05:16.60889+00', '2025-12-04 02:05:16.60889+00');

-- SUBJECTS DATA
INSERT INTO public.subjects (id, name, description, exam_id, category, order_index, created_by, created_at, updated_at) VALUES
('cb4de576-64e0-4edf-94e7-ac7918a82f4a', 'History', NULL, 'd3b9360e-a02c-411d-8562-e2b7a53f4ab9', 'questions', 1, '5384c730-f930-4fc6-9acb-189b12775a39', '2026-01-05 13:22:56.392597+00', '2026-01-20 03:51:52.374858+00'),
('ec43939e-7528-479e-a2f6-8b37349ff3ba', 'Biology', NULL, NULL, 'notes', 1, '5384c730-f930-4fc6-9acb-189b12775a39', '2026-01-05 15:23:18.314655+00', '2026-01-21 19:36:37.634799+00'),
('91f83deb-26aa-43f6-aa3e-5991044c5c62', 'Chemistry', NULL, NULL, 'notes', 2, '5384c730-f930-4fc6-9acb-189b12775a39', '2026-01-05 15:23:53.278689+00', '2026-01-21 19:36:37.82714+00'),
('c3cb6ca0-e180-405c-a385-6bbf5e500569', 'Geography', NULL, NULL, 'questions', 2, '5384c730-f930-4fc6-9acb-189b12775a39', '2026-01-05 14:18:47.569631+00', '2026-01-20 03:51:52.643338+00'),
('a2bed4cb-63e7-47f0-94c1-750c930dbd52', 'Biology', NULL, NULL, 'questions', 3, '5384c730-f930-4fc6-9acb-189b12775a39', '2026-01-20 03:51:38.654073+00', '2026-01-20 03:51:52.926708+00'),
('b9aea1fe-d79f-4f6f-a4d8-e4bc5640cacf', 'Physics', NULL, NULL, 'notes', 3, '5384c730-f930-4fc6-9acb-189b12775a39', '2026-01-05 15:23:31.715384+00', '2026-01-21 19:36:38.00928+00'),
('ef352843-5b28-49b3-bb86-62b1850d6bdd', 'History', NULL, NULL, 'notes', 4, '5384c730-f930-4fc6-9acb-189b12775a39', '2026-01-05 15:24:01.954688+00', '2026-01-21 19:36:38.191155+00'),
('8fd42b25-678a-4484-8c38-fa46ff8b1565', 'Indian Constitute', NULL, NULL, 'questions', 4, '5384c730-f930-4fc6-9acb-189b12775a39', '2026-01-05 14:45:00.778039+00', '2026-01-20 03:51:53.174384+00'),
('b740e77e-ba23-4aef-96ec-caaa5a06cdab', 'Group D Practice Set', NULL, '8f1eac7a-dbe7-403c-b65e-4b571e071907', 'questions', 5, '5384c730-f930-4fc6-9acb-189b12775a39', '2026-01-13 14:34:38.124516+00', '2026-01-20 03:51:53.45552+00'),
('4a685f1a-7dd1-47cd-8239-a3eeab321c18', 'Geogrpahy', NULL, NULL, 'notes', 5, '5384c730-f930-4fc6-9acb-189b12775a39', '2026-01-05 15:24:09.683898+00', '2026-01-21 19:36:38.383581+00'),
('8fee5a2e-df5e-478c-a657-90d118a88e06', 'Computer', NULL, NULL, 'notes', 6, '5384c730-f930-4fc6-9acb-189b12775a39', '2026-01-05 15:24:33.148365+00', '2026-01-21 19:36:38.565316+00'),
('b9859ac6-f0e0-4f96-82b7-535c7087e55e', 'General awarness', NULL, NULL, 'notes', 7, '5384c730-f930-4fc6-9acb-189b12775a39', '2026-01-05 15:24:57.980671+00', '2026-01-21 19:36:38.742988+00');

-- TOPICS DATA
INSERT INTO public.topics (id, name, description, subject_id, category, content, order_index, created_by, created_at, updated_at) VALUES
('bc6acd2c-bf8d-47ab-8aa3-0c440cb34d16', 'Indus Valley Civilization', NULL, 'cb4de576-64e0-4edf-94e7-ac7918a82f4a', 'questions', NULL, 0, '5384c730-f930-4fc6-9acb-189b12775a39', '2026-01-05 13:22:57.030694+00', '2026-01-05 14:25:00.734774+00'),
('7e4d5134-84ac-4235-b70a-87f27be6f170', 'Famous Monuments in India', NULL, 'cb4de576-64e0-4edf-94e7-ac7918a82f4a', 'questions', NULL, 0, '5384c730-f930-4fc6-9acb-189b12775a39', '2026-01-05 14:44:03.934916+00', '2026-01-05 14:44:03.934916+00'),
('9cb18f78-066c-4254-b6c9-044775aa5906', 'সংবিধানের বৈশিষ্ট্য', NULL, '8fd42b25-678a-4484-8c38-fa46ff8b1565', 'questions', NULL, 0, '5384c730-f930-4fc6-9acb-189b12775a39', '2026-01-05 15:28:03.175961+00', '2026-01-05 15:28:03.175961+00'),
('a6144bb5-dd5c-4776-879b-50b227dbc9ef', 'Framing of the Constitution', NULL, '8fd42b25-678a-4484-8c38-fa46ff8b1565', 'questions', NULL, 0, '5384c730-f930-4fc6-9acb-189b12775a39', '2026-01-05 16:07:34.771344+00', '2026-01-05 16:07:34.771344+00'),
('db5013e7-cd1a-40ae-a393-2e206fedbbad', 'Group D Practice Set 3', NULL, 'b740e77e-ba23-4aef-96ec-caaa5a06cdab', 'questions', NULL, 0, '5384c730-f930-4fc6-9acb-189b12775a39', '2026-01-13 14:34:38.839294+00', '2026-01-13 14:34:38.839294+00'),
('5d79b99b-432f-4ffc-9894-4a263f2eb672', 'Group D Practice Set 01', NULL, 'b740e77e-ba23-4aef-96ec-caaa5a06cdab', 'questions', NULL, 0, '5384c730-f930-4fc6-9acb-189b12775a39', '2026-01-13 16:42:38.420586+00', '2026-01-13 16:42:38.420586+00'),
('af74ea96-863e-4a67-8bcc-b1f2e6950793', 'Group D Practice Set 02', NULL, 'b740e77e-ba23-4aef-96ec-caaa5a06cdab', 'questions', NULL, 0, '5384c730-f930-4fc6-9acb-189b12775a39', '2026-01-13 16:43:10.418765+00', '2026-01-13 16:43:10.418765+00'),
('1631e7ab-2215-4aa7-9373-cfd19608e17d', 'Blood', NULL, 'a2bed4cb-63e7-47f0-94c1-750c930dbd52', 'questions', NULL, 0, '5384c730-f930-4fc6-9acb-189b12775a39', '2026-01-20 03:52:09.299513+00', '2026-01-20 03:52:09.299513+00'),
('63e9c46e-06d3-4a3b-b252-080e13c9556d', 'সংবিধানের পটভূমি ও উৎস', NULL, '8fd42b25-678a-4484-8c38-fa46ff8b1565', 'questions', NULL, 0, '5384c730-f930-4fc6-9acb-189b12775a39', '2026-01-20 19:19:14.790223+00', '2026-01-20 19:19:14.790223+00');

-- MOCK TESTS DATA
INSERT INTO public.mock_tests (id, title, description, exam_id, test_type, duration_minutes, passing_marks, total_marks, is_published, shuffle_questions, shuffle_options, allow_retake, retake_limit, created_by, created_at, updated_at) VALUES
('83cd295d-ff70-415d-bad9-9a16a6ecd35d', 'সংবিধানের পটভূমি ও উৎস (Background of Constitution)', NULL, 'd3b9360e-a02c-411d-8562-e2b7a53f4ab9', 'topic_wise', 15, 6, 25, true, false, false, true, 0, '5384c730-f930-4fc6-9acb-189b12775a39', '2025-12-03 06:37:17.954969+00', '2025-12-03 06:37:34.106155+00'),
('14f2c3c9-eb8f-4c6c-9e1b-e4ced3a4843b', 'হরপ্পা সভ্যতা (Indus Valley Civilization)', NULL, 'd3b9360e-a02c-411d-8562-e2b7a53f4ab9', 'topic_wise', 25, 12, 30, true, false, false, true, 0, '5384c730-f930-4fc6-9acb-189b12775a39', '2025-12-04 02:56:04.001543+00', '2025-12-04 02:56:12.427152+00'),
('7317d68b-9764-403d-bc68-e23139c3a275', 'সংবিধান প্রণয়ন', NULL, 'd3b9360e-a02c-411d-8562-e2b7a53f4ab9', 'topic_wise', 15, 6, 15, true, false, false, true, 0, '5384c730-f930-4fc6-9acb-189b12775a39', '2025-12-04 14:25:39.047916+00', '2025-12-04 14:25:43.126016+00'),
('8d4667d7-69fb-4b22-91ba-6195c649e48f', 'সংবিধানের বৈশিষ্ট্য', NULL, 'd3b9360e-a02c-411d-8562-e2b7a53f4ab9', 'topic_wise', 20, 8, 20, true, false, false, true, 0, '5384c730-f930-4fc6-9acb-189b12775a39', '2025-12-04 14:28:16.335515+00', '2025-12-20 11:07:14.528204+00'),
('2aa81274-fc70-447b-8d5c-a0e7bfeb9631', 'Famous Monuments in india', NULL, 'd3b9360e-a02c-411d-8562-e2b7a53f4ab9', 'topic_wise', 15, 4, 10, true, false, false, true, 0, '5384c730-f930-4fc6-9acb-189b12775a39', '2025-12-09 06:49:09.336354+00', '2026-01-04 15:51:31.025393+00'),
('ff0218c7-ec6a-4917-9dfc-859e1f174149', 'Indus Valley Civilization Mock Test Part 01', NULL, 'd3b9360e-a02c-411d-8562-e2b7a53f4ab9', 'topic_wise', 20, 6, 25, true, false, false, true, 0, '5384c730-f930-4fc6-9acb-189b12775a39', '2026-01-04 17:21:39.087664+00', '2026-01-04 17:21:56.255284+00'),
('84193ae6-6b9e-4156-9010-df2cbcc2a8b8', 'Indus Valley Civilization Mock Test Part 02', NULL, 'd3b9360e-a02c-411d-8562-e2b7a53f4ab9', 'topic_wise', 20, 9, 25, true, false, false, true, 0, '5384c730-f930-4fc6-9acb-189b12775a39', '2026-01-04 17:29:33.569969+00', '2026-01-04 17:29:38.365386+00'),
('9592c585-c25c-4e80-bc53-2de17499927a', 'Group D Full Mock Test 1', NULL, '8f1eac7a-dbe7-403c-b65e-4b571e071907', 'full_mock', 90, 30, 40, true, false, false, true, 0, '5384c730-f930-4fc6-9acb-189b12775a39', '2026-01-04 19:38:34.585084+00', '2026-01-05 17:21:45.131329+00'),
('4014e912-69a4-451b-88e5-6a307c144c03', 'Group D Full Mock Test 2', NULL, 'd3b9360e-a02c-411d-8562-e2b7a53f4ab9', 'full_mock', 60, 30, 40, true, false, false, true, 0, '5384c730-f930-4fc6-9acb-189b12775a39', '2026-01-14 12:41:14.181641+00', '2026-01-14 12:41:17.6986+00');

-- SITE_SETTINGS DATA
INSERT INTO public.site_settings (key, value, updated_at) VALUES
('openrouter_api_key', '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', '2026-01-21 16:51:11.725727+00'),
('openrouter_model', 'mistralai/devstral-2512:free', '2026-01-21 16:51:11.725727+00');

-- PDFS DATA
INSERT INTO public.pdfs (id, title, file_path, file_size, content, exam_id, subject_id, topic_id, uploaded_by, created_at) VALUES
('e111949b-6d5d-4230-8f56-27f2e25994b3', 'প্রাচীন ভারতের ইতিহাস প্রশ্ন উত্তর.pdf', 'https://tbxqueyivslrmapwmsvx.supabase.co/storage/v1/object/public/pdfs_library/5384c730-f930-4fc6-9acb-189b12775a39/1769015438591__.pdf', 368850, NULL, NULL, NULL, NULL, '5384c730-f930-4fc6-9acb-189b12775a39', '2026-01-21 17:10:40.169099+00'),
('f7214bfe-f927-44cf-a7ae-83992704cd10', 'Generated Questions - Practice Koro.pdf', 'https://tbxqueyivslrmapwmsvx.supabase.co/storage/v1/object/public/pdfs_library/5384c730-f930-4fc6-9acb-189b12775a39/1769023225434_Generated_Questions_Practice_Koro.pdf', 304363, NULL, NULL, NULL, NULL, '5384c730-f930-4fc6-9acb-189b12775a39', '2026-01-21 19:20:27.297808+00');

-- ============================================================
-- NOTE: Questions and Test_Questions data are too large to include here
-- Use the Lovable Cloud UI to export these tables as CSV/JSON
-- Then use appropriate import tools in your new Supabase project
-- ============================================================

-- END OF MIGRATION SCRIPT
