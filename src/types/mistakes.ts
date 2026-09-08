/**
 * Types & Contracts for Mistakes Notebook & Revision Engine
 */

export type ErrorType = 'conceptual' | 'careless' | 'time_pressure' | 'guess' | 'unclassified';

export interface ErrorTypeConfig {
  key: ErrorType;
  labelEn: string;
  labelBn: string;
  iconName: string;
  badgeClass: string;
  pillBgClass: string;
  description: string;
}

export const ERROR_TYPE_DEFINITIONS: Record<ErrorType, ErrorTypeConfig> = {
  conceptual: {
    key: 'conceptual',
    labelEn: 'Conceptual Error',
    labelBn: 'ধারণাগত ভুল',
    iconName: 'Brain',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    pillBgClass: 'bg-indigo-500',
    description: 'Misunderstood the underlying concept, formula, or rule.',
  },
  careless: {
    key: 'careless',
    labelEn: 'Careless Mistake',
    labelBn: 'অসাবধানতা',
    iconName: 'Zap',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    pillBgClass: 'bg-amber-500',
    description: 'Misread question/options, calculation slip, or rushed.',
  },
  time_pressure: {
    key: 'time_pressure',
    labelEn: 'Time Pressure',
    labelBn: 'সময়ের অভাব',
    iconName: 'Clock',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    pillBgClass: 'bg-rose-500',
    description: 'Ran out of time and answered hastily without verifying.',
  },
  guess: {
    key: 'guess',
    labelEn: 'Guess / Unsure',
    labelBn: 'অনুমান / অনিশ্চিত',
    iconName: 'Dices',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    pillBgClass: 'bg-purple-500',
    description: 'Guessed between multiple remaining options.',
  },
  unclassified: {
    key: 'unclassified',
    labelEn: 'Unclassified',
    labelBn: 'শ্রেণীবিহীন',
    iconName: 'HelpCircle',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    pillBgClass: 'bg-slate-500',
    description: 'Error has not yet been classified with a reason.',
  },
};

export interface MistakeQuestionDetails {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string | null;
  subject: string | null;
  topic: string | null;
  difficulty?: string | null;
  year?: number | null;
}

export interface MistakeItem {
  id: string;
  question_id: string;
  attempt_id?: string | null;
  selected_answer: string | null;
  correct_answer: string;
  is_mastered: boolean;
  retry_count: number;
  streak: number;
  error_type: ErrorType;
  student_notes?: string | null;
  last_retry_at?: string | null;
  mastered_at?: string | null;
  created_at: string;
  updated_at?: string | null;
  questions: MistakeQuestionDetails;
}

export interface MistakesAnalytics {
  totalMistakes: number;
  activeMistakes: number;
  masteredMistakes: number;
  masteryRate: number; // 0 - 100
  errorTypeBreakdown: Record<ErrorType, { count: number; percentage: number }>;
  subjectBreakdown: Array<{
    subject: string;
    total: number;
    active: number;
    mastered: number;
  }>;
  weakestSubject?: string | null;
  weakestTopic?: string | null;
}

export interface RevisionDrillFilter {
  subject?: string;
  errorType?: ErrorType | 'all';
  minRetryCount?: number;
  status?: 'active' | 'mastered' | 'all';
  searchQuery?: string;
  limit?: number;
}
