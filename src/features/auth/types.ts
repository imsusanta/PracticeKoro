import type { Session, User } from "@supabase/supabase-js";

export type Role = "admin" | "student" | "instructor" | "super_admin";

export type AccountStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "deactivated"
  | "payment_locked"
  | "expired"
  | "unknown";

/** Capability strings checked by RequireCapability. */
export const Capabilities = {
  StudentAccess: "student.access",
  AdminAccess: "admin.access",
  ManageQuestions: "admin.manage_questions",
} as const;

export type Capability = (typeof Capabilities)[keyof typeof Capabilities];

export interface AuthState {
  session: Session | null;
  user: User | null;
  roles: Role[];
  accountStatus: AccountStatus | null;
  capabilities: string[];
  loading: boolean;
  error: Error | null;
  /** Re-run the access load (used by the retry screen). */
  retry: () => void;
}

/**
 * Upgrade path: once `get_current_user_access()` exists server-side
 * (SECURITY DEFINER, returns roles + status + capabilities in one call),
 * loadAccess() should prefer it and fall back to the table queries below.
 */
export const ACCESS_RPC = "get_current_user_access";
