import { supabase } from "@/integrations/supabase/client";
import { subscriptionCutoffIso } from "@/lib/subscription";

export type NotificationAudience = "all" | "approved" | "premium" | "pending";

export const AUDIENCE_LABELS: Record<NotificationAudience, string> = {
  all: "All students",
  approved: "Approved students",
  premium: "Active premium (12 months)",
  pending: "Pending approval",
};

async function studentIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "student");

  if (error) throw error;
  return (data || []).map((row) => row.user_id);
}

export async function getNotificationRecipients(
  audience: NotificationAudience
): Promise<{ userIds: string[]; label: string }> {
  const students = await studentIds();
  const studentSet = new Set(students);
  const label = AUDIENCE_LABELS[audience];

  if (audience === "all") {
    return { userIds: students, label };
  }

  if (audience === "approved" || audience === "pending") {
    const { data, error } = await supabase
      .from("approval_status")
      .select("user_id")
      .eq("status", audience);

    if (error) throw error;
    const userIds = (data || [])
      .map((row) => row.user_id)
      .filter((id) => studentSet.has(id));
    return { userIds, label };
  }

  const { data, error } = await supabase
    .from("purchases")
    .select("user_id")
    .eq("content_type", "subscription")
    .eq("status", "completed")
    .gt("created_at", subscriptionCutoffIso());

  if (error) throw error;
  const unique = new Set(
    (data || []).map((row) => row.user_id).filter((id) => studentSet.has(id))
  );
  return { userIds: [...unique], label };
}
