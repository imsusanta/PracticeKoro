/**
 * Core Attempt Engine Contract Types
 * Shared across React Web and Flutter mobile architectures.
 */

export type ExamMode = 'practice' | 'simulation' | 'challenge';

export interface SanitizedQuestionItem {
  id: string;              // Assigned test item / question ID
  questionId: string;
  orderIndex: number;
  marks: number;
  negativeMarks: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  subject?: string;
  topic?: string;
  difficulty?: string;
  year?: number;
  passageText?: string;
  // NOTE: correct_answer and explanation are strictly OMITTED during active tests
}

export interface StartAttemptRequest {
  testId: string;
  mode?: ExamMode;
  language?: 'bn' | 'en';
}

export interface StartAttemptResponse {
  attemptId: string;
  testId: string;
  testTitle: string;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  negativeMarking: boolean;
  negativeMarksPerQuestion: number;
  serverTime: string;      // ISO 8601 UTC
  startedAt: string;       // ISO 8601 UTC
  expiresAt: string;       // Authoritative server deadline (ISO 8601 UTC)
  questions: SanitizedQuestionItem[];
  savedResponses: Record<string, string>; // questionId -> selectedOption
  savedReviews: string[];  // Array of questionIds marked for review
}

export interface SaveAnswersRequest {
  attemptId: string;
  answers: Record<string, string | null>; // questionId -> selectedOption ("A"|"B"|"C"|"D"|null)
  reviewFlags?: string[]; // questionIds marked for review
  clientTimestamp?: string;
}

export interface SaveAnswersResponse {
  success: boolean;
  serverTime: string;
  remainingSeconds: number;
  isExpired: boolean;
}

export interface SubmitAttemptRequest {
  attemptId: string;
  finalAnswers?: Record<string, string | null>;
  timeTakenSeconds?: number;
  tabViolations?: number;
  fullscreenViolations?: number;
}

export interface SubmitAttemptResponse {
  attemptId: string;
  testId: string;
  status: 'completed' | 'expired';
  score: number;
  totalMarks: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  passed: boolean;
  submittedAt: string;
}

export interface SectionBreakdownItem {
  subject: string;
  score: number;
  totalMarks: number;
  correct: number;
  incorrect: number;
  unanswered: number;
}

export interface QuestionSolutionItem {
  questionId: string;
  orderIndex: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  selectedOption: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  marksObtained: number;
  explanation: string | null;
  subject?: string;
  topic?: string;
}

export interface AttemptResultResponse {
  attemptId: string;
  testId: string;
  testTitle: string;
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  passingMarks: number;
  timeTakenSeconds: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  sectionBreakdown: SectionBreakdownItem[];
  solutions: QuestionSolutionItem[];
}

/**
 * Local attempt draft stored in IndexedDB/localStorage for resilient recovery
 */
export interface LocalAttemptDraft {
  attemptId: string;
  testId: string;
  answers: Record<string, string | null>;
  reviewFlags: string[];
  lastSavedAt: string;
  syncedWithServer: boolean;
  serverExpiresAt: string;
}
