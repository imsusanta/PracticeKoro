/**
 * Public (Vite-exposed) environment access.
 * Only VITE_* variables are available in the browser bundle.
 * Never add service-role keys or other secrets here.
 */

const readPublic = (name: keyof ImportMetaEnv, required = false): string => {
  const value = import.meta.env[name];
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (required && import.meta.env.DEV) {
    console.error(`[env] Missing required public variable: ${name}`);
  }
  return "";
};

export const env = {
  supabaseUrl: readPublic("VITE_SUPABASE_URL", true),
  supabasePublishableKey: readPublic("VITE_SUPABASE_PUBLISHABLE_KEY", true),
  supabaseProjectId: readPublic("VITE_SUPABASE_PROJECT_ID"),
  razorpayKey: readPublic("VITE_RAZORPAY_KEY"),
} as const;

export const hasSupabaseConfig = Boolean(env.supabaseUrl && env.supabasePublishableKey);
