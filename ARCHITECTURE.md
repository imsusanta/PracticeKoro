# PracticeKoro architecture

Vite + React + TypeScript SPA. Data and auth live in Supabase; the browser only uses the publishable/anon key. Row Level Security is the access-control boundary.

## Layers

| Layer | Location | Responsibility |
| --- | --- | --- |
| Routes | `src/App.tsx` | Public vs admin vs student. Aliases redirect to canonical paths. |
| Auth gate | `src/components/auth/RequireAuth.tsx` | Blocks `/admin/*` (except login) and `/student/*` until role is known. |
| Auth state | `src/hooks/useAuth.tsx`, `src/lib/auth.ts` | Session + `has_role` RPC (`admin` / `super_admin` / `student`). |
| Billing | `src/lib/subscription.ts` | Active yearly subscription + fee setting. |
| Env | `src/lib/env.ts` | Typed `VITE_*` public config. |
| Data client | `src/integrations/supabase/` | Single typed client + generated DB types. |
| Shells | `src/components/admin`, `src/components/student` | Layout/nav only. |
| Pages | `src/pages/**` | Screen-specific UI and queries. |
| Shared UI | `src/components/ui` | shadcn primitives. |

```
Browser
  App routes
    RequireAdmin / RequireStudent
      Page (admin|student)
        supabase-js (anon key)
          Postgres RLS + has_role()
```

## Auth rules

- Prefer `has_role` over selecting from `user_roles`. RLS on `user_roles` has caused false denials.
- `admin` and `super_admin` both count as admin access.
- Route guards do **not** sign the user out on denial (same as existing pages).
- RLS policies remain the real security layer. Client checks are UX only.

## What not to put in pages

- Copy-pasted session + role checks (use `useAuth` / `RequireAdmin` / `RequireStudent`)
- Copy-pasted 365-day purchase queries (use `src/lib/subscription.ts`)
- Direct `import.meta.env` reads (use `src/lib/env.ts`)
- Service-role keys or any non-`VITE_*` secret

## Related work

Student Management UI is owned by open PRs #1 and #2. Whole-app bugfixes (including per-page `has_role` patches) are in PR #3. This layout is meant to sit underneath those changes, not rewrite those screens.
