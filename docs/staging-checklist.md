# Local setup and staging checklist

What it takes to run Eyebrow Hub locally against safe data, and what still has
to happen before a staging site exists. Setting names only: never put values or
secrets in this file.

- **Checked against:** `main` at `7b16236` (Oct 19, 2026). The Sprint 8 audit
  baseline was `92129fb`.
- **Next setup owner:** Brent, as repo owner with GitHub settings access, unless
  the team names a hosting owner at sprint review.

## Local development

Use Node 22, the version CI uses.

### Settings

Put these in `.env.local`, which is gitignored. Ask a teammate for values; never
commit or paste them in chat channels.

| Setting | Needed for | Notes |
| :---- | :---- | :---- |
| `DATABASE_URL` | App, Prisma, seed | For experiments, point it at a disposable local database (below), not the shared team database. |
| `NEXT_PUBLIC_SUPABASE_URL` | Admin login | Public by design (`NEXT_PUBLIC_`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Admin login | Public by design. |
| `ADMIN_USER_IDS` | Admin access | See [Admin access](#admin-access). |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Location map | Restrict the key to the site's domains in Google Cloud. |

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
on 3100, then use `http://127.0.0.1:3100`. Full steps are in
`docs/DT-524-booking-request-limits.md`.

The proxy forwards the browser's own `Host`, so admin changes made through it
pass the CSRF check, and changes from other sites are still blocked
(`tests/sprint08-babar-local-proxy.test.mjs`).

## Admin access

`ADMIN_USER_IDS` is a comma-separated list of **Supabase user IDs**: the
**User UID** under Supabase → Authentication → Users. An email address or the
sample placeholder doesn't work, and an empty list blocks everyone.

After changing it, restart the server so it loads the new value. To check it: sign in, then open `/api/admin/account`. An approved account gets 200;
an unlisted one gets 403.

## Staging release steps

These are for whoever sets up staging. None of them are done yet.

1. **Approve the environment.** The hosting owner chooses the provider and who
   has access.
2. **Set the settings** from the table above in the hosting provider, plus
   `BOOKING_CLIENT_IP_HEADER` if the host is not Vercel. On Vercel, `VERCEL=1` is
   set automatically and the limiter uses Vercel's own client-IP header; on other
   hosts, name a header that only the trusted ingress can set (see the DT-524
   doc).
3. **Apply migrations as their own step,** before the new build goes live:
   `npx prisma migrate deploy` against the staging database. Never run the demo
   seed there.
4. **Deploy one exact commit** and record its SHA.
5. **Smoke-test on the real HTTPS host:** approved login, a denied unlisted
   login, logout, a booking, lookup and cancel, a manual booking, and a
   cross-origin admin change being refused.

## Still required before launch

Not part of this task; each needs an owner.

- A hosted preview or staging environment.
- Monitoring and error visibility.
- Backups, plus a tested restore.
- A tested rollback to the previous release.
- HTTPS cookie and trusted-ingress checks on the real host.
- Cleanup of old rate-limit rows.
