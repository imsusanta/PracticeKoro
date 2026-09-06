# Student dashboard white-screen diagnosis

The dashboard currently gates rendering on `authChecked`, while the loader performs seven Supabase reads in one `Promise.all()` and then performs an additional purchases read. Any unresolved request can keep the loading state visible indefinitely. The student layout also performs its own `getSession()`/subscription check on every pathname change, adding another async dependency.

Recommended fix:
- Make dashboard data loading resilient per-query rather than failing the whole dashboard.
- Add explicit request timeout handling so a hung Supabase request cannot keep the loader indefinitely.
- Render a useful fallback dashboard even when optional profile/statistics/settings queries fail.
- Keep authentication/role verification strict, but handle role/profile lookup errors explicitly.
- Avoid duplicate subscription lookup in StudentLayout when dashboard already has it, or make the layout lookup non-blocking.
- Add an ErrorBoundary around student routes.
- Verify `npm run build` and test `/student/dashboard` with valid session, invalid role, and partial Supabase failures.
