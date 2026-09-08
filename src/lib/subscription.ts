import { supabase } from "@/integrations/supabase/client";

export const SUBSCRIPTION_DURATION_DAYS = 365;
export const YEARLY_FEE_SETTING_KEY = "yearly_subscription_fee";

export type ActiveSubscription = {
  id: string;
  created_at: string;
  expiryDate: Date;
};

export function subscriptionCutoffIso(now = new Date()): string {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - SUBSCRIPTION_DURATION_DAYS);
  return cutoff.toISOString();
}

export function subscriptionExpiryDate(createdAt: string): Date {
  const expiryDate = new Date(createdAt);
  expiryDate.setDate(expiryDate.getDate() + SUBSCRIPTION_DURATION_DAYS);
  return expiryDate;
}

export function isActiveYearlySubscription(
  createdAt: string | null | undefined,
  now = new Date()
): boolean {
  if (!createdAt) return false;
  return now < subscriptionExpiryDate(createdAt);
}

/**
 * Latest completed yearly subscription that is still within the 365-day window.
 */
export async function getActiveSubscription(userId: string): Promise<ActiveSubscription | null> {
  const { data, error } = await supabase
    .from("purchases")
    .select("id, created_at")
    .eq("user_id", userId)
    .eq("content_type", "subscription")
    .eq("status", "completed")
    .gt("created_at", subscriptionCutoffIso())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[subscription] lookup failed:", error.message);
    return null;
  }
  if (!data?.created_at) return null;

  return {
    id: data.id,
    created_at: data.created_at,
    expiryDate: subscriptionExpiryDate(data.created_at),
  };
}

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const subscription = await getActiveSubscription(userId);
  return subscription !== null;
}

export async function getYearlySubscriptionFee(): Promise<number> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", YEARLY_FEE_SETTING_KEY)
    .maybeSingle();

  if (error) {
    console.error("[subscription] fee lookup failed:", error.message);
    return 0;
  }
  return parseFloat(data?.value ?? "") || 0;
}
