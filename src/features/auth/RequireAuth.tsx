import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

const Loader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/40">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm font-semibold text-slate-600">Verifying secure access...</p>
    </div>
  </div>
);

export const AuthErrorScreen: React.FC<{ error: Error; onRetry: () => void }> = ({
  error,
  onRetry,
}) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/40 px-4">
    <div className="max-w-sm w-full rounded-3xl bg-white border border-slate-200 p-6 text-center shadow-sm">
      <p className="text-base font-black text-slate-900">Couldn&apos;t verify access</p>
      <p className="text-sm text-slate-600 font-medium mt-2">
        {error.message || "Something went wrong while checking your account."}
      </p>
      <button
        onClick={onRetry}
        className="mt-4 w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors"
      >
        Retry
      </button>
    </div>
  </div>
);

interface RequireAuthProps {
  children: React.ReactNode;
  /** Where to send unauthenticated users. */
  loginPath?: string;
}

/** Parent guard: session required. Fail-closed on verification errors. */
export const RequireAuth: React.FC<RequireAuthProps> = ({ children, loginPath = "/login" }) => {
  const { session, loading, error, retry } = useAuth();
  const location = useLocation();

  if (loading) return <Loader />;
  if (error) return <AuthErrorScreen error={error} onRetry={retry} />;
  if (!session) return <Navigate to={loginPath} state={{ from: location }} replace />;
  return <>{children}</>;
};

interface RequireCapabilityProps {
  children: React.ReactNode;
  capability: string;
  /** Where to send users lacking the capability. */
  deniedPath?: string;
}

/** Nested guard: capability required (implies authentication). */
export const RequireCapability: React.FC<RequireCapabilityProps> = ({
  children,
  capability,
  deniedPath = "/",
}) => {
  const { session, loading, error, retry, capabilities } = useAuth();

  if (loading) return <Loader />;
  if (error) return <AuthErrorScreen error={error} onRetry={retry} />;
  if (!session || !capabilities.includes(capability)) {
    return <Navigate to={deniedPath} replace />;
  }
  return <>{children}</>;
};
