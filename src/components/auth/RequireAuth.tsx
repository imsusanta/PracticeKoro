import { Navigate, Outlet } from "react-router-dom";
import { PageLoader } from "@/components/PageLoader";
import { useAuth } from "@/hooks/useAuth";

type GuardProps = {
  loginPath: string;
  allow: (auth: ReturnType<typeof useAuth>) => boolean;
};

const RoleGuard = ({ loginPath, allow }: GuardProps) => {
  const auth = useAuth();

  if (auth.status === "loading") {
    return <PageLoader />;
  }

  if (!auth.session || !allow(auth)) {
    return <Navigate to={loginPath} replace />;
  }

  return <Outlet />;
};

/** Admin or super_admin. Does not sign the user out on denial. */
export const RequireAdmin = () => (
  <RoleGuard loginPath="/admin/login" allow={(auth) => auth.isAdmin} />
);

/** Student role. Unauthenticated or non-student users go to the public login. */
export const RequireStudent = () => (
  <RoleGuard loginPath="/login" allow={(auth) => auth.isStudent} />
);
