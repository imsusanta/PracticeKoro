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

      if (!requireRole || requireRole === "student") {
        setIsAuthorized(true);
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
