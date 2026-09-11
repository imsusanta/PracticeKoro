/** Typed application errors. User-facing messages must never leak DB internals. */

export type ErrorCode =
  | "AUTHENTICATION"
  | "AUTHORIZATION"
  | "VALIDATION"
  | "NETWORK"
  | "ATTEMPT_EXPIRED"
  | "ATTEMPT_ALREADY_SUBMITTED"
  | "DATA_INTEGRITY";

export class AppError extends Error {
  readonly code: ErrorCode;
  /** Safe to display to the user. */
  readonly userMessage: string;

  constructor(code: ErrorCode, userMessage: string, options?: ErrorOptions) {
    super(userMessage, options);
    this.name = new.target.name;
    this.code = code;
    this.userMessage = userMessage;
  }
}

export class AuthenticationError extends AppError {
  constructor(userMessage = "Please log in to continue.") {
    super("AUTHENTICATION", userMessage);
  }
}

export class AuthorizationError extends AppError {
  constructor(userMessage = "You don't have access to this. Please retry.") {
    super("AUTHORIZATION", userMessage);
  }
}

export class ValidationError extends AppError {
  constructor(userMessage = "Some details look invalid. Please check and retry.") {
    super("VALIDATION", userMessage);
  }
}

export class NetworkError extends AppError {
  constructor(userMessage = "Network error. Please check your connection and retry.") {
    super("NETWORK", userMessage);
  }
}

export class AttemptExpiredError extends AppError {
  constructor(userMessage = "This attempt has expired. Your saved answers are kept as a draft.") {
    super("ATTEMPT_EXPIRED", userMessage);
  }
}

export class AttemptAlreadySubmittedError extends AppError {
  readonly attemptId: string;
  constructor(attemptId: string) {
    super("ATTEMPT_ALREADY_SUBMITTED", "This test was already submitted. Showing the stored result.");
    this.attemptId = attemptId;
  }
}

export class DataIntegrityError extends AppError {
  constructor(userMessage = "Something looks inconsistent. Please retry.") {
    super("DATA_INTEGRITY", userMessage);
  }
}
