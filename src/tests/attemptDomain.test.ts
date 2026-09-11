import { describe, it, expect } from "vitest";
import {
  remainingSeconds,
  isExpired,
  isExpiredWithGrace,
  formatCountdown,
} from "@/features/attempts/domain/timing";
import {
  normalizeAnswer,
  isCorrectAnswer,
  isValidOption,
} from "@/features/attempts/domain/answerValidation";
import {
  canSaveAnswer,
  canSubmit,
  canResume,
  type AttemptState,
} from "@/features/attempts/domain/attemptRules";

const live: AttemptState = {
  id: "a1",
  userId: "u1",
  status: "in_progress",
  expiresAtMs: 1_000_000,
};
const NOW = 500_000;

describe("attempt timing domain", () => {
  it("computes remaining seconds floored at zero", () => {
    expect(remainingSeconds(1_000_000, 999_500)).toBe(0);
    expect(remainingSeconds(1_000_000, 940_000)).toBe(60);
    expect(remainingSeconds(1_000_000, 2_000_000)).toBe(0);
  });

  it("detects expiry at the deadline with grace window", () => {
    expect(isExpired(1_000_000, 999_999)).toBe(false);
    expect(isExpired(1_000_000, 1_000_000)).toBe(true);
    expect(isExpiredWithGrace(1_000_000, 1_005_000)).toBe(false);
    expect(isExpiredWithGrace(1_000_000, 1_015_000)).toBe(true);
  });

  it("formats countdown as M:SS", () => {
    expect(formatCountdown(90)).toBe("1:30");
    expect(formatCountdown(5)).toBe("0:05");
    expect(formatCountdown(-3)).toBe("0:00");
  });
});

describe("answer validation domain", () => {
  it("normalizes blanks to unanswered", () => {
    expect(normalizeAnswer(null)).toBeNull();
    expect(normalizeAnswer("  ")).toBeNull();
    expect(normalizeAnswer(" b ")).toBe("B");
  });

  it("compares case-insensitively, blanks never correct", () => {
    expect(isCorrectAnswer("b", "B")).toBe(true);
    expect(isCorrectAnswer(null, "B")).toBe(false);
    expect(isCorrectAnswer("", "B")).toBe(false);
    expect(isCorrectAnswer("A", "B")).toBe(false);
  });

  it("accepts only A-D options", () => {
    expect(isValidOption("C")).toBe(true);
    expect(isValidOption("E")).toBe(false);
    expect(isValidOption(null)).toBe(false);
  });
});

describe("attempt lifecycle rules", () => {
  it("allows save/submit/resume for a live owned attempt", () => {
    expect(canSaveAnswer(live, "u1", NOW)).toBeNull();
    expect(canSubmit(live, "u1", NOW)).toBeNull();
    expect(canResume(live, "u1", NOW)).toBeNull();
  });

  it("rejects other users", () => {
    expect(canSaveAnswer(live, "u2", NOW)).toBe("NOT_OWNER");
    expect(canSubmit(live, "u2", NOW)).toBe("NOT_OWNER");
  });

  it("blocks writes to completed attempts but allows idempotent re-submit", () => {
    const done: AttemptState = { ...live, status: "completed" };
    expect(canSaveAnswer(done, "u1", NOW)).toBe("ALREADY_COMPLETED");
    expect(canSubmit(done, "u1", NOW)).toBeNull();
  });

  it("blocks expired attempts", () => {
    expect(canSaveAnswer(live, "u1", 2_000_000)).toBe("EXPIRED");
    expect(canSubmit(live, "u1", 2_000_000)).toBe("EXPIRED");
  });

  it("allows untimed attempts regardless of clock", () => {
    const untimed: AttemptState = { ...live, expiresAtMs: null };
    expect(canSaveAnswer(untimed, "u1", 9_999_999_999)).toBeNull();
  });
});
