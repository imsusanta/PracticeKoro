/**
 * Error monitoring (Sentry). No-op unless VITE_SENTRY_DSN is set.
 * Sentry is lazy-imported so the bundle costs nothing when disabled.
 */
export async function initMonitoring(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;
  try {
    const Sentry = await import("@sentry/react");
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      // Keep volume low: errors only, 10% of sessions for replay context.
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0.1,
    });
  } catch {
    // Monitoring must never break the app.
  }
}
