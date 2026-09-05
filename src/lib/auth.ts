import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = Database["public"]["Enums"]["app_role"];

export type AccessFlags = {
  roles: AppRole[];
  isAdmin: boolean;
  isStudent: boolean;
};

export type ResolvedAuth = AccessFlags & {
  session: Session | null;
  user: User | null;
};

const EMPTY_ACCESS: AccessFlags = {
  roles: [],
  isAdmin: false,
  isStudent: false,
};

/**
 * Server-side role check via security-definer RPC.
 * Prefer this over querying `user_roles` directly — RLS on that table
 * is a common source of false "not an admin" failures.
 */
export async function hasRole(userId: string, role: AppRole): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: role,
  });
  if (error) {
    console.error(`[auth] has_role(${role}) failed:`, error.message);
    return false;
  }
  return data === true;
}

export async function getAccessFlags(userId: string): Promise<AccessFlags> {
  const [admin, superAdmin, student] = await Promise.all([
    hasRole(userId, "admin"),
    hasRole(userId, "super_admin"),
    hasRole(userId, "student"),
  ]);

  const roles: AppRole[] = [];
  if (student) roles.push("student");
  if (admin) roles.push("admin");
  if (superAdmin) roles.push("super_admin");

  return {
    roles,
    isAdmin: admin || superAdmin,
    isStudent: student,
  };
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("[auth] getSession failed:", error.message);
    return null;
  }
  return data.session ?? null;
}

export async function resolveAuth(): Promise<ResolvedAuth> {
  const session = await getSession();
  if (!session?.user) {
    return { session: null, user: null, ...EMPTY_ACCESS };
  }
  const flags = await getAccessFlags(session.user.id);
  return { session, user: session.user, ...flags };
}

export function dashboardPathFor(flags: Pick<AccessFlags, "isAdmin" | "isStudent">): string {
  if (flags.isAdmin) return "/admin/dashboard";
  if (flags.isStudent) return "/student/dashboard";
  return "/login";
}
