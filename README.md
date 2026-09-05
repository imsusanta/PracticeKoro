# PracticeKoro

Exam-prep web app: mock tests, notes, blogs, and separate student / admin panels.

**Stack:** Vite, React, TypeScript, Tailwind, shadcn/ui, Supabase, Razorpay.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for module boundaries and auth rules.

## Local setup

1. Install Node.js 20+ and npm.
2. Clone the repo and install dependencies:

```sh
npm install
```

3. Copy public env vars (never commit real values):

```sh
cp .env.example .env
```

Required **public** variables (all must be prefixed `VITE_` so Vite can expose them to the client):

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon / publishable key only |
| `VITE_SUPABASE_PROJECT_ID` | Optional project id |
| `VITE_RAZORPAY_KEY` | Razorpay **public** key |

Do **not** put the Supabase `service_role` key (or any server secret) in `.env` or client code. Access control is enforced by Postgres RLS.

4. Start the app:

```sh
npm run dev
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production bundle |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run preview` | Preview the production build |

One-off database inspection scripts live in [`scripts/`](./scripts) and are not part of the app runtime.

## Deploy

GitHub Actions (`.github/workflows/deploy.yml`) FTPs `public/` to Hostinger on push to `main`. The Vite build output is `dist/` — keep that out of git unless you have an explicit static-host workflow that needs it.
