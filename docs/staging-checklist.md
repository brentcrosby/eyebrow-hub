# Local setup and staging checklist

What it takes to run Eyebrow Hub locally against safe data, and what still has
to happen before a staging site exists. Setting names only: never put values or
secrets in this file.

- **Checked against:** `main` at `e388063` (Nov 5, 2026). Earlier checks:
  `7b16236` (Oct 19); the Sprint 8 audit baseline was `92129fb`.
- **Next setup owner:** Brent, as repo owner with GitHub settings access, unless
  the team names a hosting owner at sprint review.

## Local development

Use Node 22, the version CI uses.

### Settings

Copy `.env.example` to `.env.local`, which is gitignored, and fill it in. Ask a
teammate for values; never commit or paste them in chat channels.

| Setting | Needed for | Notes |
| :---- | :---- | :---- |
| `DATABASE_URL` | App, Prisma, seed, limiter | For experiments, point it at a disposable local database (below), not the shared team database. |
| `NEXT_PUBLIC_SUPABASE_URL` | Admin login | Public by design (`NEXT_PUBLIC_`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Admin login | Public by design. |
| `ADMIN_USER_IDS` | Admin access | See [Admin access](#admin-access). |
| `BOOKING_RATE_LIMIT_SECRET` | Booking and admin login | At least 32 random characters, server-only, different in every environment. Without it, booking and admin login return 503. |
| `BOOKING_CLIENT_IP_HEADER` | Booking and admin login | Locally `x-trusted-client-ip` (the DT-524 proxy sets it). On Vercel leave it unset: `VERCEL=1` is set automatically and Vercel's own header is used. Elsewhere, a header only the trusted ingress sets. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Location map (optional) | Restrict the key to the site's domains in Google Cloud. |

Generate a limiter secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Check your settings

```bash
npm run preflight
```

It reads the environment, then `.env.local`, then `.env` (the same order as
Next.js), and names every missing or invalid setting without printing any
values. It exits 1 if a required setting is wrong, so it can gate a deploy. It
also catches the common mistakes: the secret pasted into
`BOOKING_CLIENT_IP_HEADER`, an email in `ADMIN_USER_IDS`, and a secret shorter
than 32 characters.

### Signing in to admin locally

The limiter needs a trusted client IP, and plain `npm run dev` on port 3000
has none, so admin login there returns 503. Run the app behind the local proxy
instead, in two terminals:

```bash
npx next dev -p 3101
```

```bash
node scripts/dt524-local-proxy.mjs
```

Then open **http://localhost:3100/admin/login**. Use `localhost`, not
`127.0.0.1`: `next dev` only accepts its live-reload connection from
`localhost`, and on `127.0.0.1` the page loads but never becomes usable. Your
account must also be listed in `ADMIN_USER_IDS`.

### A disposable local database

```bash
docker run -d --name eyebrow-local-db -e POSTGRES_USER=dev -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=eyebrow -p 5432:5432 postgres:17-alpine
```

**Give `DATABASE_URL` on the command line for these steps.** The Prisma CLI
and the seed read `.env`, not `.env.local`, and `.env` usually holds the shared
team database. A value given on the command line wins over both files.

Create the tables from the committed migrations:

```bash
DATABASE_URL=postgresql://dev:dev@localhost:5432/eyebrow npx prisma migrate deploy
```

PowerShell:

```powershell
$env:DATABASE_URL="postgresql://dev:dev@localhost:5432/eyebrow"; npx prisma migrate deploy; Remove-Item Env:DATABASE_URL
```

Remove the database afterwards with `docker rm -f -v eyebrow-local-db`.

### Demo data

`prisma/seed.js` replaces services and stylists and adds demo appointments. It
is never a production or staging bootstrap. It refuses to run unless both are
true:

- `ALLOW_DEMO_SEED=1` is set for that one command (setting it in `.env` doesn't
  count), and
- `DATABASE_URL` points at this computer (`localhost`, `127.0.0.1` or `::1`).
  The shared team database is always refused.

```bash
ALLOW_DEMO_SEED=1 DATABASE_URL=postgresql://dev:dev@localhost:5432/eyebrow npm run seed
```

PowerShell:

```powershell
$env:ALLOW_DEMO_SEED="1"; $env:DATABASE_URL="postgresql://dev:dev@localhost:5432/eyebrow"; npm run seed; Remove-Item Env:ALLOW_DEMO_SEED, Env:DATABASE_URL
```

It prints the database host and name before writing.

### Local proxy for rate-limit testing

`scripts/dt524-local-proxy.mjs` stands in for the hosting provider's ingress so
the booking limiter sees a trusted client IP. Run the app on 3101 and the proxy
on 3100, then use `http://localhost:3100` in the browser (`curl` can use
`127.0.0.1`). Full steps are in `docs/DT-524-booking-request-limits.md`.

The proxy forwards the browser's own `Host`, so admin changes made through it
pass the CSRF check, and changes from other sites are still blocked
(`tests/sprint08-babar-local-proxy.test.mjs`). It also forwards WebSocket
upgrades, which `next dev` needs for its live-reload connection
(`tests/sprint09-babar-proxy-websocket.test.mjs`).

## Admin access

`ADMIN_USER_IDS` is a comma-separated list of **Supabase user IDs**: the
**User UID** under Supabase → Authentication → Users. An email address or the
sample placeholder doesn't work, and an empty list blocks everyone.

After changing it, restart the server so it loads the new value. To check it: sign in, then open `/api/admin/account`. An approved account gets 200;
an unlisted one gets 403.

## Staging release steps

DT-605 owner: Brent; reviewer/backup: Babar.

**Approved development scope, Nov 5, 2026:** Brent chose to reuse the existing
team Supabase project for a protected hosted development site, preserving its
data. Destructive restore drills stay on disposable local databases. No new
Supabase project is needed. This differs from DT-605's original separate staging
database requirement; do not report that requirement or hosted recovery as passed.
Vercel calls the main-branch environment "Production", but this is a protected
school development deployment, not approval to open customer bookings.

### Release record (fill from observed results)

| Item | Current evidence / required value |
| :---- | :---- |
| Hosting account, project and access owner | Vercel account `brentcrosby`, team `Haki Stack` (`haki-stack`), identified Nov 5, 2026. Project `eyebrow-hub-staging` created on the displayed Hobby plan; GitHub installation completed with only `brentcrosby/eyebrow-hub` selected. Corrected-connection deployment is Ready; HTTPS database health passed. Protected booking-validation code fix is still local pending review. Commercial launch plan eligibility is a separate decision. |
| Development database and approved test admin | Existing Supabase `Senior Project` / `eyebrow-hub`, ref `tmxobvayktldgcbmllzh`, region `us-east-1`. Read-only checks found all seven committed migrations complete and `booking_request_limits` present; no migration or seed ran. Existing admin allowlist configured; successful hosted login remains unverified. The unused free `Haki Stack Staging` organization has no project. |
| Candidate SHA and deployment ID | Live: `e388063487d5baf5c7dc7f5f10345c37a3f235af`, deployment `dpl_45T2DFhf8tUhaxATSvPQ3uZB6WYV` (Ready). First deployment `dpl_8ZmmVbbLqysCwvqRLfo5QeNuh4gC` built but failed runtime health; it is not a known-good rollback target. |
| HTTPS development URL and access protection | `https://eyebrow-hub-staging.vercel.app`; Vercel Authentication **All Deployments**. Anonymous HTTPS health requests to both the stable domain and first deployment URL returned 302 to `vercel.com/sso-api`; signed-in access reached the app. No public launch or customer-data import is authorized. |
| Team handoff | Pending: share the host, URL, access owner and SHA with Babar and Mohamed once available. |
| Alert destination and receipt | Pending: approved team channel, delivery timestamp and message link. |
| Hosted backup and restore | Pending: snapshot ID, isolated restore target, comparison results and elapsed time. |
| Previous release and rollback | Pending: both deployment IDs/SHAs, schema compatibility, rollback and recovery times. |

If hosting cannot be identified, Brent must raise the blocker with the team and
instructor promptly. Preparing this document does not send that notification.
DT-604's PR #135 is separate: final acceptance must use a candidate containing
that reviewed change after merge, rather than silently copying it into DT-605.

Vercel project settings saved Nov 5, 2026: Node.js `22.x`; install command
`npm ci`; build command `npx prisma generate && npm run preflight && npm run build`;
function region `iad1` (US East), matching the existing database region; optional project data sharing for
model training disabled. Project ID: `prj_5X15OzLi7C3mgKYSw5v0Ta21jyOs`.
Only the Production environment receives the five app settings. `DATABASE_URL`,
`ADMIN_USER_IDS` and a newly generated `BOOKING_RATE_LIMIT_SECRET` are stored as
Secret values; the two `NEXT_PUBLIC_SUPABASE_*` values are Config values because
they are intentionally public to the browser. Preview and Development receive
none. "Only build production" skips feature-branch preview builds. The temporary
import file was removed. `BOOKING_CLIENT_IP_HEADER` is unset so the existing
Vercel-controlled IP boundary remains intact. No secrets are recorded here.
These are saved settings, not proof of smoke-test results.

**First hosted check:** The build completed on Next.js 16.4.5; preflight passed
with only the optional Maps key warning. Signed-in `/api/health` returned
`status: error`, `db: unreachable`; runtime logs reported `EMAXCONNSESSION`,
"max clients reached in session mode", pool size 15. Vercel's `DATABASE_URL`
was changed from the shared session pooler on port 5432 to the same project's
transaction pooler on port 6543, as [Supabase recommends for serverless
Prisma deployments](https://supabase.com/docs/guides/database/prisma).
A read-only Prisma transaction using the transaction pooler passed `SELECT 1`
and a service count. Local `.env` and `.env.local` remain unchanged. Temporary
credential files were removed. After Brent completed Vercel identity verification, the corrected deployment
became Ready. Signed-in HTTPS `/api/health` returned `status: ok`, `db: connected`.
The homepage displayed its service catalog and booking controls. A synthetic
nonexistent-reference lookup showed the generic not-found message.

Six browser `POST /api/bookings` requests with body `{}` returned 400 for attempts
1–5 and 429 for attempt 6, with `Retry-After: 899`. Each request changed its
browser-supplied `x-forwarded-for` and `x-vercel-forwarded-for` test IP; this did
not reset the quota. These invalid requests cannot create appointments. They
write only limiter counters; no appointment was created or cancelled.

**Protected booking-validation defect:** A validation-only request with a
nonexistent service returned 500. Runtime logs showed an HTML response being
parsed as JSON: the server's internal availability request lacked the caller's
Vercel access cookie and followed the sign-in redirect. The local DT-605 fix
forwards the incoming cookie only on that same-origin availability request,
disables redirect following (so cookies are not forwarded to a redirect target),
and disables caching. Both validation and creation routes use this behavior;
missing access still fails closed. Protection and the limiter stay enabled.
This code is not in the live `e388063` deployment yet; successful protected
validation and the complete booking journey require its reviewed deployment.

`node --test tests/sprint09-babar-preflight.test.mjs`: 11 passed, zero failed or
skipped. Six new local HTTP tests passed against a fixture protected endpoint with
mocked database access: both routes forward access, preserve slot-conflict
responses, and reject missing access or redirects without following them.
Full suite: 152 passed, 6 skipped, zero failures. TypeScript passed; lint had
zero errors and one existing `Dropdown.tsx` image warning. The production build
exited 0 against a fresh disposable PostgreSQL 17 database with all seven
migrations; that container was removed. Documentation whitespace check passed.
These checks do not substitute for the remaining hosted smoke tests.

1. **Approve the environment.** The hosting owner chooses the provider and who
   has access.
2. **Keep environments apart for launch.** Preview, staging and customer
   production should have separate databases and limiter secrets. The current
   approved development exception above reuses the team's existing database;
   it does not authorize destructive tests or customer production use.
3. **Set the settings** from the table above in the hosting provider. On
   Vercel, `VERCEL=1` is set automatically and the limiter uses Vercel's own
   client-IP header, so leave `BOOKING_CLIENT_IP_HEADER` unset; on other hosts,
   name a header that only the trusted ingress can set (see the DT-524 doc).
   There is no limiter bypass for any environment.
4. **Run `npm run preflight`** with the environment's settings (for example in
   the build command, before `next build`). It must pass before deploying.
5. **Check migrations as their own step.** If any are pending, review their
   data impact before applying `npx prisma migrate deploy` to the agreed target.
   Current shared-database check: seven applied, zero pending or unfinished;
   no migration needed. Never run the demo seed there.
6. **Deploy one exact commit** and record its SHA.
7. **Smoke-test on the real HTTPS host:** approved login, a denied unlisted
   login, logout, a booking, lookup and cancel, a manual booking, and a
   cross-origin admin change being refused.

### Reproducible candidate and hosted evidence

- Select an existing authorized host and confirm its cost before creating resources.
  Record the account/project; a provider URL is sufficient. Do not purchase a domain.
- Use Node 22 and `npm ci`, then `npx prisma generate`. Load the **staging**
  settings through the provider, run `npm run preflight`, and separately apply
  `npx prisma migrate deploy` to the identified staging database before
  `npm run build`. Do not run migrations on every preview automatically.
- Record `git rev-parse HEAD`, the provider's build SHA/deployment ID, migration
  status and CI links. Require a clean source tree and matching SHAs; a local
  branch name is not proof of what is running remotely.
- Keep staging protected from anonymous public use. Verify the actual domain
  is covered: Vercel Standard Protection excludes production domains. Do not
  assume a project's "Production" URL is protected merely because this team
  calls it staging. See [deployment protection](https://vercel.com/docs/deployment-protection).
- Confirm HTTPS health returns 200 with `status: ok` and `db: connected`, not
  a provider login page. Do not log connection strings or customer details.
- Test an approved admin login and inspect cookie **attributes only**:
  `adminAccessToken` must be Secure, HttpOnly, SameSite=Lax and Path=/.
  Check the authenticated account endpoint and logout per
  [the access handoff](admin-access-handoff.md).
- Verify the limiter through the actual ingress. For the current development site, submit invalid-shaped booking requests (they cannot create an
  appointment), vary browser-supplied forwarding headers, and confirm those
  headers cannot reset the client's quota: the sixth request in a fresh
  15-minute create window returns 429 with `Retry-After`, rather than 503 or
  a new allowance. Coordinate the test so teammates do not share its bucket.
  Keep provider access protection enabled and retain no tokens in evidence.
- Complete one explicitly synthetic booking, lookup and eligible cancellation;
  record the test reference securely and verify all service rows. This is
  separate from the invalid-request limiter check and from DT-606's complete
  acceptance walkthrough.

### Monitoring receipt

Use an already-approved monitor/provider integration and a team-approved
channel. Check HTTPS health plus the expected JSON body, and notify on failed
checks, unexpected bodies and recovery. If staging is protected, use the
provider's supported restricted monitoring access; do not disable protection.
Trigger the monitor's test alert or a controlled staging-only failure, then
record the delivered message link and timestamp. A green dashboard or a
configured webhook alone does not prove delivery. Never commit webhook URLs,
access tokens or customer data. Delivery remains unverified until observed.

### Backup and restore procedure

Take a provider snapshot or a PostgreSQL custom-format backup before migration.
Record the source deployment SHA, migration list, snapshot time/ID and baseline
counts. Use a PostgreSQL client compatible with the server. Store backups in
approved restricted storage, outside Git; this application database backup
does not by itself back up Supabase Auth users or provider settings.

For PostgreSQL service entries configured securely outside the repository:

```bash
# Verify both service entries' host/database identities before running.
psql 'service=eyebrow_staging' -X -c 'SELECT current_database();'
psql 'service=eyebrow_restore' -X -c 'SELECT current_database();'
umask 077
pg_dump --dbname='service=eyebrow_staging' --format=custom --no-owner --no-acl --file=staging-backup.dump

# The restore target must be a separate, empty database. Stop if this is nonzero.
psql 'service=eyebrow_restore' -X -tAc "SELECT count(*) FROM pg_tables WHERE schemaname='public';"
pg_restore --dbname='service=eyebrow_restore' --no-owner --no-acl --exit-on-error --single-transaction staging-backup.dump
```

Never restore over staging or production as a drill; do not add `--clean`.
Verify completed migrations, table counts, fixture fields/timestamps, booking
groups and sequences on the restored copy. Use the read-only checks in
[DT-602's recovery handoff](DT-602-booking-data-recovery.md). Reconnect an
isolated app to the restored database and repeat health and synthetic booking
checks before accepting recovery. Record restore and full service-recovery
time separately. See [pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html).

**Local rehearsal, Nov 5, 2026:** PostgreSQL 17; seven committed migrations
applied from `e388063`; two synthetic services and two adjacent appointments
under one reference backed up and restored into a second empty local database.
All row fingerprints/counts, migration records and appointment sequence matched;
the restored service sequence successfully allocated the next ID in a rolled-back
test transaction. The first appointment remained Dec 15, 2026 at 10:00 AM Pacific.
Backup took 0.072 s; restore took 0.056 s (tiny fixture, not a hosted recovery-time
estimate). No shared database was accessed by this rehearsal. Hosted restore and app recovery are
still pending; the temporary databases are removed after the rehearsal.

### Application rollback rehearsal

1. Retain a known-good deployment A and deploy candidate B on the isolated
   staging project. Record both IDs, SHAs and configuration versions.
2. Compare migrations between A and B. Confirm A can read/write the post-B
   schema on the restored copy. An app rollback does not undo database changes;
   if incompatible, stop and prepare a reviewed forward fix or recovery plan.
3. Use the provider's supported rollback for the same staging domain. For
   Vercel, choose an eligible previous deployment and verify its settings and
   domain before confirmation. Old builds retain their original environment
   values; changing project settings does not refresh an old build. See
   [Instant Rollback](https://vercel.com/docs/instant-rollback).
4. Verify the provider now serves A, then check HTTPS health, admin access and
   synthetic booking/lookup. Record start/end time and results; do not infer
   success from switching a Git branch or changing only a local process.
5. Restore candidate B using the provider's supported release process and
   recheck its deployment ID, health and booking behavior. Preserve evidence
   of both transitions. Two build entries alone do not satisfy this check.

### Client transfer and production bootstrap

- Keep public bookings closed until client scope/contact workflow and final
  acceptance are approved. Client silence is not approval.
- Confirm the client owns or explicitly delegates hosting, database, domain,
  billing, recovery contacts and admin access. Document transfer steps and
  costs before making account, DNS or ownership changes.
- Provision a separate production database, apply committed migrations, and
  enter only approved services, prices, durations, staff, hours and policies
  through supported admin workflows. Never run the destructive demo seed or
  copy synthetic staging appointments into production.
- Use new production secrets and approved admin IDs. Verify backups,
  monitoring, HTTPS, ingress and access on production before opening bookings.
  Transfer secrets through provider controls or an approved password manager,
  never this document. Archive staging fixtures separately from client data.

## Still required before launch

DT-605 owns hosted staging, monitoring delivery and recovery evidence; DT-606
owns the final acceptance walkthrough and client handoff. Remaining gates:

- Deploy and recheck the reviewed protected-availability fix; the current host passes health and limiter checks but booking validation is still blocked.
- Monitoring and error visibility.
- Backups, plus a tested restore.
- A tested rollback to the previous release.
- HTTPS cookie and trusted-ingress checks on the real host.
- Cleanup of old rate-limit rows.
