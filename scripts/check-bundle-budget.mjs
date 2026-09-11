#!/usr/bin/env node
// Bundle budget gate: fails CI if the production JS payload grows past budget.
// Usage: node scripts/check-bundle-budget.mjs [distDir]
// Baselines (uncompressed, Sep 2026): initial ~645KB, total ~3024KB.
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.argv[2] || "dist", "assets");
const INITIAL_BUDGET_KB = Number(process.env.BUNDLE_INITIAL_BUDGET_KB || 750);
const TOTAL_BUDGET_KB = Number(process.env.BUNDLE_TOTAL_BUDGET_KB || 3300);

let files;
try {
  files = readdirSync(dir).filter((f) => f.endsWith(".js"));
} catch {
  console.error(`bundle-budget: directory ${dir} not found — run vite build first`);
  process.exit(1);
}
const sizeKb = (f) => statSync(join(dir, f)).size / 1024;
const initial = files.filter((f) => f.startsWith("index-")).reduce((a, f) => a + sizeKb(f), 0);
const total = files.reduce((a, f) => a + sizeKb(f), 0);
console.log(`bundle-budget: initial ${Math.round(initial)}KB / ${INITIAL_BUDGET_KB}KB, total ${Math.round(total)}KB / ${TOTAL_BUDGET_KB}KB`);

let failed = false;
if (initial > INITIAL_BUDGET_KB) {
  console.error("bundle-budget: INITIAL JS OVER BUDGET — defer heavy deps from the entry chunk");
  failed = true;
}
if (total > TOTAL_BUDGET_KB) {
  console.error("bundle-budget: TOTAL JS OVER BUDGET — split routes or defer heavy deps");
  failed = true;
}
process.exit(failed ? 1 : 0);
