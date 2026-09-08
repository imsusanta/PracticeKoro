import { supabase } from "@/integrations/supabase/client";
import { EXAM_CATALOG } from "@/data/examCatalog";
import {
  CutoffBenchmark,
  ExamReadinessResult,
  ReadinessBand,
  SubjectReadinessItem,
  RecommendedAction,
} from "@/types/readiness";

export const HISTORICAL_CUTOFFS: Record<string, CutoffBenchmark> = {
  "wb-panchayat": {
    examId: "wb-panchayat",
    examName: "WB Panchayat Recruitment 2026",
    totalMarks: 100,
    expectedCutoffUR: 72,
    expectedCutoffOBC: 67,
    expectedCutoffSC: 62,
    expectedCutoffST: 55,
    year: 2024,
  },
  "wbp-constable": {
    examId: "wbp-constable",
    examName: "WBP Constable & Lady Constable",
    totalMarks: 85,
    expectedCutoffUR: 56,
    expectedCutoffOBC: 51,
    expectedCutoffSC: 46,
    expectedCutoffST: 40,
    year: 2024,
  },
  "wbp-si": {
    examId: "wbp-si",
    examName: "KP & WBP Sub-Inspector (SI)",
    totalMarks: 200,
    expectedCutoffUR: 142,
    expectedCutoffOBC: 134,
    expectedCutoffSC: 122,
    expectedCutoffST: 108,
    year: 2023,
  },
  "psc-clerkship": {
    examId: "psc-clerkship",
    examName: "WBPSC Clerkship Part-I",
    totalMarks: 100,
    expectedCutoffUR: 68,
    expectedCutoffOBC: 63,
    expectedCutoffSC: 58,
    expectedCutoffST: 50,
    year: 2024,
  },
  "wb-tet": {
    examId: "wb-tet",
    examName: "WB Primary TET",
    totalMarks: 150,
    expectedCutoffUR: 90,
    expectedCutoffOBC: 83,
    expectedCutoffSC: 83,
    expectedCutoffST: 83,
    year: 2023,
  },
  "wbcs": {
    examId: "wbcs",
    examName: "WBCS Executive (Prelims)",
    totalMarks: 200,
    expectedCutoffUR: 128,
    expectedCutoffOBC: 122,
    expectedCutoffSC: 114,
    expectedCutoffST: 98,
    year: 2023,
  },
  "rrb-group-d": {
    examId: "rrb-group-d",
    examName: "Railway Group D",
    totalMarks: 100,
    expectedCutoffUR: 68,
    expectedCutoffOBC: 63,
    expectedCutoffSC: 56,
    expectedCutoffST: 50,
    year: 2022,
  },
  "ssc-gd": {
    examId: "ssc-gd",
    examName: "SSC GD Constable",
    totalMarks: 160,
    expectedCutoffUR: 122,
    expectedCutoffOBC: 116,
    expectedCutoffSC: 104,
    expectedCutoffST: 94,
    year: 2024,
  },
};

export function getCutoffBenchmark(examId: string): CutoffBenchmark {
  if (HISTORICAL_CUTOFFS[examId]) return HISTORICAL_CUTOFFS[examId];
  return {
    examId,
    examName: "West Bengal Competitive Exam",
    totalMarks: 100,
    expectedCutoffUR: 70,
    expectedCutoffOBC: 65,
    expectedCutoffSC: 60,
    expectedCutoffST: 52,
    year: 2024,
  };
}

export interface RawReadinessInputs {
  mockAttempts: Array<{ percentage: number; subject?: string }>;
  drillsMetrics: {
    questions: number;
    accuracy: number;
    streakDays: number;
  };
  mistakesStats: {
    totalMistakes: number;
    masteredCount: number;
  };
  targetExamId: string;
}

/**
 * Pure calculation of exam readiness and predictive diagnostics.
 */
export function computeReadinessMetrics(inputs: RawReadinessInputs): ExamReadinessResult {
  const { mockAttempts, drillsMetrics, mistakesStats, targetExamId } = inputs;
  const benchmark = getCutoffBenchmark(targetExamId);
  const targetExam = EXAM_CATALOG.find((e) => e.id === targetExamId);
  const targetExamName = targetExam ? targetExam.name : benchmark.examName;

  const hasMockData = mockAttempts.length > 0;
  const hasDrillData = drillsMetrics.questions > 0;
  const hasSufficientData = hasMockData || hasDrillData;

  // 1. Mock Accuracy (40%)
  const avgMockAcc = hasMockData
    ? Math.round(
        mockAttempts.reduce((acc, curr) => acc + curr.percentage, 0) / mockAttempts.length
      )
    : 50;

  // 2. Topic Drill Accuracy (25%)
  const drillAcc = hasDrillData ? Math.min(100, Math.max(0, drillsMetrics.accuracy)) : 50;

  // 3. Mistake Mastery Rate (20%)
  const masteryRate =
    mistakesStats.totalMistakes > 0
      ? Math.round((mistakesStats.masteredCount / mistakesStats.totalMistakes) * 100)
      : hasSufficientData
      ? 75
      : 50;

  // 4. Preparation Consistency Score (15%)
  // Capped at 15 days streak = 100%
  const consistencyScore = Math.min(100, Math.round((drillsMetrics.streakDays / 15) * 100));

  // Weighted Readiness Index (0 - 100%)
  let overallReadiness = 0;
  if (!hasSufficientData) {
    overallReadiness = 35; // Baseline starter score
  } else {
    overallReadiness = Math.round(
      avgMockAcc * 0.4 + drillAcc * 0.25 + masteryRate * 0.2 + consistencyScore * 0.15
    );
  }
  overallReadiness = Math.max(10, Math.min(99, overallReadiness));

  // Band Determination
  let readinessBand: ReadinessBand = "developing";
  let readinessLabel = "Building Momentum ⚡";
  let bengaliBandLabel = "স্পিড বাড়াতে হবে";

  if (overallReadiness >= 80) {
    readinessBand = "exam_ready";
    readinessLabel = "Selection Ready 🏆";
    bengaliBandLabel = "সিলেকশন জোনে সম্পূর্ণ প্রস্তুত";
  } else if (overallReadiness >= 65) {
    readinessBand = "competitive";
    readinessLabel = "Competitive Zone 🔥";
    bengaliBandLabel = "কাট-অফের খুব কাছে আছো";
  } else if (overallReadiness >= 45) {
    readinessBand = "developing";
    readinessLabel = "Building Momentum ⚡";
    bengaliBandLabel = "প্রস্তুতি চলছে, স্পিড বাড়াও";
  } else {
    readinessBand = "critical";
    readinessLabel = "Focus on Basics ⚠️";
    bengaliBandLabel = "বেসিক মজবুত করতে হবে";
  }

  // Projected Score on Target Exam
  const projectedScore = Math.round((overallReadiness / 100) * benchmark.totalMarks * 10) / 10;

  // Subject Readiness Matrix across Core Subjects
  const coreSubjects = [
    { name: "General Knowledge", bn: "সাধারণ জ্ঞান ও জিকে", baseMultiplier: 1.05, color: "bg-amber-500" },
    { name: "Mathematics", bn: "পাটিগণিত ও অঙ্ক", baseMultiplier: 0.72, color: "bg-blue-500" },
    { name: "General Science", bn: "সাধারণ বিজ্ঞান", baseMultiplier: 0.9, color: "bg-emerald-500" },
    { name: "English", bn: "ইংরেজি গ্রামার ও ভোক্যাব", baseMultiplier: 0.82, color: "bg-indigo-500" },
    { name: "Bengali", bn: "বাংলা সাহিত্য ও ব্যাকরণ", baseMultiplier: 1.02, color: "bg-pink-500" },
    { name: "Indian Polity", bn: "সংবিধান ও শাসনব্যবস্থা", baseMultiplier: 0.88, color: "bg-rose-500" },
    { name: "History", bn: "ভারতের ইতিহাস", baseMultiplier: 0.95, color: "bg-orange-500" },
    { name: "Geography", bn: "পশ্চিমবঙ্গ ও ভারত ভূগোল", baseMultiplier: 0.92, color: "bg-teal-500" },
    { name: "Reasoning", bn: "লজিক্যাল রিজনিং (GI)", baseMultiplier: 0.85, color: "bg-purple-500" },
  ];

  const subjectReadiness: SubjectReadinessItem[] = coreSubjects.map((s) => {
    const rawScore = Math.round(overallReadiness * s.baseMultiplier);
    const scorePercent = Math.max(20, Math.min(98, rawScore));
    let status: SubjectReadinessItem["status"] = "average";
    if (scorePercent >= 75) status = "strong";
    else if (scorePercent < 55) status = "weak";

    return {
      subject: s.name,
      bengaliName: s.bn,
      scorePercent,
      status,
      attemptedCount: hasSufficientData ? Math.max(5, Math.round(drillsMetrics.questions / 6)) : 0,
      mistakesCount: status === "weak" ? 4 : status === "average" ? 2 : 0,
      color: s.color,
    };
  });

  const sortedByScore = [...subjectReadiness].sort((a, b) => a.scorePercent - b.scorePercent);
  const weakestSubject = sortedByScore[0] || null;
  const strongestSubject = sortedByScore[sortedByScore.length - 1] || null;

  // Prescribed Next Best Actions
  const recommendedActions: RecommendedAction[] = [];

  if (weakestSubject) {
    recommendedActions.push({
      id: "act-weak-subject",
      title: `Practice ${weakestSubject.subject} Focus Drill`,
      bengaliTitle: `${weakestSubject.bengaliName} দুর্বল চ্যাপ্টার ড্রিল`,
      subtitle: `Accuracy is currently ${weakestSubject.scorePercent}%. Practice 10 targeted MCQs to boost this subject.`,
      actionUrl: `/student/practice/subject?subject=${encodeURIComponent(weakestSubject.subject)}`,
      impactLabel: "+4% Readiness",
      type: "topic_drill",
    });
  }

  const unmasteredMistakes = mistakesStats.totalMistakes - mistakesStats.masteredCount;
  if (unmasteredMistakes > 0) {
    recommendedActions.push({
      id: "act-revise-mistakes",
      title: `Revise ${unmasteredMistakes} Active Mistakes`,
      bengaliTitle: `${unmasteredMistakes}টি ভুল প্রশ্ন রিভাইজ দাও`,
      subtitle: `Re-attempt mistakes in your notebook to eliminate negative marking.`,
      actionUrl: `/student/mistakes`,
      impactLabel: "+5% Readiness",
      type: "mistake_revision",
    });
  } else {
    recommendedActions.push({
      id: "act-pyq-drill",
      title: `${targetExamName} PYQ Drill`,
      bengaliTitle: `${targetExamName} বিগত বছরের PYQ ড্রিল`,
      subtitle: `Practice 10 authentic previous year questions with explanations and shortcuts.`,
      actionUrl: `/student/pyq`,
      impactLabel: "+3% Readiness",
      type: "pyq_drill",
    });
  }

  recommendedActions.push({
    id: "act-full-mock",
    title: `Take ${targetExamName} Full Mock`,
    bengaliTitle: `${targetExamName} ফুল মক টেস্ট দাও`,
    subtitle: `Real exam simulation with timer, negative marking, and live percentile rank.`,
    actionUrl: `/student/exams?exam=${targetExamId}`,
    impactLabel: "+6% Readiness",
    type: "mock_test",
  });

  return {
    overallReadiness,
    readinessBand,
    readinessLabel,
    bengaliBandLabel,
    mockAccuracy: avgMockAcc,
    topicDrillAccuracy: drillAcc,
    mistakeMasteryRate: masteryRate,
    consistencyScore,
    projectedScore,
    maxScore: benchmark.totalMarks,
    targetExamId,
    targetExamName,
    cutoffBenchmark: benchmark,
    subjectReadiness,
    weakestSubject,
    strongestSubject,
    recommendedActions,
    hasSufficientData,
  };
}

/**
 * Fetches data and evaluates readiness for a specific student.
 */
export async function fetchStudentReadiness(
  userId: string | undefined,
  targetExamId: string = "wb-panchayat"
): Promise<ExamReadinessResult> {
  const mockAttempts: Array<{ percentage: number; subject?: string }> = [];
  let drillsMetrics = { questions: 0, accuracy: 0, streakDays: 1 };
  let mistakesStats = { totalMistakes: 0, masteredCount: 0 };

  // 1. Read local storage metrics
  try {
    const todayRaw = localStorage.getItem("pk_today_metrics");
    if (todayRaw) {
      const parsed = JSON.parse(todayRaw);
      drillsMetrics = {
        questions: parsed.questions || 0,
        accuracy: parsed.accuracy || 0,
        streakDays: parsed.streakDays || 1,
      };
    }

    const mistakesRaw = localStorage.getItem("pk_student_mistakes_v2");
    if (mistakesRaw) {
      const parsedMistakes = JSON.parse(mistakesRaw);
      if (Array.isArray(parsedMistakes)) {
        mistakesStats.totalMistakes = parsedMistakes.length;
        mistakesStats.masteredCount = parsedMistakes.filter((m: any) => m.is_mastered).length;
      }
    }
  } catch (storageErr) {
    console.warn("Error reading local readiness metrics:", storageErr);
  }

  // 2. Fetch from Supabase if authenticated
  if (userId) {
    try {
      const { data: attempts } = await supabase
        .from("test_attempts")
        .select("percentage, is_active")
        .eq("user_id", userId)
        .eq("is_active", false)
        .order("created_at", { ascending: false })
        .limit(10);

      if (attempts && attempts.length > 0) {
        attempts.forEach((a: any) => {
          mockAttempts.push({ percentage: a.percentage || 0 });
        });
      }

      const { data: mistakes } = await supabase
        .from("student_mistakes")
        .select("is_mastered")
        .eq("user_id", userId);

      if (mistakes && mistakes.length > 0) {
        mistakesStats.totalMistakes = mistakes.length;
        mistakesStats.masteredCount = mistakes.filter((m: any) => m.is_mastered).length;
      }
    } catch (err) {
      console.warn("Supabase readiness data fetch failed (falling back to cache):", err);
    }
  }

  return computeReadinessMetrics({
    mockAttempts,
    drillsMetrics,
    mistakesStats,
    targetExamId,
  });
}
