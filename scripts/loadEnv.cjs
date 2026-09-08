const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const ROOT_ENV = path.resolve(__dirname, "..", ".env");

function loadRootEnv() {
  if (!fs.existsSync(ROOT_ENV)) return;
  const text = fs.readFileSync(ROOT_ENV, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const idx = trimmed.indexOf("=");
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}. Add it to the repo-root .env (do not commit that file).`);
    process.exit(1);
  }
  return value;
}

/**
 * @param {{ privileged?: boolean }} [options]
 * privileged scripts need SUPABASE_SERVICE_ROLE_KEY (never VITE_-prefix this).
 */
function createScriptClient({ privileged = false } = {}) {
  loadRootEnv();
  const url = requireEnv("VITE_SUPABASE_URL");
  const key = privileged
    ? requireEnv("SUPABASE_SERVICE_ROLE_KEY")
    : requireEnv("VITE_SUPABASE_PUBLISHABLE_KEY");
  return createClient(url, key);
}

module.exports = { loadRootEnv, createScriptClient };
