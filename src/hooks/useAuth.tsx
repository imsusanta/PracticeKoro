import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAccessFlags, type AccessFlags } from "@/lib/auth";
import type { Session, User } from "@supabase/supabase-js";

type AuthStatus = "loading" | "ready";

type AuthState = AccessFlags & {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
};

type AuthContextValue = AuthState & {
  refresh: () => Promise<void>;
};

const emptyAccess: AccessFlags = {
  roles: [],
  isAdmin: false,
  isStudent: false,
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function buildState(session: Session | null): Promise<AuthState> {
  if (!session?.user) {
    return { status: "ready", session: null, user: null, ...emptyAccess };
  }
  const flags = await getAccessFlags(session.user.id);
  return { status: "ready", session, user: session.user, ...flags };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    status: "loading",
    session: null,
    user: null,
    ...emptyAccess,
  });

  const applySession = useCallback(async (session: Session | null) => {
    const next = await buildState(session);
    setState(next);
  }, []);

  useEffect(() => {
    let generation = 0;
    let cancelled = false;

    const apply = (session: Session | null) => {
      const current = ++generation;
      void buildState(session).then((next) => {
        if (cancelled || current !== generation) return;
        setState(next);
      });
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session);
    });

    // Fallback if INITIAL_SESSION is delayed or missing.
    void supabase.auth.getSession().then(({ data }) => {
      apply(data.session);
    });

    return () => {
      cancelled = true;
      generation = -1;
      subscription.unsubscribe();
    };
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await applySession(data.session);
  }, [applySession]);

  const value = useMemo<AuthContextValue>(() => ({ ...state, refresh }), [state, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
