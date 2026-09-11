# Environment & Credential Rotation Checklist

No values are recorded here — variable names only. `.env` is git-ignored;
`.env.example` holds placeholders.

## Variables in play

| Variable | Where used | Sensitivity |
|---|---|---|
| `VITE_SUPABASE_URL` | Vite build (public bundle), Flutter `--dart-define=SUPABASE_URL` | Low (public URL) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Vite build (public bundle), Flutter `--dart-define=SUPABASE_ANON_KEY` | Medium (anon key; gated by RLS, but previously committed to Git history — treat as exposed) |
| `VITE_SUPABASE_PROJECT_ID` | Tooling reference only | Low |
| `VITE_RAZORPAY_KEY` | Vite build (key id only, public by design) | Low |
| `RAZORPAY_KEY_SECRET` | `razorpay-handler` Edge Function secrets only — never in frontend | **High** |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions / server only — never in frontend | **High** |
| `FTP_SERVER/FTP_USERNAME/FTP_PASSWORD` | GitHub Actions secrets for deploy | **High** |

## Rotation steps (owner)

1. Supabase Dashboard → Project Settings → API → rotate the legacy
   `anon` key (the previously committed one is in Git history).
2. Update local `.env` (`VITE_SUPABASE_PUBLISHABLE_KEY`) — file stays local.
3. Update GitHub Actions secrets with the same variable names.
4. Update Flutter run configs (`--dart-define=SUPABASE_ANON_KEY=...`).
5. Confirm Edge Function secrets (`RAZORPAY_KEY_SECRET`,
   `SUPABASE_SERVICE_ROLE_KEY`) were never committed
   (`git log -p --all | grep -i` on those names should be empty).
6. Purge CDN/hosting cache after the next deploy so the old bundle
   (with the old key) stops being served.

## CI prerequisites

Branch protection on `main` should require the `CI` workflow
(typecheck, test, build) before merge. The `lint` job is currently
report-only until the `no-explicit-any` baseline is eliminated.
