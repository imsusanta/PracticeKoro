import { describe, it, expect, vi, beforeEach } from "vitest";
import { submitAttempt, clearLocalDraft } from "@/services/attemptEngineService";
import type { SubmitAttemptRequest } from "@/types/attemptEngine";

// The service reads an optional testId fallback hint absent from the
// public request type (same narrow extension TakeTest uses locally).
type TestSubmitRequest = SubmitAttemptRequest & { testId?: string };

/**
 * Characterization locks for submitAttempt (mocked Supabase boundary).
 * These pin CURRENT behavior so the PR-4 repository extraction
 * cannot silently change submission semantics.
 */

const mockState = vi.hoisted(() => ({
  session: null as unknown,
  rpcImpl: null as null | ((fn: string) => Promise<{ data: unknown; error: unknown }>),
}));

vi.mock("@/integrations/supabase/client", () => {
  const chain: Record<string, unknown> = {
    data: null,
    error: null,
  };
  const self = () => chain;
  for (const m of ["select", "eq", "not", "neq", "order", "limit", "maybeSingle", "single", "is", "in", "or", "upsert", "insert", "update", "delete"]) {
    (chain as Record<string, unknown>)[m] = (..._args: unknown[]) => {
      if (m === "maybeSingle" || m === "single") {
        return Promise.resolve({ data: null, error: null });
      }
      return self();
    };
  }
  (chain as Record<string, unknown>).then = (
    resolve?: (v: unknown) => unknown,
    reject?: (e: unknown) => unknown,
  ) => Promise.resolve({ data: null, error: null }).then(resolve as never, reject as never);
  return {
    supabase: {
      auth: {
        getSession: async () => ({ data: { session: mockState.session } }),
        getUser: async () => ({ data: { user: mockState.session ? (mockState.session as { user: unknown }).user : null } }),
      },
      rpc: (fn: string, args?: unknown) =>
        mockState.rpcImpl ? mockState.rpcImpl(fn) : Promise.resolve({ data: null, error: { message: "no rpc" } }),
      from: () => chain,
    },
  };
});

const SESSION = { user: { id: "student-1", email: "s@example.com" } };

function stubStorage() {
  const store: Record<string, string> = {};
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = String(v);
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    },
    writable: true,
    configurable: true,
  });
  return store;
}

describe("submitAttempt characterization", () => {
  beforeEach(() => {
    stubStorage();
    mockState.session = null;
    mockState.rpcImpl = null;
    vi.clearAllMocks();
  });

  it("returns the server result verbatim when the RPC succeeds", async () => {
    mockState.session = SESSION;
    const serverResult = {
      attemptId: "att-1",
      testId: "test-1",
      status: "completed",
      score: 42,
      totalMarks: 100,
      percentage: 42,
      correctCount: 5,
      incorrectCount: 3,
      unansweredCount: 2,
      passed: true,
      submittedAt: new Date().toISOString(),
    };
    mockState.rpcImpl = async (fn: string) =>
      fn === "submit_exam_attempt"
        ? { data: serverResult, error: null }
        : { data: null, error: { message: "no rpc" } };

    const req: TestSubmitRequest = {
      attemptId: "att-1",
      testId: "test-1",
      finalAnswers: {},
      timeTakenSeconds: 60,
      tabViolations: 0,
      fullscreenViolations: 0,
    };
    const res = await submitAttempt(req);
    expect(res).toEqual(serverResult);
  });

  it("throws authentication error when RPC is down and no session exists", async () => {
    mockState.session = null;
    const req: TestSubmitRequest = { attemptId: "att-1", testId: "test-1", finalAnswers: {} };
    await expect(submitAttempt(req)).rejects.toThrow(/Authentication required/);
  });

  it("scores topic-practice locally when the server RPC is down", async () => {
    mockState.session = SESSION;
    const req: TestSubmitRequest = {
      attemptId: "topic-draft-1",
      testId: "topic-some-id",
      finalAnswers: {},
      timeTakenSeconds: 30,
    };
    const res = await submitAttempt(req);
    expect(res.status).toBe("completed");
    expect(typeof res.score).toBe("number");
  });

  it("refuses to persist a local-bank score for real tests when grading is down", async () => {
    mockState.session = SESSION;
    const req: TestSubmitRequest = {
      attemptId: "11111111-2222-4333-8555-666666666666",
      testId: "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee",
      finalAnswers: { "q-1": "A" },
      timeTakenSeconds: 120,
    };
    await expect(submitAttempt(req)).rejects.toThrow(/Server grading unavailable/);
  });

  it("clearLocalDraft never throws", () => {
    expect(() => clearLocalDraft("missing")).not.toThrow();
  });
});
