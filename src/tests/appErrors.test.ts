import { describe, it, expect } from "vitest";
import {
  AppError,
  AttemptAlreadySubmittedError,
  AttemptExpiredError,
  AuthenticationError,
  AuthorizationError,
  DataIntegrityError,
  NetworkError,
  ValidationError,
  mapSupabaseError,
  toUserMessage,
} from "@/shared/errors";

describe("typed errors + Supabase mapping (no internal leakage)", () => {
  it("keeps user messages free of SQL and internals", () => {
    const err = mapSupabaseError({
      message: 'permission denied for table questions; SQL: SELECT * FROM "questions"',
      code: "42501",
    });
    expect(err).toBeInstanceOf(AuthorizationError);
    expect(err.userMessage).not.toContain("SQL");
    expect(err.userMessage).not.toContain("questions");
  });

  it("maps network failures", () => {
    expect(mapSupabaseError(new TypeError("fetch failed"))).toBeInstanceOf(NetworkError);
  });

  it("maps 401 to authentication and 403 to authorization", () => {
    expect(mapSupabaseError({ status: 401 })).toBeInstanceOf(AuthenticationError);
    expect(mapSupabaseError({ status: 403 })).toBeInstanceOf(AuthorizationError);
  });

  it("maps duplicate submission (unique violation) with attempt id preserved", () => {
    const err = mapSupabaseError({ code: "23505" });
    expect(err).toBeInstanceOf(AttemptAlreadySubmittedError);
  });

  it("maps expiry and validation codes", () => {
    expect(mapSupabaseError({ message: "attempt expired" })).toBeInstanceOf(AttemptExpiredError);
    expect(mapSupabaseError({ code: "22P02" })).toBeInstanceOf(ValidationError);
  });

  it("maps missing-function schema-cache errors to data integrity", () => {
    const err = mapSupabaseError({ code: "PGRST202", message: "schema cache" });
    expect(err).toBeInstanceOf(DataIntegrityError);
    expect(err.userMessage).not.toContain("PGRST202");
  });

  it("passes AppError through untouched and exposes safe messages", () => {
    const original = new ValidationError("Custom safe message.");
    expect(mapSupabaseError(original)).toBe(original);
    expect(toUserMessage({ code: "XX000", message: "secret internals" })).not.toContain("secret");
  });

  it("AttemptAlreadySubmittedError retains the attempt id", () => {
    expect(new AttemptAlreadySubmittedError("att-1").attemptId).toBe("att-1");
  });
});
