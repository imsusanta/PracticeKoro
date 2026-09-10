import { supabase } from "@/integrations/supabase/client";
import { DrillConfig, DrillQuestion, DrillResult } from "@/types/drills";
import { FALLBACK_DRILL_QUESTIONS, EXAM_CATALOG } from "@/data/examCatalog";
import { calculateAttemptScore } from "@/services/attemptScoring";

// TODO(types): regenerate supabase types via supabase gen types —
// get_practice_questions is missing from the generated Database functions,
// and student_mistakes is missing from the generated Database tables.
const staleRpc = supabase.rpc as unknown as (
  fn: string,
  args?: Record<string, unknown>
) => Promise<{ data: unknown; error: { message: string } | null }>;

function mistakesTable() {
  return supabase.from("student_mistakes" as unknown as "questions");
}

/**
 * Normalizes question entity from Supabase or fallback.
 */
function normalizeQuestion(raw: any): DrillQuestion {
  return {
    id: raw.id || `gen-${Math.random()}`,
    question_text: raw.question_text || "",
    option_a: raw.option_a || "",
    option_b: raw.option_b || "",
    option_c: raw.option_c || "",
    option_d: raw.option_d || "",
    correct_answer: (raw.correct_answer || "A").toUpperCase().trim(),
    explanation: raw.explanation || null,
    subject: raw.subject || null,
    topic: raw.topic || null,
    difficulty: raw.difficulty || "medium",
    year: raw.year ? Number(raw.year) : null,
    source: raw.source || null,
  };
}

/**
 * RPC-first practice fetch (RLS lockdown: direct questions SELECT is
 * revoked except own attempted/bookmarked; practice answers come via
 * get_practice_questions RPC). Falls back to direct query (admin /
 * pre-migration DBs) then local bank.
 */
async function fetchPracticeViaRpc(args: {
  subject?: string | null;
  topic?: string | null;
  difficulty?: string | null;
  year?: number | null;
  limit: number;
}): Promise<DrillQuestion[] | null> {
  try {
    const { data, error } = await staleRpc("get_practice_questions", {
      p_subject: args.subject ?? null,
      p_topic: args.topic ?? null,
      p_difficulty: args.difficulty ?? null,
      p_year: args.year ?? null,
      p_limit: args.limit,
    });
    if (error || !data) return null;
    const rows = data as any[];
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return rows.map(normalizeQuestion);
  } catch {
    return null;
  }
}

/**
 * Fetches Previous Year Questions matching the filter.
 */
export async function fetchPYQQuestions(filter: Partial<DrillConfig>): Promise<DrillQuestion[]> {
  try {
    // RPC-first (RLS lockdown path)
    const rpcYear =
      filter.year && filter.year !== "all" ? Number(filter.year) : null;
    const rpcRows = await fetchPracticeViaRpc({
      subject: filter.subject && filter.subject !== "all" ? filter.subject : null,
      topic: null,
      difficulty: filter.difficulty && filter.difficulty !== "all" ? filter.difficulty : null,
      year: rpcYear,
      limit: filter.questionCount || 100,
    });
    if (rpcRows && rpcRows.length > 0) {
      const pyq = rpcRows.filter((q) => q.year !== null);
      const pool = pyq.length > 0 ? pyq : rpcRows;
      const results = pool.slice(0, filter.questionCount || 10);
      if (results.length >= (filter.questionCount || 10) || results.length > 0) {
        // Top-up from fallback bank if RPC returned fewer than requested
        if (results.length < (filter.questionCount || 10)) {
          const existingIds = new Set(results.map((r) => r.id));
          for (const fb of FALLBACK_DRILL_QUESTIONS) {
            if (results.length >= (filter.questionCount || 10)) break;
            if (!existingIds.has(fb.id)) {
              if (rpcYear && fb.year !== rpcYear) continue;
              results.push(fb);
            }
          }
        }
        return results;
      }
    }

    let query = supabase
      .from("questions")
      .select("id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, subject, topic, difficulty, year, source")
      .not("year", "is", null);

    if (filter.year && filter.year !== "all") {
      query = query.eq("year", Number(filter.year));
    }

    if (filter.subject && filter.subject !== "all") {
      query = query.eq("subject", filter.subject);
    }

    if (filter.difficulty && filter.difficulty !== "all") {
      query = query.eq("difficulty", filter.difficulty.toLowerCase());
    }

    const limit = filter.questionCount || 100;
    query = query.order("created_at", { ascending: false }).limit(limit);

    const { data, error } = await query;

    let results: DrillQuestion[] = [];
    if (!error && data && data.length > 0) {
      results = data.map(normalizeQuestion);
    }

    // Augment with verified fallback PYQ questions if DB has few or no records
    if (results.length < (filter.questionCount || 10)) {
      const candidates = FALLBACK_DRILL_QUESTIONS.filter((fb) => {
        if (filter.year && filter.year !== "all" && fb.year !== Number(filter.year)) return false;
        if (filter.subject && filter.subject !== "all" && fb.subject?.toLowerCase() !== filter.subject.toLowerCase()) return false;
        if (filter.difficulty && filter.difficulty !== "all" && fb.difficulty?.toLowerCase() !== filter.difficulty.toLowerCase()) return false;
        return true;
      });

      const existingIds = new Set(results.map((r) => r.id));
      for (const fb of candidates) {
        if (!existingIds.has(fb.id)) {
          results.push(fb);
          existingIds.add(fb.id);
        }
      }
    }

    // If still empty and no strict year specified, return all fallback questions
    if (results.length === 0) {
      results = [...FALLBACK_DRILL_QUESTIONS];
    }

    if (filter.questionCount && results.length > filter.questionCount) {
      return results.slice(0, filter.questionCount);
    }

    return results;
  } catch (err) {
    console.warn("fetchPYQQuestions fallback engaged:", err);
    return [...FALLBACK_DRILL_QUESTIONS];
  }
}

/**
 * Fetches Topic-wise Questions.
 */
export async function fetchTopicQuestions(
  subject: string,
  topic?: string,
  difficulty?: string,
  limit: number = 20
): Promise<DrillQuestion[]> {
  try {
    // RPC-first (RLS lockdown path): practice answers via SECURITY DEFINER
    const rpcRows = await fetchPracticeViaRpc({
      subject: subject && subject !== "all" ? subject : null,
      topic: topic && topic !== "All Topics" && topic !== "all" ? topic : null,
      difficulty: difficulty && difficulty !== "all" ? difficulty : null,
      year: null,
      limit: limit * 2,
    });
    if (rpcRows && rpcRows.length > 0) {
      const existingRpcIds = new Set(rpcRows.map((r) => r.id));
      const matchingFallback = FALLBACK_DRILL_QUESTIONS.filter((fb) => {
        if (existingRpcIds.has(fb.id)) return false;
        if (subject && subject !== "all" && fb.subject?.toLowerCase() !== subject.toLowerCase()) return false;
        if (topic && topic !== "All Topics" && topic !== "all" && fb.topic?.toLowerCase() !== topic.toLowerCase()) return false;
        return true;
      });
      const shuffled = [...rpcRows, ...matchingFallback].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, limit);
    }

    let query = supabase
      .from("questions")
      .select("id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, subject, topic, difficulty, year, source");

    if (subject && subject !== "all") {
      query = query.eq("subject", subject);
    }

    if (topic && topic !== "All Topics" && topic !== "all") {
      query = query.eq("topic", topic);
    }

    if (difficulty && difficulty !== "all") {
      query = query.eq("difficulty", difficulty.toLowerCase());
    }

    query = query.order("created_at", { ascending: false }).limit(limit * 2);
    const { data, error } = await query;

    let results: DrillQuestion[] = [];
    if (!error && data && data.length > 0) {
      results = data.map(normalizeQuestion);
    }

    // Merge with matching fallback questions
    const matchingFallback = FALLBACK_DRILL_QUESTIONS.filter((fb) => {
      if (subject && subject !== "all" && fb.subject?.toLowerCase() !== subject.toLowerCase()) return false;
      if (topic && topic !== "All Topics" && topic !== "all" && fb.topic?.toLowerCase() !== topic.toLowerCase()) return false;
      return true;
    });

    const existingIds = new Set(results.map((r) => r.id));
    for (const fb of matchingFallback) {
      if (!existingIds.has(fb.id)) {
        results.push(fb);
        existingIds.add(fb.id);
      }
    }

    if (results.length === 0) {
      results = [...FALLBACK_DRILL_QUESTIONS];
    }

    // Shuffle and slice
    const shuffled = [...results].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, limit);
  } catch (err) {
    console.warn("fetchTopicQuestions fallback engaged:", err);
    return [...FALLBACK_DRILL_QUESTIONS].slice(0, limit);
  }
}

/**
 * Evaluates a completed drill session deterministically.
 */
export function evaluateDrill(
  questions: DrillQuestion[],
  answers: Record<string, string>,
  marksPerQ: number = 1,
  negativeMarks: number = 0.25,
  timeSpentSeconds: number = 0
): DrillResult {
  let attempted = 0;
  let correct = 0;
  let wrong = 0;
  const incorrectQuestions: DrillResult["incorrectQuestions"] = [];

  questions.forEach((q) => {
    const selected = answers[q.id]?.toUpperCase().trim();
    if (!selected) return;

    attempted++;
    const isCorrect = selected === q.correct_answer.toUpperCase().trim();

    if (isCorrect) {
      correct++;
    } else {
      wrong++;
      incorrectQuestions.push({
        question: q,
        selectedAnswer: selected,
        correctAnswer: q.correct_answer,
      });
    }
  });

  const unattempted = questions.length - attempted;
  const rawScore = correct * marksPerQ - wrong * negativeMarks;
  const score = Math.max(0, Math.round(rawScore * 100) / 100);
  const maxScore = questions.length * marksPerQ;
  const accuracyPercentage = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

  return {
    totalQuestions: questions.length,
    attemptedCount: attempted,
    correctCount: correct,
    wrongCount: wrong,
    unattemptedCount: unattempted,
    score,
    maxScore,
    accuracyPercentage,
    timeSpentSeconds,
    incorrectQuestions,
  };
}

/**
 * Synchronizes mistakes made during a drill to student_mistakes and local cache.
 */
export async function syncDrillMistakesToVault(
  userId: string | undefined,
  incorrectList: DrillResult["incorrectQuestions"]
): Promise<number> {
  if (!incorrectList || incorrectList.length === 0) return 0;

  // 1. Update local cache for instantaneous UI responsiveness
  try {
    const cachedRaw = localStorage.getItem("pk_student_mistakes_v2");
    const cached = cachedRaw ? JSON.parse(cachedRaw) : [];

    incorrectList.forEach(({ question, selectedAnswer, correctAnswer }) => {
      const existingIdx = cached.findIndex((m: any) => m.question_id === question.id);
      const mistakeRecord = {
        id: `local-m-${question.id}-${Date.now()}`,
        user_id: userId || "local_student",
        question_id: question.id,
        selected_answer: selectedAnswer,
        correct_answer: correctAnswer,
        error_type: "unclassified",
        student_notes: null,
        is_mastered: false,
        streak: 0,
        question: {
          id: question.id,
          question_text: question.question_text,
          option_a: question.option_a,
          option_b: question.option_b,
          option_c: question.option_c,
          option_d: question.option_d,
          correct_answer: correctAnswer,
          explanation: question.explanation,
          subject: question.subject,
          topic: question.topic,
          difficulty: question.difficulty,
          year: question.year,
        },
      };

      if (existingIdx >= 0) {
        cached[existingIdx] = { ...cached[existingIdx], ...mistakeRecord, is_mastered: false, streak: 0 };
      } else {
        cached.unshift(mistakeRecord);
      }
    });

    localStorage.setItem("pk_student_mistakes_v2", JSON.stringify(cached));
  } catch (storageErr) {
    console.warn("Local mistake cache error:", storageErr);
  }

  // 2. Synchronize to Supabase if authenticated
  if (!userId) return incorrectList.length;

  try {
    const payload = incorrectList.map(({ question, selectedAnswer, correctAnswer }) => ({
      user_id: userId,
      question_id: question.id,
      selected_answer: selectedAnswer,
      correct_answer: correctAnswer,
      is_mastered: false,
      error_type: "unclassified",
      updated_at: new Date().toISOString(),
    }));

    await mistakesTable().upsert(payload as unknown as never, { onConflict: "user_id,question_id" });
  } catch (err) {
    console.warn("Supabase mistakes sync failed (cached locally):", err);
  }

  return incorrectList.length;
}

/**
 * Records practice activity to local storage metrics.
 */
export function recordDrillActivity(result: DrillResult): void {
  try {
    const key = "pk_today_metrics";
    const existingRaw = localStorage.getItem(key);
    const existing = existingRaw
      ? JSON.parse(existingRaw)
      : { questions: 0, accuracy: 0, studyTimeMinutes: 0, streakDays: 1, attempts: 0 };

    const totalQuestions = existing.questions + result.attemptedCount;
    const additionalMinutes = Math.max(1, Math.round(result.timeSpentSeconds / 60));
    const studyTimeMinutes = (existing.studyTimeMinutes || 0) + additionalMinutes;
    const currentAttempts = (existing.attempts || 0) + 1;

    // Running average accuracy
    const prevCorrect = Math.round((existing.accuracy / 100) * existing.questions) || 0;
    const newCorrect = prevCorrect + result.correctCount;
    const newAccuracy = totalQuestions > 0 ? Math.round((newCorrect / totalQuestions) * 100) : result.accuracyPercentage;

    const updated = {
      questions: totalQuestions,
      accuracy: newAccuracy,
      studyTimeMinutes,
      streakDays: existing.streakDays || 1,
      attempts: currentAttempts,
      lastActiveDate: new Date().toISOString().split("T")[0],
    };

    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.warn("recordDrillActivity failed:", err);
  }
}
