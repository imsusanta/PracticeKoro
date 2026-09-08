# PracticeKoro

Edtech SPA for West Bengal competitive-exam practice: mock tests, notes, student billing, and an admin console.

**Stack:** Vite + React + TypeScript + Tailwind / shadcn-ui + Supabase (Auth, Postgres RLS, Edge Functions).

See [ARCHITECTURE.md](./ARCHITECTURE.md) for layers, auth rules, and canonical routes.

## Local setup

```sh
npm install
cp .env.example .env   # fill VITE_* values
npm run dev
```

Required public env vars (embedded in the browser bundle):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_RAZORPAY_KEY` (payments)

Never put a service-role key in a `VITE_*` variable. Maintenance scripts that need it read `SUPABASE_SERVICE_ROLE_KEY` from `.env` only.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | ESLint |

## Deploy

GitHub Actions deploys on push (`/.github/workflows/deploy.yml`). Database changes go through `supabase/migrations/`.
