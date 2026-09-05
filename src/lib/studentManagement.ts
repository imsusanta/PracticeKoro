import { supabase } from "@/integrations/supabase/client";

export interface StudentPerformance {
  attempts: number;
  passed: number;
  bestScore: number | null;
  averageScore: number | null;
  passRate: number | null;
}

export interface AttemptRow {
  user_id: string;
  percentage: number | null;
  passed: boolean | null;
  is_active?: boolean | null;
}

export function hasActiveSubscription(purchases?: { content_type?: string; created_at?: string }[] | null): boolean {
  return Boolean(
    purchases?.some((purchase) => {
      if (purchase.content_type !== "subscription") return false;
      const expiryDate = new Date(purchase.created_at || "");
      expiryDate.setDate(expiryDate.getDate() + 365);
      return new Date() < expiryDate;
    }),
  );
}

export function computeExpiresAt(duration: string, customDate?: string): string | null {
  if (duration === "30days") {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString();
  }
  if (duration === "60days") {
    const date = new Date();
    date.setDate(date.getDate() + 60);
    return date.toISOString();
  }
  if (duration === "90days") {
    const date = new Date();
    date.setDate(date.getDate() + 90);
    return date.toISOString();
  }
  if (duration === "custom" && customDate) {
    return new Date(customDate).toISOString();
  }
  return null;
}

export function emptyPerformance(): StudentPerformance {
  return {
    attempts: 0,
    passed: 0,
    bestScore: null,
    averageScore: null,
    passRate: null,
  };
}

export function summarizeAttempts(attempts: Pick<AttemptRow, "percentage" | "passed" | "is_active">[]): StudentPerformance {
  const completed = attempts.filter((attempt) => attempt.is_active !== true);
  if (completed.length === 0) return emptyPerformance();

  const scores = completed
    .map((attempt) => Number(attempt.percentage))
    .filter((score) => Number.isFinite(score));
  const passed = completed.filter((attempt) => attempt.passed).length;

  return {
    attempts: completed.length,
    passed,
    bestScore: scores.length ? Math.round(Math.max(...scores)) : null,
    averageScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
    passRate: Math.round((passed / completed.length) * 100),
  };
}

export function aggregatePerformanceByUser(attempts: AttemptRow[] | null | undefined): Record<string, StudentPerformance> {
  const grouped = new Map<string, AttemptRow[]>();
  (attempts || []).forEach((attempt) => {
    const existing = grouped.get(attempt.user_id) || [];
    existing.push(attempt);
    grouped.set(attempt.user_id, existing);
  });

  const result: Record<string, StudentPerformance> = {};
  grouped.forEach((userAttempts, userId) => {
    result[userId] = summarizeAttempts(userAttempts);
  });
  return result;
}

export async function getDeactivatedAccountMessage(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_active, deactivation_reason")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data || data.is_active !== false) return null;
  const reason = data.deactivation_reason?.trim();
  return reason || "Your account has been deactivated. Contact the administrator.";
}
