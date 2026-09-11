import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import {
  AuthProvider,
  RequireAuth,
  RequireCapability,
  Capabilities,
  useAuth,
} from "@/features/auth";

const mockState = vi.hoisted(() => ({
  session: null as unknown,
  roles: [] as Array<{ role: string }>,
  approval: null as unknown,
  failRoles: false,
  sessionCalls: 0,
}));

vi.mock("@/integrations/supabase/client", () => {
  const terminal = (result: { data: unknown; error: unknown }) => ({
    then: (
      resolve?: (v: { data: unknown; error: unknown }) => unknown,
      reject?: (e: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve as never, reject as never),
  });
  const chainFor = (table: string) => {
    const result =
      table === "user_roles"
        ? mockState.failRoles
          ? { rejected: true }
          : { data: mockState.roles, error: null }
        : { data: mockState.approval, error: null };
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    chain.select = self;
    chain.eq = self;
    chain.maybeSingle = () =>
      "rejected" in result
        ? Promise.reject(new Error("role query failed"))
        : Promise.resolve(result);
    chain.then = (
      resolve?: (v: unknown) => unknown,
      reject?: (e: unknown) => unknown,
    ) =>
      "rejected" in result
        ? Promise.reject(new Error("role query failed")).then(resolve as never, reject as never)
        : terminal(result as { data: unknown; error: unknown }).then(resolve, reject);
    return chain;
  };
  return {
    supabase: {
      auth: {
        getSession: async () => {
          mockState.sessionCalls += 1;
          return { data: { session: mockState.session } };
        },
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => undefined } },
        }),
      },
      rpc: async () => ({ data: null, error: { message: "no rpc" } }),
      from: (table: string) => chainFor(table),
    },
  };
});

function resetState() {
  mockState.session = null;
  mockState.roles = [];
  mockState.approval = null;
  mockState.failRoles = false;
  mockState.sessionCalls = 0;
}

const authedSession = (id: string) =>
  ({
    user: { id, email: "s@example.com" },
    access_token: "t",
  }) as unknown;

describe("AuthProvider + guards", () => {
  beforeEach(resetState);

  it("exposes empty access when signed out", async () => {
    const Probe = () => {
      const s = useAuth();
      return <div>{s.loading ? "loading" : `caps:${s.capabilities.length}`}</div>;
    };
    render(
      <MemoryRouter>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(await screen.findByText("caps:0")).toBeDefined();
  });

  it("grants student access for a verified approved student", async () => {
    mockState.session = authedSession("u1");
    mockState.roles = [{ role: "student" }];
    mockState.approval = { status: "approved" };
    render(
      <MemoryRouter initialEntries={["/student/dashboard"]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/student/dashboard"
              element={
                <RequireAuth>
                  <RequireCapability capability={Capabilities.StudentAccess}>
                    <div>student-ok</div>
                  </RequireCapability>
                </RequireAuth>
              }
            />
            <Route path="/login" element={<div>login-page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(await screen.findByText("student-ok")).toBeDefined();
  });

  it("fails closed with a retry screen when role verification fails", async () => {
    mockState.session = authedSession("u2");
    mockState.failRoles = true;
    render(
      <MemoryRouter initialEntries={["/student/dashboard"]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/student/dashboard"
              element={
                <RequireAuth>
                  <div>should-never-show</div>
                </RequireAuth>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(await screen.findByText(/Couldn't verify access/)).toBeDefined();
    expect(screen.queryByText("should-never-show")).toBeNull();
    const callsBefore = mockState.sessionCalls;
    fireEvent.click(screen.getByText("Retry"));
    await waitFor(() => {
      expect(mockState.sessionCalls).toBeGreaterThan(callsBefore);
    });
  });

  it("redirects unauthenticated users to login", async () => {
    render(
      <MemoryRouter initialEntries={["/student/dashboard"]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/student/dashboard"
              element={
                <RequireAuth>
                  <div>secret</div>
                </RequireAuth>
              }
            />
            <Route path="/login" element={<div>login-page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(await screen.findByText("login-page")).toBeDefined();
  });

  it("denies admin capability to students", async () => {
    mockState.session = authedSession("u3");
    mockState.roles = [{ role: "student" }];
    mockState.approval = { status: "approved" };
    render(
      <MemoryRouter initialEntries={["/admin/dashboard"]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/admin/dashboard"
              element={
                <RequireCapability capability={Capabilities.AdminAccess} deniedPath="/denied">
                  <div>admin-ok</div>
                </RequireCapability>
              }
            />
            <Route path="/denied" element={<div>denied-page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(await screen.findByText("denied-page")).toBeDefined();
  });
});
