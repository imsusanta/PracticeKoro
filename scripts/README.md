# One-off scripts

Ad-hoc Node scripts used during development (user lookups, premium checks, data dumps). They are **not** part of the Vite app.

- Load env from the repo-root `.env` (never commit that file).
- Default scripts use `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Privileged scripts (`check_explanations.cjs`) need `SUPABASE_SERVICE_ROLE_KEY` in `.env`. Never prefix that with `VITE_`.
- Do not hardcode keys. Do not commit script output or dumped user data.
