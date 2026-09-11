import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ACCESS_RPC,
  Capabilities,
  type AccountStatus,
  type AuthState,
  type Role,
} from "./types";

const BLOCKED_STATUSES: AccountStatus[] = ["rejected", "deactivated"];

/** Derive capabilities from verified roles + account status. Pure. */
export function deriveCapabilities(roles: Role[], status: AccountStatus | null): string[] {
  if (!status || BLOCKED_STATUSES.includes(status)) return [];
  const caps: string[] = [];
  if (
    roles.includes("student") ||
    roles.includes("admin") ||
    roles.includes("super_admin") ||
    roles.includes("instructor")
  ) {
    caps.push(Capabilities.StudentAccess);
  }
  if (roles.includes("admin") || roles.includes("super_admin")) {
    caps.push(Capabilities.AdminAccess, Capabilities.ManageQuestions);
  }
  return caps;
}

interface AccessData {
  roles: Role[];
  status: AccountStatus | null;
}

async function loadAccess(userId: string): Promise<AccessData> {
  // Preferred: single server-side access RPC when deployed.
  try {
    const { data, error } = await (supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>)(
      ACCESS_RPC,
      { p_user_id: userId },
    );
    if (!error && data && typeof data === "object") {
      const d = data as { roles?: unknown; status?: unknown };
      if (Array.isArray(d.roles)) {
        return {
          roles: (d.roles as Role[]).filter((r): r is Role =>
            ["admin", "student", "instructor", "super_admin"].includes(r),
          ),
          status: (typeof d.status === "string" ? d.status : "unknown") as AccountStatus,
        };
      }
    }
  } catch {
    // RPC not deployed yet — fall through to table queries.
  }

  // Fallback: parallel table reads (RLS: own rows only).
  const [rolesRes, statusRes] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("approval_status").select("status").eq("user_id", userId).maybeSingle(),
  ]);
  if (rolesRes.error) throw new Error("Role verification failed. Please retry.");
  const rows = (rolesRes.data ?? []) as Array<{ role: string }>;
  const roles = rows
    .map((r) => r.role)
    .filter((r): r is Role =>
      ["admin", "student", "instructor", "super_admin"].includes(r),
    );
  const status = (
    (statusRes.data as { status?: string } | null)?.status ?? "unknown"
  ) as AccountStatus;
  return { roles, status };
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const EMPTY: Omit<AuthState, "retry"> = {
  session: null,
  user: null,
  roles: [],
  accountStatus: null,
  capabilities: [],
  loading: true,
  error: null,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<Omit<AuthState, "retry">>(EMPTY);
  const [reloadToken, setReloadToken] = useState(0);

  const retry = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    const load = async (sessionOverride?: unknown) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const { data: { session } } =
          sessionOverride !== undefined
            ? { data: { session: sessionOverride } }
            : await supabase.auth.getSession();
        if (cancelled) return;
        if (!session) {
          setState({ ...EMPTY, loading: false });
          return;
        }
        const typed = session as NonNullable<AuthState["session"]>;
        const { roles, status } = await loadAccess(typed.user.id);
        if (cancelled) return;
        setState({
          session: typed,
          user: typed.user,
          roles,
          accountStatus: status,
          capabilities: deriveCapabilities(roles, status),
          loading: false,
          error: null,
        });
      } catch (err) {
        // FAIL CLOSED: no capabilities, no session trust — caller shows retry.
        if (cancelled) return;
        setState({
          ...EMPTY,
          loading: false,
          error: err instanceof Error ? err : new Error("Authentication failed. Please retry."),
        });
      }
    };

    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (!session) {
        setState({ ...EMPTY, loading: false });
      } else {
        load(session);
      }
    });
    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [reloadToken]);

  const value = useMemo<AuthState>(() => ({ ...state, retry }), [state, retry]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
