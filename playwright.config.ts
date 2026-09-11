import { defineConfig, devices } from "@playwright/test";

// Smoke E2E runs against a static preview build with dummy env (no backend).
// Authenticated flows require a staging Supabase project — see e2e/auth.spec.ts.skip.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npx vite preview --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "ci-dummy-key",
      VITE_SUPABASE_PROJECT_ID: "ci-dummy-ref",
      VITE_RAZORPAY_KEY: "ci-dummy-key",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
