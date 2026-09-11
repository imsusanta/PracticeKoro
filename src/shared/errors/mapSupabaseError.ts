import {
  AppError,
  AttemptAlreadySubmittedError,
  AttemptExpiredError,
  AuthenticationError,
  AuthorizationError,
  DataIntegrityError,
  NetworkError,
  ValidationError,
} from "./appErrors";

interface SupabaseLikeError {
  message?: string;
  code?: string;
  status?: number;
  details?: string;
  hint?: string;
}

const NETWORK_HINTS = ["fetch failed", "network", "timeout", "econn", "enotfound", "offline"];

/**
 * Map any Supabase/Postgrest/Auth failure to a typed AppError.
 * Never surfaces SQL, hints, or stack traces to the user.
 */
export function mapSupabaseError(raw: unknown, context?: string): AppError {
  if (raw instanceof AppError) return raw;
  const err = (raw ?? {}) as SupabaseLikeError;
  const message = `${err.message ?? ""} ${err.code ?? ""}`.toLowerCase();
  void context;

  if (NETWORK_HINTS.some((h) => message.includes(h))) {
    return new NetworkError();
  }
  if (err.status === 401 || message.includes("jwt") || message.includes("not authenticated")) {
    return new AuthenticationError();
  }
  if (
    err.status === 403 ||
    message.includes("permission denied") ||
    message.includes("policy") ||
    message.includes("unauthorized")
  ) {
    return new AuthorizationError();
  }
  if (
    message.includes("already submitted") ||
    message.includes("already completed") ||
    err.code === "23505"
  ) {
    return new AttemptAlreadySubmittedError("unknown");
  }
  if (message.includes("expired")) {
    return new AttemptExpiredError();
  }
  if (
    err.code === "22P02" ||
    err.code === "23502" ||
    err.code === "23514" ||
    message.includes("invalid input") ||
    message.includes("violates check constraint")
  ) {
    return new ValidationError();
  }
  if (err.code === "PGRST202" || err.code === "PGRST204" || message.includes("schema cache")) {
    return new DataIntegrityError("Something looks inconsistent. Please retry.");
  }
  return new DataIntegrityError();
}

/** Extract only the safe message for toasts/banners. */
export function toUserMessage(raw: unknown): string {
  return mapSupabaseError(raw).userMessage;
}
