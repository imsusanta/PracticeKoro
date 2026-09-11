/**
 * Deterministic Attempt Scoring Engine — compatibility shim.
 * Canonical implementation lives in features/attempts/domain/scoring.
 * New code must import from "@/features/attempts/domain" instead.
 */
export {
  calculateAttemptScore,
  roundToTwoDecimals,
} from "@/features/attempts/domain/scoring";
export type {
  QuestionScoringRule,
  ScoreCalculationInput,
  CalculatedAttemptResult,
} from "@/features/attempts/domain/scoring";
