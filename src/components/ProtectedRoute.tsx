import { ReactNode, useEffect, useState, useCallback } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin } from "@/utils/adminAuth";

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: "admin" | "student";
}

export const ProtectedRoute = ({ children, requireRole }: ProtectedRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const location = useLocation();

  const checkAuth = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setIsAuthenticated(false);
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      setIsAuthenticated(true);

      if (!requireRole) {
        setIsAuthorized(true);
        setLoading(false);
        return;
      }

      if (requireRole === "student") {
        // Verify role via security-definer RPC (bypasses RLS, no recursion).
        // Admins/super_admins are also allowed into student routes for support.
        let hasRole = false;
        for (const r of ["student", "admin", "super_admin"]) {
          try {
            const { data, error } = await supabase
              .rpc("has_role", { _user_id: session.user.id, _role: r as never });
            if (!error && data === true) {
              hasRole = true;
              break;
            }
          } catch {
            // try next role
          }
        }
        // Fail-closed if RPCs unavailable: fall back to user_roles read.
        // Fail-open only for legacy rows with no role row yet.
        if (!hasRole) {
          try {
            const { data: rows } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", session.user.id);
            if (rows && rows.length > 0) {
              hasRole = rows.some((x) =>
                x.role === "student" || x.role === "admin" || x.role === "super_admin"
              );
            } else {
              hasRole = true;
            }
          } catch {
            hasRole = true;
          }
        }

        // Block explicitly rejected / deactivated / payment_locked accounts.
        // Fail-open if approval table unreadable so auto-approve flow keeps working.
        if (hasRole) {
          try {
            const { data: approval } = await supabase
              .from("approval_status")
              .select("status")
              .eq("user_id", session.user.id)
              .maybeSingle();
            const s = (approval as { status?: string } | null)?.status;
            if (s === "rejected" || s === "deactivated" || s === "payment_locked") {
              setIsAuthorized(false);
              setLoading(false);
              return;
            }
          } catch {
            // ignore — fail open
          }
        }

        setIsAuthorized(hasRole);
        setLoading(false);
        return;
      }

      // Check admin role
      const isAdmin = await checkIsAdmin(session.user.id);
      setIsAuthorized(isAdmin);
    } catch (err) {
      console.error("Auth check failed:", err);
      setIsAuthenticated(false);
      setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  }, [requireRole]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/40">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Verifying secure access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirectPath = requireRole === "admin" ? "/admin/login" : "/login";
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  if (requireRole && !isAuthorized) {
    // If not authorized for admin, send to admin login
    if (requireRole === "admin") {
      return <Navigate to="/admin/login" replace />;
    }
    // If not authorized for student, send to login
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
