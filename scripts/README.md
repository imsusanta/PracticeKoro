# One-off maintenance scripts

These are local helpers. They are **not** part of the web app.

```sh
# From the repo root
node scripts/check_user.js you@example.com
```

Credentials come from the repo-root `.env` (`VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`). Scripts that need admin-level access (`check_explanations.cjs`) require `SUPABASE_SERVICE_ROLE_KEY` in `.env` — never a `VITE_*` variable, never committed.
