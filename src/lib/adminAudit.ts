import { supabase } from "@/integrations/supabase/client";

interface AuditPayload {
  action: string;
  tableName?: string;
  recordId?: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
}

/** Best-effort write to audit_logs. Never throws — admin flows must not fail if logging is blocked. */
export async function logAdminAction(payload: AuditPayload): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from("audit_logs").insert({
      user_id: session.user.id,
      action: payload.action,
      table_name: payload.tableName ?? null,
      record_id: payload.recordId ?? null,
      old_data: (payload.oldData ?? null) as never,
      new_data: (payload.newData ?? null) as never,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 240) : null,
    });

    if (error) {
      console.warn("audit_logs insert skipped:", error.message);
    }
  } catch (error) {
    console.warn("audit_logs insert failed:", error);
  }
}

export interface AuditLogRow {
  id: string;
  action: string;
  table_name: string | null;
  record_id: string | null;
  created_at: string | null;
  user_id: string;
}

export async function fetchRecentAuditLogs(limit = 12): Promise<AuditLogRow[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, table_name, record_id, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("audit_logs select skipped:", error.message);
    return [];
  }

  return (data || []) as AuditLogRow[];
}
