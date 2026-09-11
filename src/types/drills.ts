export type ExamCategory = 'state_govt' | 'police' | 'teaching' | 'central_govt';

export interface ExamTarget {
  id: string;
  name: string;
  bengaliName: string;
  category: ExamCategory;
  conductingBody: string;
  badge: string;
  defaultQuestions: number;
  defaultDurationMinutes: number;
  defaultNegativeMarks: number;
  subjects: string[];
  pyqYears: number[];
  description: string;
  iconBg?: string;
}

export type DrillMode = 'study' | 'instant_feedback' | 'timed_quiz';

export interface DrillConfig {
  title: string;
  subtitle?: string;
  examId?: string;
  examName?: string;
  subject?: string;
  topic?: string;
  subtopic?: string;
  difficulty?: 'all' | 'easy' | 'medium' | 'hard' | string;
  year?: number | 'all';
  questionCount: number;
  timeLimitMinutes?: number;
  negativeMarks: number;
  marksPerQuestion: number;
  mode: DrillMode;
}

export interface DrillQuestion {
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
  year: number | null;
  source?: string | null;
}

export interface DrillResult {
  totalQuestions: number;
  attemptedCount: number;
  correctCount: number;
  wrongCount: number;
  unattemptedCount: number;
  score: number;
  maxScore: number;
  accuracyPercentage: number;
  timeSpentSeconds: number;
  incorrectQuestions: Array<{
    question: DrillQuestion;
    selectedAnswer: string;
    correctAnswer: string;
  }>;
}
