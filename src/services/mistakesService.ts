/**
 * Mistakes Notebook & Revision Engine Service
 * Provides pure analytics, re-attempt mechanics, classification management,
 * and resilient local draft caching.
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  ErrorType,
  MistakeItem,
  MistakesAnalytics,
  RevisionDrillFilter,
} from "@/types/mistakes";

const CACHE_KEY = "pk_student_mistakes_v2";

// TODO(types): regenerate supabase types via supabase gen types —
// classify_student_mistake and record_mistake_reattempt are missing from the
// generated Database functions, and student_mistakes is missing from the tables.
const staleRpc = supabase.rpc as unknown as (
  fn: string,
  args?: Record<string, unknown>
) => Promise<{ data: unknown; error: { message: string } | null }>;

function mistakesTable() {
  return supabase.from("student_mistakes" as unknown as "questions");
}

/**
 * Persists mistakes snapshot locally for instant rendering and offline resilience.
 */
export function saveCachedMistakes(mistakes: MistakeItem[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(mistakes));
  } catch (err) {
    console.warn("[MistakesService] LocalStorage save error:", err);
  }
}

/**
 * Retrieves locally cached mistakes.
 */
export function getCachedMistakes(): MistakeItem[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MistakeItem[];
  } catch (err) {
    console.warn("[MistakesService] LocalStorage read error:", err);
    return [];
  }
}

/**
 * Pure evaluation function for re-attempting a mistake question.
 * Returns the updated streak, retry count, and whether the question is mastered.
 */
export function evaluateReAttempt(
  mistake: MistakeItem,
  chosenAnswer: string
): {
  isCorrect: boolean;
  newStreak: number;
  isMastered: boolean;
  retryCount: number;
} {
  const isCorrect = chosenAnswer.trim().toUpperCase() === mistake.correct_answer.trim().toUpperCase();
  const retryCount = (mistake.retry_count || 0) + 1;
  const newStreak = isCorrect ? (mistake.streak || 0) + 1 : 0;
  // A question is mastered when solved correctly in revision
  const isMastered = isCorrect ? true : false;

  return {
    isCorrect,
    newStreak,
    isMastered,
    retryCount,
  };
}

/**
 * Computes deep diagnostic metrics from a collection of mistake items.
 */
export function computeMistakesAnalytics(mistakes: MistakeItem[]): MistakesAnalytics {
  const total = mistakes.length;
  const active = mistakes.filter((m) => !m.is_mastered).length;
  const mastered = mistakes.filter((m) => m.is_mastered).length;
  const masteryRate = total > 0 ? Math.round((mastered / total) * 100) : 0;

  const counts: Record<ErrorType, number> = {
    conceptual: 0,
    careless: 0,
    time_pressure: 0,
    guess: 0,
    unclassified: 0,
  };

  const subjectMap: Record<string, { total: number; active: number; mastered: number }> = {};
  const topicErrorCounts: Record<string, { subject: string; count: number }> = {};

  mistakes.forEach((m) => {
    const errType = (m.error_type || "unclassified") as ErrorType;
    counts[errType] = (counts[errType] || 0) + 1;

    const sub = m.questions?.subject || "General";
    if (!subjectMap[sub]) {
      subjectMap[sub] = { total: 0, active: 0, mastered: 0 };
    }
    subjectMap[sub].total++;
    if (m.is_mastered) subjectMap[sub].mastered++;
    else subjectMap[sub].active++;

    const top = m.questions?.topic || "General";
    if (!m.is_mastered) {
      if (!topicErrorCounts[top]) topicErrorCounts[top] = { subject: sub, count: 0 };
      topicErrorCounts[top].count++;
    }
  });

  const errorTypeBreakdown: Record<ErrorType, { count: number; percentage: number }> = {
    conceptual: { count: counts.conceptual, percentage: total > 0 ? Math.round((counts.conceptual / total) * 100) : 0 },
    careless: { count: counts.careless, percentage: total > 0 ? Math.round((counts.careless / total) * 100) : 0 },
    time_pressure: { count: counts.time_pressure, percentage: total > 0 ? Math.round((counts.time_pressure / total) * 100) : 0 },
    guess: { count: counts.guess, percentage: total > 0 ? Math.round((counts.guess / total) * 100) : 0 },
    unclassified: { count: counts.unclassified, percentage: total > 0 ? Math.round((counts.unclassified / total) * 100) : 0 },
  };

  const subjectBreakdown = Object.entries(subjectMap).map(([subject, stats]) => ({
    subject,
    total: stats.total,
    active: stats.active,
    mastered: stats.mastered,
  })).sort((a, b) => b.active - a.active);

  let weakestSubject: string | null = null;
  let maxActive = -1;
  subjectBreakdown.forEach((s) => {
    if (s.active > maxActive && s.active > 0) {
      maxActive = s.active;
      weakestSubject = s.subject;
    }
  });

  let weakestTopic: string | null = null;
  let maxTopicErrors = -1;
  Object.entries(topicErrorCounts).forEach(([topic, data]) => {
    if (data.count > maxTopicErrors) {
      maxTopicErrors = data.count;
      weakestTopic = topic;
    }
  });

  return {
    totalMistakes: total,
    activeMistakes: active,
    masteredMistakes: mastered,
    masteryRate,
    errorTypeBreakdown,
    subjectBreakdown,
    weakestSubject,
    weakestTopic,
  };
}

/**
 * Filters mistake items based on status, subject, error type, or search term.
 */
export function filterMistakes(mistakes: MistakeItem[], filter: RevisionDrillFilter): MistakeItem[] {
  return mistakes.filter((m) => {
    if (filter.status === "active" && m.is_mastered) return false;
    if (filter.status === "mastered" && !m.is_mastered) return false;
    if (filter.subject && filter.subject !== "all" && m.questions?.subject !== filter.subject) return false;
    if (filter.errorType && filter.errorType !== "all" && m.error_type !== filter.errorType) return false;
    if (filter.minRetryCount && (m.retry_count || 0) < filter.minRetryCount) return false;

    if (filter.searchQuery && filter.searchQuery.trim()) {
      const q = filter.searchQuery.toLowerCase();
      const qText = (m.questions?.question_text || "").toLowerCase();
      const sub = (m.questions?.subject || "").toLowerCase();
      const top = (m.questions?.topic || "").toLowerCase();
      const notes = (m.student_notes || "").toLowerCase();
      return qText.includes(q) || sub.includes(q) || top.includes(q) || notes.includes(q);
    }

    return true;
  });
}

/**
 * Fetches all student mistakes from Supabase.
 */
export async function fetchStudentMistakes(userId: string): Promise<MistakeItem[]> {
  const { data, error } = await mistakesTable()
    .select(`
      id,
      question_id,
      attempt_id,
      selected_answer,
      correct_answer,
      is_mastered,
      retry_count,
      streak,
      error_type,
      student_notes,
      last_retry_at,
      mastered_at,
      created_at,
      updated_at,
      questions (
        id,
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_answer,
        explanation,
        subject,
        topic,
        difficulty,
        year
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.warn("[MistakesService] Failed to load remote mistakes, falling back to cache:", error?.message);
    const cached = getCachedMistakes();
    return cached;
  }

  const mapped: MistakeItem[] = data
    .map((item: any) => {
      const q = Array.isArray(item.questions) ? item.questions[0] : item.questions;
      if (!q) return null;
      return {
        id: item.id,
        question_id: item.question_id,
        attempt_id: item.attempt_id,
        selected_answer: item.selected_answer,
        correct_answer: item.correct_answer || q.correct_answer,
        is_mastered: Boolean(item.is_mastered),
        retry_count: item.retry_count || 1,
        streak: item.streak || 0,
        error_type: (item.error_type || "unclassified") as ErrorType,
        student_notes: item.student_notes || null,
        last_retry_at: item.last_retry_at,
        mastered_at: item.mastered_at,
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at,
        questions: {
          id: q.id,
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          subject: q.subject,
          topic: q.topic,
          difficulty: q.difficulty,
          year: q.year,
        },
      };
    })
    .filter(Boolean) as MistakeItem[];

  saveCachedMistakes(mapped);
  return mapped;
}

/**
 * Updates a mistake's error classification and reflection notes.
 */
export async function classifyStudentMistake(
  mistakeId: string,
  errorType: ErrorType,
  studentNotes?: string | null
): Promise<boolean> {
  // Try RPC first
  const { error: rpcErr } = await staleRpc("classify_student_mistake", {
    p_mistake_id: mistakeId,
    p_error_type: errorType,
    p_student_notes: studentNotes || null,
  });

  if (!rpcErr) return true;

  // Fallback direct table update
  const { error: updateErr } = await mistakesTable()
    .update({
      error_type: errorType,
      student_notes: studentNotes ?? null,
      updated_at: new Date().toISOString(),
    } as unknown as never)
    .eq("id", mistakeId);

  return !updateErr;
}

/**
 * Records a re-attempt result for a mistake item.
 */
export async function recordMistakeReattempt(
  mistakeId: string,
  isCorrect: boolean
): Promise<{ success: boolean; isMastered: boolean }> {
  // Try RPC
  const { data, error } = await staleRpc("record_mistake_reattempt", {
    p_mistake_id: mistakeId,
    p_is_correct: isCorrect,
  });

  if (!error && data) {
    return { success: true, isMastered: Boolean((data as any).isMastered) };
  }

  // Fallback direct table update
  const { error: updateErr } = await mistakesTable()
    .update({
      is_mastered: isCorrect,
      mastered_at: isCorrect ? new Date().toISOString() : null,
      last_retry_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as never)
    .eq("id", mistakeId);

  return { success: !updateErr, isMastered: isCorrect };
}

/**
 * Toggles mastery status directly.
 */
export async function toggleMistakeMastered(
  mistakeId: string,
  nextMastered: boolean
): Promise<boolean> {
  const { error } = await mistakesTable()
    .update({
      is_mastered: nextMastered,
      mastered_at: nextMastered ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    } as unknown as never)
    .eq("id", mistakeId);

  return !error;
}
