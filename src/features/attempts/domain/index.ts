// Public API of the attempts domain. Pure — no Supabase, no DOM.
export {
  calculateAttemptScore,
  roundToTwoDecimals,
} from "./scoring";
export type {
  QuestionScoringRule,
  ScoreCalculationInput,
  CalculatedAttemptResult,
} from "./scoring";
export {
  remainingSeconds,
  isExpired,
  isExpiredWithGrace,
  formatCountdown,
} from "./timing";
export { normalizeAnswer, isCorrectAnswer, isValidOption } from "./answerValidation";
export { canSaveAnswer, canSubmit, canResume } from "./attemptRules";
export type { AttemptStatus, AttemptState, TransitionError } from "./attemptRules";
