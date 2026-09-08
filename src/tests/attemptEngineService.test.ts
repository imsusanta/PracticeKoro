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
