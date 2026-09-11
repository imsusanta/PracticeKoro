# Rollback Runbook

## Frontend (Hostinger, FTP)

Every CI run uploads `dist-<sha>` as a 30-day artifact
(Actions → CI → Artifacts). To roll back:

1. Download the last-known-good `dist-<sha>` artifact.
2. Upload its contents to `/public_html/` via FTP (same credentials
   as deploy).
3. Purge any CDN/hosting cache and hard-refresh to verify.

No build step needed — artifacts are the exact shipped bundle.

## Database

There is no automated DB rollback. Rules:

- Additive migrations (tables/columns/RPCs/policies via
  `CREATE IF NOT EXISTS` / `DROP IF EXISTS` / `CREATE OR REPLACE`)
  need no rollback — re-running is safe.
- Destructive changes (DROP COLUMN/TABLE, data backfills) require a
  backup first: Supabase Dashboard → Database → Backups → download,
  and the migration file must document its own reverse script.
- `supabase/migrations/20260910000000_rls_lockdown_exam_answers.sql`
  documents its rollback in its header.

## cadence

- Backups: Supabase daily PITR per plan; verify restore quarterly
  (untested backups don't exist).
- Dependencies: Dependabot weekly PRs (npm + GitHub Actions).
