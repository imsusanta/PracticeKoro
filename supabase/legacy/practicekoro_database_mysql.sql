-- ============================================
-- PracticeKoro Database Schema for MySQL/phpMyAdmin
-- Compatible with MySQL 5.7+ / MariaDB 10.3+
-- Generated on: 2024-12-20
-- ============================================

-- Set character encoding
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- DATABASE CREATION
-- ============================================
CREATE DATABASE IF NOT EXISTS `practicekoro` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `practicekoro`;

-- ============================================
-- TABLES
-- ============================================

-- --------------------------------------------
-- Table: users (Main authentication table)
-- --------------------------------------------
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------
-- Table: profiles (User profile information)
-- --------------------------------------------
CREATE TABLE `profiles` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(255),
    `full_name` VARCHAR(255),
    `whatsapp_number` VARCHAR(15) UNIQUE,
    `age` INT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `profiles_id_fkey` FOREIGN KEY (`id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    CONSTRAINT `valid_age` CHECK (`age` IS NULL OR (`age` >= 5 AND `age` <= 120)),
    CONSTRAINT `valid_whatsapp_number` CHECK (`whatsapp_number` IS NULL OR `whatsapp_number` REGEXP '^[0-9]{10}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------
-- Table: user_roles (Role assignment)
-- --------------------------------------------
CREATE TABLE `user_roles` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `user_id` CHAR(36) NOT NULL,
    `role` ENUM('admin', 'student') NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `user_roles_user_id_role_key` (`user_id`, `role`),
    CONSTRAINT `fk_user_roles_user_id` FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------
-- Table: approval_status (Student approval tracking)
-- --------------------------------------------
CREATE TABLE `approval_status` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `user_id` CHAR(36) NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected', 'payment_locked') NOT NULL DEFAULT 'pending',
    `reviewed_by` CHAR(36),
    `reviewed_at` TIMESTAMP NULL,
    `expires_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `approval_status_user_id_key` (`user_id`),
    CONSTRAINT `approval_status_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    CONSTRAINT `approval_status_reviewed_by_fkey` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------
-- Table: exams (Exam categories like WBCS, SSC, etc.)
-- --------------------------------------------
CREATE TABLE `exams` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `created_by` CHAR(36) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `exams_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------
-- Table: mock_tests (Individual mock tests)
-- --------------------------------------------
CREATE TABLE `mock_tests` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `exam_id` CHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `test_type` ENUM('full_mock', 'topic_wise') NOT NULL,
    `duration_minutes` INT NOT NULL,
    `passing_marks` INT NOT NULL,
    `total_marks` INT NOT NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT FALSE,
    `shuffle_questions` BOOLEAN DEFAULT FALSE,
    `shuffle_options` BOOLEAN DEFAULT FALSE,
    `allow_retake` BOOLEAN DEFAULT TRUE,
    `retake_limit` INT DEFAULT 0,
    `created_by` CHAR(36) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `mock_tests_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE,
    CONSTRAINT `mock_tests_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------
-- Table: pdfs (Study materials)
-- --------------------------------------------
CREATE TABLE `pdfs` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `exam_id` CHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `file_size` BIGINT,
    `uploaded_by` CHAR(36) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `pdfs_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE,
    CONSTRAINT `pdfs_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------
-- Table: questions (Question bank)
-- --------------------------------------------
CREATE TABLE `questions` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `exam_id` CHAR(36) NOT NULL,
    `question_text` TEXT NOT NULL,
    `option_a` TEXT NOT NULL,
    `option_b` TEXT NOT NULL,
    `option_c` TEXT NOT NULL,
    `option_d` TEXT NOT NULL,
    `correct_answer` CHAR(1) NOT NULL,
    `subject` VARCHAR(100),
    `topic` VARCHAR(100),
    `explanation` TEXT,
    `created_by` CHAR(36) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `questions_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE CASCADE,
    CONSTRAINT `questions_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
    CONSTRAINT `questions_correct_answer_check` CHECK (`correct_answer` IN ('A', 'B', 'C', 'D'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------
-- Table: test_questions (Questions assigned to tests)
-- --------------------------------------------
CREATE TABLE `test_questions` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `test_id` CHAR(36) NOT NULL,
    `question_id` CHAR(36) NOT NULL,
    `question_order` INT NOT NULL,
    `marks` INT NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `test_questions_test_id_question_id_key` (`test_id`, `question_id`),
    CONSTRAINT `test_questions_test_id_fkey` FOREIGN KEY (`test_id`) REFERENCES `mock_tests`(`id`) ON DELETE CASCADE,
    CONSTRAINT `test_questions_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------
-- Table: test_attempts (Student test attempts)
-- --------------------------------------------
CREATE TABLE `test_attempts` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `test_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `score` INT NOT NULL,
    `total_marks` INT NOT NULL,
    `percentage` DECIMAL(5,2) NOT NULL,
    `passed` BOOLEAN NOT NULL,
    `started_at` TIMESTAMP NOT NULL,
    `completed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `is_active` BOOLEAN DEFAULT FALSE,
    `time_taken_seconds` INT,
    `unanswered_count` INT DEFAULT 0,
    `correct_count` INT DEFAULT 0,
    `wrong_count` INT DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `test_attempts_test_id_fkey` FOREIGN KEY (`test_id`) REFERENCES `mock_tests`(`id`) ON DELETE CASCADE,
    CONSTRAINT `test_attempts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------
-- Table: test_answers (Student submitted answers)
-- --------------------------------------------
CREATE TABLE `test_answers` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `attempt_id` CHAR(36) NOT NULL,
    `question_id` CHAR(36) NOT NULL,
    `selected_answer` CHAR(1),
    `is_correct` BOOLEAN NOT NULL,
    `marks_obtained` INT NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `test_answers_attempt_id_question_id_key` (`attempt_id`, `question_id`),
    CONSTRAINT `test_answers_attempt_id_fkey` FOREIGN KEY (`attempt_id`) REFERENCES `test_attempts`(`id`) ON DELETE CASCADE,
    CONSTRAINT `test_answers_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE,
    CONSTRAINT `test_answers_selected_answer_check` CHECK (`selected_answer` IS NULL OR `selected_answer` IN ('A', 'B', 'C', 'D'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------
-- Table: test_answer_drafts (Auto-saved answers during test)
-- --------------------------------------------
CREATE TABLE `test_answer_drafts` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `test_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `question_id` CHAR(36) NOT NULL,
    `selected_answer` CHAR(1),
    `marked_for_review` BOOLEAN DEFAULT FALSE,
    `last_saved_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `test_answer_drafts_test_id_user_id_question_id_key` (`test_id`, `user_id`, `question_id`),
    CONSTRAINT `test_answer_drafts_test_id_fkey` FOREIGN KEY (`test_id`) REFERENCES `mock_tests`(`id`) ON DELETE CASCADE,
    CONSTRAINT `test_answer_drafts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE,
    CONSTRAINT `test_answer_drafts_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------
-- Table: test_timers (Test timer tracking)
-- --------------------------------------------
CREATE TABLE `test_timers` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `test_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `started_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `duration_minutes` INT NOT NULL,
    `ends_at` TIMESTAMP NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `test_timers_test_id_user_id_key` (`test_id`, `user_id`),
    CONSTRAINT `test_timers_test_id_fkey` FOREIGN KEY (`test_id`) REFERENCES `mock_tests`(`id`) ON DELETE CASCADE,
    CONSTRAINT `test_timers_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX `idx_profiles_whatsapp` ON `profiles`(`whatsapp_number`);
CREATE INDEX `idx_profiles_email` ON `profiles`(`email`);
CREATE INDEX `idx_user_roles_user_id` ON `user_roles`(`user_id`);
CREATE INDEX `idx_approval_status_user_id` ON `approval_status`(`user_id`);
CREATE INDEX `idx_approval_status_status` ON `approval_status`(`status`);
CREATE INDEX `idx_exams_is_active` ON `exams`(`is_active`);
CREATE INDEX `idx_mock_tests_exam_id` ON `mock_tests`(`exam_id`);
CREATE INDEX `idx_mock_tests_is_published` ON `mock_tests`(`is_published`);
CREATE INDEX `idx_questions_exam_id` ON `questions`(`exam_id`);
CREATE INDEX `idx_questions_subject` ON `questions`(`subject`);
CREATE INDEX `idx_test_attempts_user_id` ON `test_attempts`(`user_id`);
CREATE INDEX `idx_test_attempts_test_id` ON `test_attempts`(`test_id`);

-- ============================================
-- SAMPLE DATA (Optional - Comment out if not needed)
-- ============================================

-- Admin user (password: admin123)
-- Note: You'll need to hash the password properly in your application
INSERT INTO `users` (`id`, `email`, `password_hash`) VALUES
('11111111-1111-1111-1111-111111111111', 'admin@practicekoro.com', '$2a$10$examplehashforadmin');

INSERT INTO `profiles` (`id`, `email`, `full_name`) VALUES
('11111111-1111-1111-1111-111111111111', 'admin@practicekoro.com', 'Admin User');

INSERT INTO `user_roles` (`id`, `user_id`, `role`) VALUES
(UUID(), '11111111-1111-1111-1111-111111111111', 'admin');

-- Sample Exams
INSERT INTO `exams` (`id`, `name`, `description`, `created_by`, `is_active`) VALUES
('22222222-2222-2222-2222-222222222222', 'WBCS', 'West Bengal Civil Service Examination', '11111111-1111-1111-1111-111111111111', TRUE),
('33333333-3333-3333-3333-333333333333', 'SSC CGL', 'Staff Selection Commission Combined Graduate Level', '11111111-1111-1111-1111-111111111111', TRUE),
('44444444-4444-4444-4444-444444444444', 'Railway Group D', 'Railway Group D Examination', '11111111-1111-1111-1111-111111111111', TRUE),
('55555555-5555-5555-5555-555555555555', 'WB Primary TET', 'West Bengal Primary TET Examination', '11111111-1111-1111-1111-111111111111', TRUE);

-- ============================================
-- Re-enable foreign key checks
-- ============================================
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- END OF SCHEMA
-- ============================================
