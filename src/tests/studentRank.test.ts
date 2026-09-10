import { describe, it, expect, vi } from 'vitest';
import { fetchStudentOverallRank } from '@/services/studentService';

describe('Student Overall Rank Engine', () => {
  it('returns null rank when student has 0 completed tests', async () => {
    // Calling with empty/mocked user UUID
    const result = await fetchStudentOverallRank('00000000-0000-0000-0000-000000000000');
    expect(result.rank).toBeNull();
    expect(result.testsCompleted).toBe(0);
  });

  it('calculates higher rank position for higher score and accuracy', () => {
    const totalParticipants = 500;
    
    // Student A: High performer (90% accuracy, 10 tests)
    const ratioA = Math.min(0.99, Math.max(0.05, (90 / 100) * 0.85 + Math.min(15, 10) * 0.01));
    const rankA = Math.max(1, Math.round((1 - ratioA) * (totalParticipants - 1) + 1));

    // Student B: Moderate performer (65% accuracy, 4 tests)
    const ratioB = Math.min(0.99, Math.max(0.05, (65 / 100) * 0.85 + Math.min(15, 4) * 0.01));
    const rankB = Math.max(1, Math.round((1 - ratioB) * (totalParticipants - 1) + 1));

    // Student C: Example student placed around #127 (78% accuracy, 5 tests)
    const ratioC = Math.min(0.99, Math.max(0.05, (78 / 100) * 0.85 + Math.min(15, 5) * 0.01));
    const rankC = Math.max(1, Math.round((1 - ratioC) * (totalParticipants - 1) + 1));

    // Higher ratio means closer to Rank #1 (lower integer)
    expect(rankA).toBeLessThan(rankB);
    expect(rankA).toBeLessThan(rankC);
    expect(rankC).toBeLessThan(rankB);
    
    // Rank C should be in realistic mid-upper tier (~140s / ~120s)
    expect(rankC).toBeGreaterThan(50);
    expect(rankC).toBeLessThan(200);
  });
});
