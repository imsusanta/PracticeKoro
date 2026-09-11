/**
 * Attempt timing domain — pure deadline math (no timers, no DOM).
 * The server deadline (expires_at) is authoritative; these helpers
 * only derive display/transition decisions from it.
 */

/** Whole seconds remaining until expiry; never negative. */
export function remainingSeconds(expiresAtMs: number, nowMs: number): number {
  return Math.max(0, Math.floor((expiresAtMs - nowMs) / 1000));
}

/** True once the server deadline has passed. */
export function isExpired(expiresAtMs: number, nowMs: number): boolean {
  return nowMs >= expiresAtMs;
}

/**
 * Whether the deadline passed allowing a small grace window for
 * network latency (mirrors the server's 10s grace in save_exam_progress).
 */
export function isExpiredWithGrace(
  expiresAtMs: number,
  nowMs: number,
  graceMs = 10_000,
): boolean {
  return nowMs > expiresAtMs + graceMs;
}

/** Format seconds as M:SS for the test header. */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
