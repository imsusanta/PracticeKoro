export type ReadinessBand = 'critical' | 'developing' | 'competitive' | 'exam_ready';

export interface CutoffBenchmark {
  examId: string;
  examName: string;
  totalMarks: number;
  expectedCutoffUR: number;
  expectedCutoffOBC: number;
  expectedCutoffSC: number;
  expectedCutoffST: number;
  year: number;
}

export interface SubjectReadinessItem {
  subject: string;
  bengaliName: string;
  scorePercent: number;
  status: 'strong' | 'average' | 'weak';
  attemptedCount: number;
  mistakesCount: number;
  color: string;
}

export interface RecommendedAction {
  id: string;
  title: string;
  bengaliTitle: string;
  subtitle: string;
  actionUrl: string;
  impactLabel: string;
  type: 'topic_drill' | 'mistake_revision' | 'pyq_drill' | 'mock_test';
}

export interface ExamReadinessResult {
  overallReadiness: number; // 0 - 100
  readinessBand: ReadinessBand;
  readinessLabel: string;
  bengaliBandLabel: string;
  mockAccuracy: number;
  topicDrillAccuracy: number;
  mistakeMasteryRate: number;
  consistencyScore: number;
  projectedScore: number;
  maxScore: number;
  targetExamId: string;
  targetExamName: string;
  cutoffBenchmark: CutoffBenchmark;
  subjectReadiness: SubjectReadinessItem[];
  weakestSubject: SubjectReadinessItem | null;
  strongestSubject: SubjectReadinessItem | null;
  recommendedActions: RecommendedAction[];
  hasSufficientData: boolean;
}
