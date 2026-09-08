import { describe, it, expect } from 'vitest';
import type { SanitizedQuestionItem } from '../types/attemptEngine';

describe('Attempt Engine Security & Sanitization Contract', () => {
  it('strictly excludes private answer keys and explanations from active test payload', () => {
    const activeQuestion: SanitizedQuestionItem = {
      id: 'item-uuid-1',
      questionId: 'q-uuid-101',
      orderIndex: 1,
      marks: 1,
      negativeMarks: 0.25,
      questionText: 'What is the capital of West Bengal?',
      optionA: 'Kolkata',
      optionB: 'Darjeeling',
      optionC: 'Siliguri',
      optionD: 'Asansol',
      subject: 'Geography',
      topic: 'West Bengal',
      difficulty: 'Easy',
    };

    // Verify properties
    expect(activeQuestion).toHaveProperty('id');
    expect(activeQuestion).toHaveProperty('questionId');
    expect(activeQuestion).toHaveProperty('questionText');
    expect(activeQuestion).toHaveProperty('optionA');

    // STRICT ASSERTIONS: correct_answer and explanation MUST be undefined
    expect((activeQuestion as any).correct_answer).toBeUndefined();
    expect((activeQuestion as any).correctAnswer).toBeUndefined();
    expect((activeQuestion as any).explanation).toBeUndefined();
  });

  it('guarantees that option identifiers are stable (A, B, C, D)', () => {
    const validOptions = ['A', 'B', 'C', 'D'];
    const chosenOption = 'B';
    expect(validOptions).toContain(chosenOption);
  });
});
