# PracticeKoro architecture

Vite + React + TypeScript SPA for mock tests, notes, and admin operations. Data and auth live in Supabase; the browser only uses the publishable/anon key. Row Level Security is the access-control boundary.

## Layers

| Layer | Location | Responsibility |
| --- | --- | --- |
| Routes | `src/App.tsx` | Public vs admin vs student. Aliases redirect to canonical paths. |
| Auth gate | `src/components/auth/RequireAuth.tsx` | Blocks `/admin/*` (except login) and `/student/*` until role is known. |
| Auth state | `src/hooks/useAuth.tsx`, `src/lib/auth.ts` | Session + `has_role` RPC (`admin` / `super_admin` / `student`). |
| Billing | `src/lib/subscription.ts`, `src/hooks/useSubscription.ts` | Active yearly subscription + fee setting (cached). |
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
        supabase-js (anon/publishable key)
          Postgres RLS + has_role()
```

## Auth rules

- Prefer `has_role` over selecting from `user_roles`. RLS on `user_roles` has caused false denials.
- `admin` and `super_admin` both count as admin access.
- Route guards do **not** sign the user out on denial.
- RLS policies remain the real security layer. Client checks are UX only.
- Page-level session reads should use `useAuth()` instead of a second `getSession()` + role query when the screen is already behind a gate.

## Billing rules

- Yearly premium is a completed `purchases` row with `content_type = subscription` within 365 days.
- Use `src/lib/subscription.ts` (or `useHasActiveSubscription` / `useYearlySubscriptionFee`) instead of copy-pasted purchase queries.

## What not to put in pages

- Copy-pasted session + role checks (use `useAuth` / `RequireAdmin` / `RequireStudent`)
- Copy-pasted 365-day purchase queries
- Direct `import.meta.env` reads (use `src/lib/env.ts`)
- Service-role keys or any non-`VITE_*` secret

## Canonical routes

- Admin: `/admin/dashboard`, `/admin/students`, `/admin/exams`, `/admin/tests`, `/admin/questions`, `/admin/ai-generator`, `/admin/ai-settings`, `/admin/chat`
- Student: `/student/dashboard`, `/student/exams`, `/student/practice`, `/student/results`, `/student/notes`, `/student/profile`
- Blog slugs (`/:slug`) are registered last so they cannot shadow `/login` or legal pages.
