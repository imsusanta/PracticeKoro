-- ============================================
-- 1. SUBJECTS TABLE
-- ============================================
CREATE TABLE subjects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- 2. TOPICS TABLE
-- ============================================
CREATE TABLE topics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subject_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE KEY unique_topic (subject_id, name)
);

-- ============================================
-- 3. QUESTION BANK TABLE (Core)
-- ============================================
CREATE TABLE question_bank (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subject_id INT NOT NULL,
    topic_id INT NULL,  -- Optional
    
    -- Question Content
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
    explanation TEXT,
    
    -- Metadata
    difficulty_level ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
    marks DECIMAL(5,2) DEFAULT 1.00,
    
    -- Optional Features
    tags VARCHAR(500),  -- Comma-separated: "algebra,formula,important"
    year INT,  -- Previous year question
    
    -- Usage Statistics
    times_used INT DEFAULT 0,  -- How many exams used this question
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL,
    
    -- Indexes for faster filtering
    INDEX idx_subject (subject_id),
    INDEX idx_topic (topic_id),
    INDEX idx_difficulty (difficulty_level),
    INDEX idx_active (is_active)
);

-- ============================================
-- 4. EXAMS TABLE
-- ============================================
CREATE TABLE exams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    exam_name VARCHAR(255) NOT NULL,
    exam_description TEXT,
    
    -- Exam Configuration
    total_marks DECIMAL(6,2) NOT NULL,
    duration INT NOT NULL,  -- in minutes
    
    -- Negative Marking
    negative_marking BOOLEAN DEFAULT FALSE,
    negative_marks_per_question DECIMAL(4,2) DEFAULT 0.00,
    
    -- Instructions
    instructions TEXT,
    
    -- Status
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    
    -- Scheduling (Optional)
    start_date DATETIME NULL,
    end_date DATETIME NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_status (status)
);

-- ============================================
-- 5. EXAM QUESTIONS TABLE (Junction/Pivot)
-- ============================================
CREATE TABLE exam_questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    exam_id INT NOT NULL,
    question_id INT NOT NULL,
    
    -- Question Order in Exam
    question_order INT NOT NULL,
    
    -- Exam-Specific Settings (Override question_bank defaults if needed)
    marks_for_this_exam DECIMAL(5,2) NULL,  -- NULL = use question_bank.marks
    negative_marks DECIMAL(4,2) NULL,  -- Question-specific negative marking
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES question_bank(id) ON DELETE CASCADE,
    UNIQUE KEY unique_exam_question (exam_id, question_id)
);

-- ============================================
-- 6. USERS TABLE
-- ============================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- 7. STUDENT ATTEMPTS TABLE
-- ============================================
CREATE TABLE student_attempts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    exam_id INT NOT NULL,
    
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    
    score_obtained DECIMAL(6,2) DEFAULT 0.00,
    status ENUM('ongoing', 'completed', 'abandoned') DEFAULT 'ongoing',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    
    INDEX idx_user_exam (user_id, exam_id),
    INDEX idx_status (status)
);

-- ============================================
-- 8. STUDENT RESPONSES TABLE
-- ============================================
CREATE TABLE student_responses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    attempt_id INT NOT NULL,
    question_id INT NOT NULL,
    
    selected_option CHAR(1) NULL CHECK (selected_option IN ('A', 'B', 'C', 'D')),
    is_correct BOOLEAN,
    marks_awarded DECIMAL(5,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (attempt_id) REFERENCES student_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES question_bank(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_attempt_question (attempt_id, question_id)
);
