import { describe, it, expect } from 'vitest';
import { calculateAttemptScore, QuestionScoringRule } from '../services/attemptScoring';

describe('calculateAttemptScore', () => {
  const sampleRules: QuestionScoringRule[] = [
    {
      questionId: 'q-1',
      marks: 1,
      negativeMarks: 0.25,
      correctAnswer: 'B',
      subject: 'History',
    },
    {
      questionId: 'q-2',
      marks: 1,
      negativeMarks: 0.25,
      correctAnswer: 'A',
      subject: 'History',
    },
    {
      questionId: 'q-3',
      marks: 2,
      negativeMarks: 0.5,
      correctAnswer: 'C',
      subject: 'Science',
    },
    {
      questionId: 'q-4',
      marks: 1,
      negativeMarks: 0.25,
      correctAnswer: 'D',
      subject: 'Science',
    },
  ];

  it('calculates perfect score when all answers are correct', () => {
    const answers = {
      'q-1': 'B',
      'q-2': 'A',
      'q-3': 'C',
      'q-4': 'D',
    };

    const result = calculateAttemptScore({
      rules: sampleRules,
      answers,
      totalTestMarks: 5,
      passingMarks: 2.5,
    });

    expect(result.score).toBe(5);
    expect(result.totalMarks).toBe(5);
    expect(result.percentage).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.correctCount).toBe(4);
    expect(result.incorrectCount).toBe(0);
    expect(result.unansweredCount).toBe(0);
  });

  it('accurately applies negative marking for incorrect answers', () => {
    // q-1: B (correct: +1)
    // q-2: C (incorrect: -0.25)
    // q-3: C (correct: +2)
    // q-4: null (unanswered: 0)
    // Total expected score: 1 - 0.25 + 2 + 0 = 2.75 / 5 (55%)
    const answers = {
      'q-1': 'B',
      'q-2': 'C',
      'q-3': 'C',
      'q-4': null,
    };

    const result = calculateAttemptScore({
      rules: sampleRules,
      answers,
      totalTestMarks: 5,
      passingMarks: 2.5,
    });

    expect(result.score).toBe(2.75);
    expect(result.totalMarks).toBe(5);
    expect(result.percentage).toBe(55);
    expect(result.passed).toBe(true);
    expect(result.correctCount).toBe(2);
    expect(result.incorrectCount).toBe(1);
    expect(result.unansweredCount).toBe(1);
  });

  it('floors score at zero when negative penalties exceed marks', () => {
    const answers = {
      'q-1': 'A', // -0.25
      'q-2': 'B', // -0.25
      'q-3': 'A', // -0.5
      'q-4': 'A', // -0.25
    };

    const result = calculateAttemptScore({
      rules: sampleRules,
      answers,
      totalTestMarks: 5,
      passingMarks: 2,
    });

    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.correctCount).toBe(0);
    expect(result.incorrectCount).toBe(4);
  });

  it('correctly builds subject/section breakdown', () => {
    const answers = {
      'q-1': 'B', // History +1
      'q-2': 'C', // History -0.25 -> 0.75 / 2
      'q-3': 'C', // Science +2
      'q-4': 'D', // Science +1 -> 3 / 3
    };

    const result = calculateAttemptScore({
      rules: sampleRules,
      answers,
      totalTestMarks: 5,
    });

    expect(result.sectionBreakdown).toHaveLength(2);

    const historySection = result.sectionBreakdown.find((s) => s.subject === 'History')!;
    expect(historySection.correct).toBe(1);
    expect(historySection.incorrect).toBe(1);
    expect(historySection.score).toBe(0.75);
    expect(historySection.totalMarks).toBe(2);

    const scienceSection = result.sectionBreakdown.find((s) => s.subject === 'Science')!;
    expect(scienceSection.correct).toBe(2);
    expect(scienceSection.incorrect).toBe(0);
    expect(scienceSection.score).toBe(3);
    expect(scienceSection.totalMarks).toBe(3);
  });

  it('handles case-insensitivity and whitespace in selected answers', () => {
    const answers = {
      'q-1': '  b ',
      'q-2': 'a',
      'q-3': ' C ',
      'q-4': 'd',
    };

    const result = calculateAttemptScore({
      rules: sampleRules,
      answers,
      totalTestMarks: 5,
    });

    expect(result.score).toBe(5);
    expect(result.correctCount).toBe(4);
  });
});
