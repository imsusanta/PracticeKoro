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
    labelEn: 'Concept Gap',
    labelBn: 'কনসেপ্ট পরিষ্কার ছিল না',
    iconName: 'Brain',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    pillBgClass: 'bg-indigo-500',
    description: 'থিওরি, ফর্মুলা বা নিয়ম অজানা থাকার কারণে ভুল হয়েছে।',
  },
  careless: {
    key: 'careless',
    labelEn: 'Silly Mistake',
    labelBn: 'তাড়াহুড়োয় জানা প্রশ্ন ভুল',
    iconName: 'Zap',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    pillBgClass: 'bg-amber-500',
    description: 'জানা প্রশ্ন ছিল, কিন্তু তাড়াহুড়ো বা সহজ ক্যালকুলেশনে ভুল দাগিয়েছি।',
  },
  time_pressure: {
    key: 'time_pressure',
    labelEn: 'Time Panic',
    labelBn: 'সময়ের টান ও নার্ভাসনেস',
    iconName: 'Clock',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    pillBgClass: 'bg-rose-500',
    description: 'টাইমার দেখে নার্ভাস হয়ে বা শেষ মুহূর্তে তাড়াহুড়োয় দাগিয়ে ভুল।',
  },
  guess: {
    key: 'guess',
    labelEn: 'Blind Guess',
    labelBn: 'আন্দাজে তুকা মেরেছি',
    iconName: 'Dices',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    pillBgClass: 'bg-purple-500',
    description: 'সঠিক উত্তর না জেনেও আন্দাজে দাগিয়ে নেগেটিভ মার্কস খেয়েছি।',
  },
  unclassified: {
    key: 'unclassified',
    labelEn: 'Not Classified Yet',
    labelBn: 'কারণ সিলেক্ট করা হয়নি',
    iconName: 'HelpCircle',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    pillBgClass: 'bg-slate-500',
    description: 'ভুলের কারণ ট্যাগ করো এবং কী শিখলে তা নোট করে রাখো।',
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
