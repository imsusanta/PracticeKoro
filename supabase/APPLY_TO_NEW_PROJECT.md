# Apply pending migrations to the new project (uwymhebixcobwlfamfgg)

Status: project is live (auth healthy, base schema present, `has_role` works).
Confirmed missing: `get_practice_questions` (and likely everything below).
Apply in the Supabase Dashboard → SQL Editor, **in this order**.
Every file is idempotent (safe to re-run).

## Batch 1 — platform upgrade (if unsure, run it; skips what exists)

1. `supabase/migrations/20260906000000_complete_exam_platform_upgrade.sql`
   - Questions metadata, mock-test flags, bookmarks/mistakes/streaks tables,
     `submit_exam_attempt` v1, `get_student_exam_questions`,
     `get_exam_leaderboard`, `current_affairs`.
   - Verify: `select * from get_student_exam_questions('00000000-0000-0000-0000-000000000000');`
     expect an auth error (not "function does not exist").

## Batch 2 — server-authoritative attempt engine

2. `supabase/migrations/20260908120000_server_authoritative_attempt_engine.sql`
   - `test_attempts` timing/violation columns, `start/save/submit_exam_attempt`
     v2 (overwrites v1 — correct), `get_attempt_results`, hardened RLS.
   - Verify: `select proname from pg_proc where proname = 'submit_exam_attempt';`
     expect 1 row.

## Batch 3 — mistakes + current affairs

3. `supabase/migrations/20260908140000_student_mistakes_revision_engine.sql`
4. `supabase/migrations/20260909000000_create_current_affairs.sql`
   - Verify: `select to_regclass('public.student_mistakes'), to_regclass('public.current_affairs');`
     expect both non-null.

## Batch 4 — RLS answer lockdown (frontend is already RPC-first)

5. `supabase/migrations/20260910000000_rls_lockdown_exam_answers.sql`
   - Revokes direct student SELECT on `questions` / `test_questions`,
     hardens `get_student_exam_questions`, adds `get_practice_questions`.
   - Verify: `select proname from pg_proc where proname = 'get_practice_questions';`
     expect 1 row.

## After-apply app checklist (as a student)

1. Register a fresh account → must log in (proves the original issue
   was orphaned old-project accounts).
2. Drills load with answers; TakeTest starts, autosaves, submits, grades.
3. Review shows solutions; Mistakes/Bookmarks pages load.
4. Leaderboard + rank resolve (includes new-engine attempts).

## If a batch errors

Stop, copy the error, and report it — do not skip ahead. Re-running a
batch after a fix is safe. Rollback for batch 4 is documented in the
migration header; batches 1–3 are additive (tables/columns/RPCs only).
