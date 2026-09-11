import { describe, it, expect, beforeEach } from "vitest";
import {
  computeReadinessMetrics,
  getCutoffBenchmark,
  HISTORICAL_CUTOFFS,
} from "@/services/readinessService";
import { RawReadinessInputs } from "@/services/readinessService";

describe("readinessService — Exam Readiness Engine & Predictive Analytics", () => {
  let storage: Record<string, string> = {};

  beforeEach(() => {
    storage = {};
    const mockStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, val: string) => {
        storage[key] = String(val);
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        storage = {};
      },
      get length() {
        return Object.keys(storage).length;
      },
      key: (i: number) => Object.keys(storage)[i] ?? null,
    };
    Object.defineProperty(globalThis, "localStorage", {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
    if (typeof window !== "undefined") {
      Object.defineProperty(window, "localStorage", {
        value: mockStorage,
        writable: true,
        configurable: true,
      });
    }
  });

  it("calculates weighted readiness and classifies high performers as exam_ready", () => {
    const inputs: RawReadinessInputs = {
      mockAttempts: [{ percentage: 85 }, { percentage: 87 }],
      drillsMetrics: {
        questions: 120,
        accuracy: 90,
        streakDays: 14,
      },
      mistakesStats: {
        totalMistakes: 10,
        masteredCount: 8, // 80%
      },
      targetExamId: "wb-panchayat",
    };

    const result = computeReadinessMetrics(inputs);

    expect(result.overallReadiness).toBeGreaterThanOrEqual(80);
    expect(result.readinessBand).toBe("exam_ready");
    expect(result.bengaliBandLabel).toContain("প্রস্তুত");
    expect(result.hasSufficientData).toBe(true);
    expect(result.projectedScore).toBeGreaterThanOrEqual(80);
    expect(result.maxScore).toBe(100);
  });

  it("calculates projected score adhering to exam specific total marks", () => {
    // WBP Constable has totalMarks: 85
    const inputs: RawReadinessInputs = {
      mockAttempts: [{ percentage: 70 }],
      drillsMetrics: {
        questions: 50,
        accuracy: 70,
        streakDays: 5,
      },
      mistakesStats: {
        totalMistakes: 6,
        masteredCount: 3,
      },
      targetExamId: "wbp-constable",
    };

    const result = computeReadinessMetrics(inputs);

    expect(result.targetExamId).toBe("wbp-constable");
    expect(result.maxScore).toBe(85);
    // Projected score should be around (readiness / 100) * 85
    const expectedProjected = Math.round((result.overallReadiness / 100) * 85 * 10) / 10;
    expect(result.projectedScore).toBe(expectedProjected);
  });

  it("identifies weakest and strongest subjects accurately", () => {
    const inputs: RawReadinessInputs = {
      mockAttempts: [{ percentage: 65 }],
      drillsMetrics: { questions: 30, accuracy: 60, streakDays: 3 },
      mistakesStats: { totalMistakes: 4, masteredCount: 1 },
      targetExamId: "wb-panchayat",
    };

    const result = computeReadinessMetrics(inputs);

    expect(result.subjectReadiness.length).toBe(9);
    expect(result.weakestSubject).not.toBeNull();
    expect(result.strongestSubject).not.toBeNull();
    const strongestScore = result.strongestSubject?.scorePercent ?? 100;
    expect(result.weakestSubject?.scorePercent).toBeLessThanOrEqual(strongestScore);
  });

  it("generates prioritized, actionable diagnostic recommendations", () => {
    const inputs: RawReadinessInputs = {
      mockAttempts: [{ percentage: 60 }],
      drillsMetrics: { questions: 40, accuracy: 65, streakDays: 4 },
      mistakesStats: { totalMistakes: 5, masteredCount: 2 }, // 3 unmastered mistakes
      targetExamId: "wb-panchayat",
    };

    const result = computeReadinessMetrics(inputs);

    expect(result.recommendedActions.length).toBeGreaterThanOrEqual(3);
    const actionTypes = result.recommendedActions.map((a) => a.type);
    expect(actionTypes).toContain("topic_drill");
    expect(actionTypes).toContain("mistake_revision");
    expect(actionTypes).toContain("mock_test");
    expect(result.recommendedActions[0].impactLabel).toContain("Readiness");
  });

  it("handles new students with zero attempts gracefully", () => {
    const inputs: RawReadinessInputs = {
      mockAttempts: [],
      drillsMetrics: { questions: 0, accuracy: 0, streakDays: 0 },
      mistakesStats: { totalMistakes: 0, masteredCount: 0 },
      targetExamId: "psc-clerkship",
    };

    const result = computeReadinessMetrics(inputs);

    expect(result.hasSufficientData).toBe(false);
    expect(result.overallReadiness).toBe(35);
    expect(result.readinessBand).toBe("critical");
    expect(result.recommendedActions.length).toBeGreaterThanOrEqual(2);
  });

  it("provides accurate cutoff benchmarks for primary West Bengal exams", () => {
    const panchayat = getCutoffBenchmark("wb-panchayat");
    expect(panchayat.expectedCutoffUR).toBe(72);
    expect(panchayat.totalMarks).toBe(100);

    const wbp = getCutoffBenchmark("wbp-constable");
    expect(wbp.expectedCutoffUR).toBe(56);
    expect(wbp.totalMarks).toBe(85);

    const tet = getCutoffBenchmark("wb-tet");
    expect(tet.expectedCutoffUR).toBe(90);
    expect(tet.totalMarks).toBe(150);
  });
});
