import { test, expect } from "@playwright/test";

// Public-route smoke: no backend required (landing ships demo fallbacks).
test("landing renders brand, nav and auth entry points", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Practice Koro").first()).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await expect(page.getByRole("button", { name: /get started/i })).toBeVisible();
});

test("login page renders form without crashing", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByPlaceholder(/email/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^login$/i }).first()).toBeVisible();
});

test("register page renders form without crashing", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByPlaceholder(/email/i).first()).toBeVisible();
});

test("unknown route shows not-found page", async ({ page }) => {
  await page.goto("/this-route-does-not-exist-xyz");
  await expect(page.getByText(/not found|404/i).first()).toBeVisible();
});
