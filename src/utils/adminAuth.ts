import { supabase } from "@/integrations/supabase/client";

/**
 * Robustly checks if a user has admin or super_admin role.
 * Evaluates multiple strategies:
 * 1. RPC `has_role(userId, 'admin')` (security definer, bypasses RLS)
 * 2. RPC `has_role(userId, 'super_admin')` (if supported)
 * 3. Direct `user_roles` query
 * 4. User metadata / app_metadata in Auth session
 */
export async function checkIsAdmin(userId?: string): Promise<boolean> {
  try {
    let uid = userId;
    const { data: { session } } = await supabase.auth.getSession();
    if (!uid) {
      if (!session?.user) return false;
      uid = session.user.id;
    }

    // Fast check: auth session metadata
    if (session?.user && session.user.id === uid) {
      if (
        session.user.app_metadata?.role === "admin" ||
        session.user.user_metadata?.role === "admin" ||
        session.user.app_metadata?.role === "super_admin" ||
        session.user.user_metadata?.role === "super_admin"
      ) {
        return true;
      }
    }

    // Strategy 1: Check via RPC has_role for 'admin'
    try {
      const { data: hasAdmin, error: rpcErr } = await supabase
        .rpc("has_role", { _user_id: uid, _role: "admin" as any });
      if (!rpcErr && hasAdmin === true) {
        return true;
      }
    } catch {
      // Ignore RPC error and fallback to next check
    }

    // Strategy 2: Check via RPC has_role for 'super_admin'
    try {
      const { data: hasSuperAdmin, error: rpcErr2 } = await supabase
        .rpc("has_role", { _user_id: uid, _role: "super_admin" as any });
      if (!rpcErr2 && hasSuperAdmin === true) {
        return true;
      }
    } catch {
      // Enum might not have super_admin, safely ignored
    }

    // Strategy 3: Check user_roles table directly
    try {
      const { data: roleRecords, error: tableErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);

      if (!tableErr && roleRecords && roleRecords.length > 0) {
        const hasRole = roleRecords.some(r =>
          r.role === "admin" || r.role === "super_admin"
        );
        if (hasRole) return true;
      }
    } catch {
      // Table check fallback
    }

    // Strategy 4: Check auth user metadata
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id === uid) {
        if (
          user.app_metadata?.role === "admin" ||
          user.user_metadata?.role === "admin" ||
          user.app_metadata?.role === "super_admin" ||
          user.user_metadata?.role === "super_admin"
        ) {
          return true;
        }
      }
    } catch {
      // Metadata check fallback
    }

    return false;
  } catch (err) {
    console.error("checkIsAdmin verification error:", err);
    return false;
  }
}
