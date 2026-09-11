-- ==============================================================================
-- Migration: Drop Difficulty Check Constraint on public.questions
-- Date: 2026-09-11
-- ==============================================================================

-- 1. Drop check constraint if present so difficulty values are not restricted
ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_difficulty_check;

-- 2. Allow NULL values for difficulty and default to 'medium' for compatibility
ALTER TABLE public.questions ALTER COLUMN difficulty DROP NOT NULL;
ALTER TABLE public.questions ALTER COLUMN difficulty SET DEFAULT 'medium';
