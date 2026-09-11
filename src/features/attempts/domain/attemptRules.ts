/**
 * Attempt lifecycle rules — pure status-transition guards.
 * Mirrors the server contract (submit_exam_attempt RPC):
 * completed/expired attempts reject further writes; only the owner
 * may mutate; only in-progress, unexpired attempts accept answers.
 */

export type AttemptStatus = "in_progress" | "completed" | "expired";

export interface AttemptState {
  id: string;
  userId: string;
  status: AttemptStatus;
  /** Epoch ms of the server deadline; null when untimed. */
  expiresAtMs: number | null;
}

export type TransitionError =
  | "NOT_OWNER"
  | "ALREADY_COMPLETED"
  | "EXPIRED"
  | "INVALID_STATUS";

/** Can answers still be saved for this attempt? Null = allowed. */
export function canSaveAnswer(
  attempt: AttemptState,
  actorUserId: string,
  nowMs: number,
): TransitionError | null {
  if (attempt.userId !== actorUserId) return "NOT_OWNER";
  if (attempt.status === "completed") return "ALREADY_COMPLETED";
  if (attempt.status !== "in_progress") return "INVALID_STATUS";
  if (attempt.expiresAtMs !== null && nowMs >= attempt.expiresAtMs) return "EXPIRED";
  return null;
}

/** Can this attempt be submitted (first or idempotent re-submit)? */
export function canSubmit(
  attempt: AttemptState,
  actorUserId: string,
  nowMs: number,
): TransitionError | null {
  if (attempt.userId !== actorUserId) return "NOT_OWNER";
  // Re-submitting a completed attempt is idempotent — the server
  // returns the stored snapshot instead of re-grading.
  if (attempt.status === "completed") return null;
  if (attempt.status !== "in_progress") return "INVALID_STATUS";
  if (attempt.expiresAtMs !== null && nowMs >= attempt.expiresAtMs) return "EXPIRED";
  return null;
}

/** Can an interrupted session resume into this attempt? */
export function canResume(
  attempt: AttemptState,
  actorUserId: string,
  nowMs: number,
): TransitionError | null {
  return canSaveAnswer(attempt, actorUserId, nowMs);
}
