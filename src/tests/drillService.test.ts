import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  evaluateDrill,
  fetchPYQQuestions,
  fetchTopicQuestions,
  syncDrillMistakesToVault,
  recordDrillActivity,
} from "@/services/drillService";
import { DrillQuestion } from "@/types/drills";
import { FALLBACK_DRILL_QUESTIONS } from "@/data/examCatalog";

// Offline: never hit live Supabase in unit tests. RPC returns deterministic
// rows (exercises the RLS-lockdown RPC-first path); table queries fail over
// to the local-bank path, exactly like a locked-down DB with no RPC.
vi.mock("@/integrations/supabase/client", () => {
  const rpcRows = [
    { id: "q-1", question_text: "ভারতের সংবিধান কোন সালে কার্যকর হয়?", option_a: "1947", option_b: "1950", option_c: "1952", option_d: "1955", correct_answer: "B", explanation: "26 January 1950", subject: "Indian Polity", topic: "Constitution", difficulty: "easy", year: 2024, source: null },
    { id: "q-2", question_text: "ক্রয়মূল্য ও বিক্রয়মূল্যের অনুপাত 4:5 হলে শতকরা লাভ কত?", option_a: "20%", option_b: "25%", option_c: "30%", option_d: "15%", correct_answer: "B", explanation: "25% profit", subject: "Mathematics", topic: "Profit and Loss", difficulty: "easy", year: 2024, source: null },
    { id: "q-3", question_text: "সুন্দরবন কোন সালে UNESCO World Heritage Site হয়?", option_a: "1983", option_b: "1987", option_c: "1989", option_d: "1992", correct_answer: "B", explanation: "1987 UNESCO site", subject: "West Bengal GK", topic: "Geography", difficulty: "medium", year: 2023, source: null },
    { id: "q-4", question_text: "Choose the correct collective noun: A _______ of lions.", option_a: "Pack", option_b: "Pride", option_c: "Herd", option_d: "Flock", correct_answer: "B", explanation: "Pride of lions", subject: "English", topic: "Nouns", difficulty: "easy", year: 2023, source: null },
  ];
  const chain: Record<string, unknown> = {
    data: null,
    error: { message: "mocked offline" },
  };
  for (const m of ["select", "eq", "not", "neq", "order", "limit", "maybeSingle", "single", "is", "in", "or", "upsert", "insert", "update", "delete"]) {
    (chain as Record<string, unknown>)[m] = () => chain;
  }
  return {
    supabase: {
      rpc: async () => ({ data: rpcRows, error: null }),
      from: () => chain,
      auth: { getSession: async () => ({ data: { session: null } }) },
    },
  };
});

describe("drillService — Targeted Topic Practice & PYQ Drill Engine", () => {
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

  const mockQuestions: DrillQuestion[] = [
    {
      id: "q-1",
      question_text: "ভারতের সংবিধান কোন সালে কার্যকর হয়?",
      option_a: "1947",
      option_b: "1950",
      option_c: "1952",
      option_d: "1955",
      correct_answer: "B",
      explanation: "26 January 1950",
      subject: "Indian Polity",
      topic: "Constitution",
      difficulty: "easy",
      year: 2024,
    },
    {
      id: "q-2",
      question_text: "কোনো দ্রব্যের ক্রয়মূল্য ও বিক্রয়মূল্যের অনুপাত 4:5 হলে শতকরা লাভ কত?",
      option_a: "20%",
      option_b: "25%",
      option_c: "30%",
      option_d: "15%",
      correct_answer: "B",
      explanation: "25% profit",
      subject: "Mathematics",
      topic: "Profit and Loss",
      difficulty: "easy",
      year: 2024,
    },
    {
      id: "q-3",
      question_text: "সুন্দরবন কোন সালে UNESCO World Heritage Site হয়?",
      option_a: "1983",
      option_b: "1987",
      option_c: "1989",
      option_d: "1992",
      correct_answer: "B",
      explanation: "1987 UNESCO site",
      subject: "West Bengal GK",
      topic: "Geography",
      difficulty: "medium",
      year: 2023,
    },
    {
      id: "q-4",
      question_text: "Choose the correct collective noun: A _______ of lions.",
      option_a: "Pack",
      option_b: "Pride",
      option_c: "Herd",
      option_d: "Flock",
      correct_answer: "B",
      explanation: "Pride of lions",
      subject: "English",
      topic: "Nouns",
      difficulty: "easy",
      year: 2023,
    },
  ];

  it("evaluates a perfect drill attempt accurately", () => {
    const answers = {
      "q-1": "B",
      "q-2": "B",
      "q-3": "B",
      "q-4": "B",
    };

    const result = evaluateDrill(mockQuestions, answers, 1, 0.25, 120);

    expect(result.totalQuestions).toBe(4);
    expect(result.attemptedCount).toBe(4);
    expect(result.correctCount).toBe(4);
    expect(result.wrongCount).toBe(0);
    expect(result.unattemptedCount).toBe(0);
    expect(result.score).toBe(4);
    expect(result.maxScore).toBe(4);
    expect(result.accuracyPercentage).toBe(100);
    expect(result.incorrectQuestions.length).toBe(0);
  });

  it("calculates deterministic score with 0.25 negative marks", () => {
    const answers = {
      "q-1": "B", // correct (+1)
      "q-2": "A", // wrong (-0.25)
      "q-3": "B", // correct (+1)
      "q-4": "C", // wrong (-0.25)
    };

    const result = evaluateDrill(mockQuestions, answers, 1, 0.25, 90);

    expect(result.attemptedCount).toBe(4);
    expect(result.correctCount).toBe(2);
    expect(result.wrongCount).toBe(2);
    expect(result.score).toBe(1.5); // 2 - 0.50 = 1.50
    expect(result.accuracyPercentage).toBe(50);
    expect(result.incorrectQuestions.length).toBe(2);
    expect(result.incorrectQuestions[0].question.id).toBe("q-2");
    expect(result.incorrectQuestions[0].selectedAnswer).toBe("A");
    expect(result.incorrectQuestions[0].correctAnswer).toBe("B");
  });

  it("clamps negative raw scores to zero floor", () => {
    const answers = {
      "q-1": "A", // wrong (-0.50)
      "q-2": "C", // wrong (-0.50)
      "q-3": "D", // wrong (-0.50)
      "q-4": "A", // wrong (-0.50)
    };

    const result = evaluateDrill(mockQuestions, answers, 1, 0.50, 45);

    expect(result.correctCount).toBe(0);
    expect(result.wrongCount).toBe(4);
    expect(result.score).toBe(0); // Clamped: Math.max(0, -2.0)
    expect(result.accuracyPercentage).toBe(0);
  });

  it("handles unattempted questions without penalties", () => {
    const answers = {
      "q-1": "B", // correct (+1)
    };

    const result = evaluateDrill(mockQuestions, answers, 1, 0.25, 30);

    expect(result.attemptedCount).toBe(1);
    expect(result.unattemptedCount).toBe(3);
    expect(result.correctCount).toBe(1);
    expect(result.wrongCount).toBe(0);
    expect(result.score).toBe(1);
    expect(result.accuracyPercentage).toBe(100);
  });

  it("syncs mistakes to local vault snapshot with unclassified status", async () => {
    const incorrectList = [
      {
        question: mockQuestions[1],
        selectedAnswer: "A",
        correctAnswer: "B",
      },
    ];

    const synced = await syncDrillMistakesToVault("test-student-123", incorrectList);
    expect(synced).toBe(1);

    const cachedRaw = localStorage.getItem("pk_student_mistakes_v2");
    expect(cachedRaw).not.toBeNull();
    const cached = JSON.parse(cachedRaw!);
    expect(cached.length).toBe(1);
    expect(cached[0].question_id).toBe("q-2");
    expect(cached[0].selected_answer).toBe("A");
    expect(cached[0].error_type).toBe("unclassified");
    expect(cached[0].is_mastered).toBe(false);
  });

  it("records drill practice activity into today metrics", () => {
    const mockResult = {
      totalQuestions: 10,
      attemptedCount: 10,
      correctCount: 8,
      wrongCount: 2,
      unattemptedCount: 0,
      score: 7.5,
      maxScore: 10,
      accuracyPercentage: 80,
      timeSpentSeconds: 300, // 5 mins
      incorrectQuestions: [],
    };

    recordDrillActivity(mockResult);

    const metricsRaw = localStorage.getItem("pk_today_metrics");
    expect(metricsRaw).not.toBeNull();
    const metrics = JSON.parse(metricsRaw!);
    expect(metrics.questions).toBe(10);
    expect(metrics.accuracy).toBe(80);
    expect(metrics.studyTimeMinutes).toBe(5);
    expect(metrics.attempts).toBe(1);
  });

  it("fetches fallback questions safely if network or database is empty", async () => {
    const qs = await fetchPYQQuestions({ questionCount: 5 });
    expect(qs).toBeDefined();
    expect(qs.length).toBeGreaterThan(0);
    expect(qs.length).toBeLessThanOrEqual(5);
    expect(qs[0].question_text).toBeDefined();
    expect(qs[0].correct_answer).toBeDefined();
  });
});
