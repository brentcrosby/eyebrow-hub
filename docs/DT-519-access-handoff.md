# DT-519 — Access audit / Babar handoff

Audited exported admin handlers on base `7db39b5`: account GET/PATCH;
appointments GET/POST; availability-blocks GET/POST/DELETE; availability-settings
GET/PUT; dashboard/appointments GET; dashboard/stats GET; employee-services GET;
services GET/POST/PATCH/DELETE all call `requireAdmin`. Only dashboard-summary GET
was missing its guard; DT-519 fixes it. Login POST is intentionally public.
Employee-services exports no DELETE. No other missing admin guards were found.

For Babar: anonymous requests with valid date ranges could expose counts, customer
names, phones/emails, and appointment/block information through dashboard-summary.
This fix guards access, selects only required columns, and sets `private, no-store`.
The existing authenticated response contract is preserved.

Remaining gap: valid Supabase sessions are still accepted until DT-520 (Mosab).
Mohamed owns subsequent cookie/CSRF integration; Babar owns shared CI. This note
is ready to share, not confirmation of notification.

Test: `node --test tests/dashboard-summary-access.test.mjs` uses isolated fixtures,
not live customer data. Manually check anonymous requests return 401 and signed-in
requests with valid ranges return 200; both must have `Cache-Control: private, no-store`.
