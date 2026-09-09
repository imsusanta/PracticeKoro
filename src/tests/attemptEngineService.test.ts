import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveLocalDraft,
  getLocalDraft,
  clearLocalDraft,
} from '../services/attemptEngineService';
import type { LocalAttemptDraft } from '../types/attemptEngine';

describe('Local Attempt Draft Storage (Recovery Resilience)', () => {
  const sampleAttemptId = 'test-attempt-uuid-123';
  let storage: Record<string, string> = {};

  beforeEach(() => {
    storage = {};
    const mockStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, val: string) => { storage[key] = String(val); },
      removeItem: (key: string) => { delete storage[key]; },
      clear: () => { storage = {}; },
      get length() { return Object.keys(storage).length; },
      key: (i: number) => Object.keys(storage)[i] ?? null,
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        writable: true,
        configurable: true,
      });
    }
  });

  it('persists and restores draft responses from local storage', () => {
    const draft: LocalAttemptDraft = {
      attemptId: sampleAttemptId,
      testId: 'mock-test-456',
      answers: {
        'q-1': 'A',
        'q-2': 'C',
        'q-3': null,
      },
      reviewFlags: ['q-2'],
      lastSavedAt: new Date().toISOString(),
      syncedWithServer: false,
      serverExpiresAt: new Date(Date.now() + 3600000).toISOString(),
    };

    saveLocalDraft(draft);

    const recovered = getLocalDraft(sampleAttemptId);
    expect(recovered).not.toBeNull();
    expect(recovered?.attemptId).toBe(sampleAttemptId);
    expect(recovered?.answers['q-1']).toBe('A');
    expect(recovered?.answers['q-2']).toBe('C');
    expect(recovered?.answers['q-3']).toBeNull();
    expect(recovered?.reviewFlags).toContain('q-2');
  });

  it('clears draft after successful submission', () => {
    const draft: LocalAttemptDraft = {
      attemptId: sampleAttemptId,
      testId: 'mock-test-456',
      answers: { 'q-1': 'B' },
      reviewFlags: [],
      lastSavedAt: new Date().toISOString(),
      syncedWithServer: true,
      serverExpiresAt: '',
    };

    saveLocalDraft(draft);
    expect(getLocalDraft(sampleAttemptId)).not.toBeNull();

    clearLocalDraft(sampleAttemptId);
    expect(getLocalDraft(sampleAttemptId)).toBeNull();
  });

  it('returns null gracefully when no draft exists', () => {
    const nonExistent = getLocalDraft('non-existent-id');
    expect(nonExistent).toBeNull();
  });
});

describe('Full Mock Test Question Bank & Quota Engine', () => {
  it('supplies 100 questions for Panchayat and standard Full Mocks', async () => {
    const { getFullMockQuestions } = await import('../data/fullMockQuestionBank');
    const questions = getFullMockQuestions(100, 'panchayat-mock-1');
    expect(questions).toHaveLength(100);
  });

  it('supplies 85 questions for WB Group D and WBP Constable Mocks', async () => {
    const { getFullMockQuestions } = await import('../data/fullMockQuestionBank');
    const questions = getFullMockQuestions(85, 'wb-group-1');
    expect(questions).toHaveLength(85);
  });

  it('ensures multi-subject distribution across all core exam subjects', async () => {
    const { getFullMockQuestions } = await import('../data/fullMockQuestionBank');
    const questions = getFullMockQuestions(100, 'panchayat-mock-1');
    const subjects = new Set(questions.map((q) => q.subject));

    expect(subjects).toContain('Mathematics');
    expect(subjects).toContain('West Bengal GK');
    expect(subjects).toContain('History');
    expect(subjects).toContain('Indian Polity');
    expect(subjects).toContain('General Science');
    expect(subjects).toContain('English');
    expect(subjects).toContain('Bengali');
    expect(subjects).toContain('Reasoning');
  });

  it('resolves preset test configurations accurately', async () => {
    const { getMockTestPreset } = await import('../data/fullMockQuestionBank');
    const panchayat = getMockTestPreset('panchayat-mock-1');
    expect(panchayat).not.toBeNull();
    expect(panchayat?.questions).toBe(100);
    expect(panchayat?.duration).toBe(90);

    const wbGroupD = getMockTestPreset('wb-group-1');
    expect(wbGroupD).not.toBeNull();
    expect(wbGroupD?.questions).toBe(85);
  });

  it('verifies FALLBACK_DRILL_QUESTIONS no longer has a 10-question ceiling', async () => {
    const { FALLBACK_DRILL_QUESTIONS } = await import('../data/examCatalog');
    expect(FALLBACK_DRILL_QUESTIONS.length).toBeGreaterThanOrEqual(100);
  });

  it('accurately evaluates test when admin uploads arbitrary question counts (e.g. 10, 25, 50)', async () => {
    const { calculateAttemptScore } = await import('../services/attemptScoring');

    // Scenario A: Admin uploaded 10 questions to a test
    const tenQuestions = Array.from({ length: 10 }, (_, i) => ({
      questionId: `q-ten-${i + 1}`,
      marks: 1,
      negativeMarks: 0.25,
      correctAnswer: 'A',
      subject: 'Bengali',
    }));

    const resultTen = calculateAttemptScore({
      rules: tenQuestions,
      answers: { 'q-ten-1': 'A', 'q-ten-2': 'A', 'q-ten-3': 'B' },
      totalTestMarks: 10,
      passingMarks: 4,
    });

    expect(resultTen.totalMarks).toBe(10);
    expect(resultTen.questionResults).toHaveLength(10);
    expect(resultTen.correctCount).toBe(2);
    expect(resultTen.incorrectCount).toBe(1);
    expect(resultTen.unansweredCount).toBe(7);
    expect(resultTen.score).toBe(1.75); // 2 - 0.25

    // Scenario B: Admin uploaded 25 questions to a test
    const twentyFiveQuestions = Array.from({ length: 25 }, (_, i) => ({
      questionId: `q-twentyfive-${i + 1}`,
      marks: 2,
      negativeMarks: 0.5,
      correctAnswer: 'B',
      subject: 'Mathematics',
    }));

    const resultTwentyFive = calculateAttemptScore({
      rules: twentyFiveQuestions,
      answers: { 'q-twentyfive-1': 'B', 'q-twentyfive-2': 'B' },
      totalTestMarks: 50,
      passingMarks: 20,
    });

    expect(resultTwentyFive.totalMarks).toBe(50);
    expect(resultTwentyFive.questionResults).toHaveLength(25);
    expect(resultTwentyFive.correctCount).toBe(2);
    expect(resultTwentyFive.score).toBe(4);
  });
});


