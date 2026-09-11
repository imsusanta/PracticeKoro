/**
 * Answer validation domain — canonical normalization + comparison.
 * Single source of truth so client previews match server grading
 * (UPPER + trim on both sides).
 */

/** Canonical form for stored/compared answers. Null/blank → null (unanswered). */
export function normalizeAnswer(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const t = String(value).trim().toUpperCase();
  return t === "" ? null : t;
}

/** True when a normalized selection matches the normalized key. */
export function isCorrectAnswer(
  selected: string | null | undefined,
  correctAnswer: string,
): boolean {
  const s = normalizeAnswer(selected);
  if (!s) return false;
  return s === String(correctAnswer).trim().toUpperCase();
}

/** Valid option letters for single-choice questions. */
const VALID_OPTIONS = new Set(["A", "B", "C", "D"]);

/** True when the value is a usable option selection. */
export function isValidOption(value: string | null | undefined): boolean {
  const n = normalizeAnswer(value);
  return n !== null && VALID_OPTIONS.has(n);
}
