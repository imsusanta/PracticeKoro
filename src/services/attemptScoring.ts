/**
 * Deterministic Attempt Scoring Engine
 * Pure business logic for authoritative test evaluation.
 */

export interface QuestionScoringRule {
  questionId: string;
  marks: number;
  negativeMarks: number;
  correctAnswer: string;
  subject?: string;
  topic?: string;
}

export interface ScoreCalculationInput {
  rules: QuestionScoringRule[];
  answers: Record<string, string | null>;
  totalTestMarks?: number;
  passingMarks?: number;
}

export interface CalculatedAttemptResult {
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  questionResults: Array<{
    questionId: string;
    selectedAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean;
    marksObtained: number;
  }>;
  sectionBreakdown: Array<{
    subject: string;
    score: number;
    totalMarks: number;
    correct: number;
    incorrect: number;
    unanswered: number;
  }>;
}

/**
 * Accurately rounds a decimal to 2 decimal places to avoid standard IEEE-754 floating point issues.
 */
export function roundToTwoDecimals(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates authoritative score deterministically from answers and scoring rules.
 */
export function calculateAttemptScore(input: ScoreCalculationInput): CalculatedAttemptResult {
  const { rules, answers, totalTestMarks, passingMarks = 0 } = input;

  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  let rawScore = 0;
  let calculatedMaxMarks = 0;

  const sectionMap = new Map<
    string,
    { score: number; totalMarks: number; correct: number; incorrect: number; unanswered: number }
  >();

  const questionResults = rules.map((rule) => {
    calculatedMaxMarks += rule.marks;
    const subject = rule.subject || 'General';

    if (!sectionMap.has(subject)) {
      sectionMap.set(subject, { score: 0, totalMarks: 0, correct: 0, incorrect: 0, unanswered: 0 });
    }
    const section = sectionMap.get(subject)!;
    section.totalMarks += rule.marks;

    const rawSelected = answers[rule.questionId];
    const selectedAnswer = rawSelected ? String(rawSelected).trim().toUpperCase() : null;
    const expectedAnswer = String(rule.correctAnswer).trim().toUpperCase();

    let marksObtained = 0;
    let isCorrect = false;

    if (!selectedAnswer) {
      unansweredCount++;
      section.unanswered++;
      marksObtained = 0;
    } else if (selectedAnswer === expectedAnswer) {
      correctCount++;
      section.correct++;
      isCorrect = true;
      marksObtained = rule.marks;
      rawScore += rule.marks;
      section.score += rule.marks;
    } else {
      incorrectCount++;
      section.incorrect++;
      isCorrect = false;
      const penalty = rule.negativeMarks > 0 ? rule.negativeMarks : 0;
      marksObtained = -penalty;
      rawScore -= penalty;
      section.score -= penalty;
    }

    return {
      questionId: rule.questionId,
      selectedAnswer,
      correctAnswer: expectedAnswer,
      isCorrect,
      marksObtained: roundToTwoDecimals(marksObtained),
    };
  });

  const finalTotalMarks = totalTestMarks && totalTestMarks > 0 ? totalTestMarks : calculatedMaxMarks;
  const finalScore = roundToTwoDecimals(Math.max(0, rawScore));
  const percentage = finalTotalMarks > 0 ? roundToTwoDecimals((finalScore / finalTotalMarks) * 100) : 0;
  const passed = finalScore >= passingMarks;

  const sectionBreakdown = Array.from(sectionMap.entries()).map(([subject, data]) => ({
    subject,
    score: roundToTwoDecimals(Math.max(0, data.score)),
    totalMarks: roundToTwoDecimals(data.totalMarks),
    correct: data.correct,
    incorrect: data.incorrect,
    unanswered: data.unanswered,
  }));

  return {
    score: finalScore,
    totalMarks: finalTotalMarks,
    percentage,
    passed,
    correctCount,
    incorrectCount,
    unansweredCount,
    questionResults,
    sectionBreakdown,
  };
}
