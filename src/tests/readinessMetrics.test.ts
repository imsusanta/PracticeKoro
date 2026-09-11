import { describe, it, expect } from "vitest";
import {
  computeReadinessMetrics,
  getCutoffBenchmark,
  type RawReadinessInputs,
} from "@/services/readinessService";

const base: RawReadinessInputs = {
  mockAttempts: [],
  drillsMetrics: { questions: 0, accuracy: 0, streakDays: 0 },
  mistakesStats: { totalMistakes: 0, masteredCount: 0 },
  targetExamId: "wb-panchayat",
};

describe("readiness scoring — computeReadinessMetrics (pure)", () => {
  it("returns baseline starter score with no data", () => {
    const r = computeReadinessMetrics(base);
    expect(r.overallReadiness).toBe(35);
    expect(r.readinessBand).toBe("critical");
    expect(r.targetExamName).toBe("WB Panchayat Recruitment");
  });

  it("computes weighted readiness for a strong performer", () => {
    const r = computeReadinessMetrics({
      ...base,
      mockAttempts: [{ percentage: 90 }, { percentage: 80 }],
      drillsMetrics: { questions: 50, accuracy: 80, streakDays: 15 },
      mistakesStats: { totalMistakes: 10, masteredCount: 8 },
    });
    // 85*0.4 + 80*0.25 + 80*0.2 + 100*0.15 = 85
    expect(r.overallReadiness).toBe(85);
    expect(r.readinessBand).toBe("exam_ready");
  });

  it("clamps a perfect score to 99", () => {
    const r = computeReadinessMetrics({
      ...base,
      mockAttempts: [{ percentage: 100 }],
      drillsMetrics: { questions: 100, accuracy: 100, streakDays: 30 },
      mistakesStats: { totalMistakes: 5, masteredCount: 5 },
    });
    expect(r.overallReadiness).toBe(99);
  });

  it("falls back to generic benchmark for unknown exam ids", () => {
    const r = computeReadinessMetrics({ ...base, targetExamId: "unknown-exam" });
    expect(r.targetExamName).toBe("West Bengal Competitive Exam");
    expect(getCutoffBenchmark("unknown-exam").totalMarks).toBe(100);
  });

  it("always returns numeric score fields and action list", () => {
    const r = computeReadinessMetrics({
      ...base,
      mockAttempts: [{ percentage: 60, subject: "Mathematics" }],
    });
    expect(typeof r.projectedScore).toBe("number");
    expect(typeof r.maxScore).toBe("number");
    expect(Array.isArray(r.recommendedActions)).toBe(true);
  });
});
