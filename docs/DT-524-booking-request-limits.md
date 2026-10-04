# DT-524 — public booking request limits

The public POST endpoints `/api/bookings`, `/api/bookings/lookup`, and
`/api/bookings/cancel` have independent per-client-IP budgets: respectively 5,
30, and 10 requests per 15-minute window. All requests, including malformed
and unsuccessful ones, count. A 429 includes `Retry-After` (seconds) and a
generic `{ "success": false, "error": "Too many requests. Please try again later." }`
body with `Cache-Control: no-store`. Tune the budgets after observing real
traffic; shared networks can exhaust an IP budget, particularly near the
four-hour cancellation cutoff.

## Deployment prerequisites

1. Deploy the migration in `prisma/migrations/20261001120000_add_booking_request_limits/`
   **before** deploying the routes. It uses the existing PostgreSQL connection;
   a missing table or database outage returns 503, never an unlimited bypass.
2. Set a distinct, random, server-only `BOOKING_RATE_LIMIT_SECRET` of at least
   32 characters in each environment. Keep it out of client-side settings;
   rotating it resets existing callers' buckets.
3. Vercel: enable **Automatically expose System Environment Variables** and
   verify its `VERCEL=1` runtime variable is available. Ensure traffic reaches
   the application through Vercel's ingress. The application
   uses Vercel's `x-vercel-forwarded-for` header. If a proxy sits in front of
   Vercel, verify the resulting client IP with that ingress before release.
   Other hosting: set `BOOKING_CLIENT_IP_HEADER` to a single-IP header _only_
   after configuring the ingress to strip incoming copies and overwrite it
   with the real client IP; never configure an untrusted forwarded-IP chain.
   Requests lacking a valid trusted IP return 503, so local development also
   needs a trusted proxy that overwrites the configured header. Never use
   `X-Forwarded-For` from arbitrary internet clients.
4. Schedule periodic housekeeping outside the request path (for example, a
   daily database job):
   `DELETE FROM booking_request_limits WHERE expires_at < now() - interval '1 day';`
   Cleanup isn't required for reset, because the atomic upsert resets an
   expired row on the next request, but avoids unbounded table growth.

The counter stores an HMAC of the ingress-provided IP, never booking details
or raw IPs. The PostgreSQL upsert performs the check atomically across
instances. Login remains a follow-up to Mohamed's cookie/login integration;
coordinate its separate response format (`message`) and budget then.

## Reproducible local verification (disposable data only)

Prerequisites: Docker Desktop running and Node/npm dependencies installed with
`npm ci`. The commands below are for a POSIX shell in the repository root. **Never use the
shared Supabase database for these tests.** The migration runner refuses any
URL other than `postgres` on `127.0.0.1:55432/dt524_test`. The test container
binds its database port to loopback only.

```sh
docker run -d --name dt524-postgres --publish 127.0.0.1:55432:5432 \
  -e POSTGRES_PASSWORD=dt524-local-only -e POSTGRES_DB=dt524_test postgres:16-alpine
docker exec dt524-postgres pg_isready -U postgres -d dt524_test
export DT524_TEST_DATABASE_URL='postgresql://postgres:dt524-local-only@127.0.0.1:55432/dt524_test'
export DATABASE_URL="$DT524_TEST_DATABASE_URL"
# Example key is exclusively for this disposable local setup; use a random secret in deployment.
export BOOKING_RATE_LIMIT_SECRET='local-only-dt524-test-secret-long-enough-12345'
export BOOKING_CLIENT_IP_HEADER='x-trusted-client-ip'
unset VERCEL
node scripts/dt524-test-db.mjs
```

Run these in **two additional terminals** (export the same variables above in
the app terminal; the proxy needs no database variables):

```sh
# App terminal: bind Next to loopback, not a network interface.
./node_modules/.bin/next dev --hostname 127.0.0.1 --port 3101
```

```sh
# Proxy terminal: bind to loopback; strip incoming forwarding/client-IP headers
# and replace x-trusted-client-ip with the actual socket peer IP.
node scripts/dt524-local-proxy.mjs
```

In the first terminal, verify the limiter, the actual PostgreSQL upsert, and
the API through the proxy:

```sh
node --test tests/booking-rate-limit.test.mjs
node --test tests/booking-rate-limit-db.test.mjs
DT524_HTTP_TEST=1 node --test tests/booking-rate-limit-http.test.mjs
```

The DB test issues 40 simultaneous writes using the **real** `postgresCounter`
and checks atomic counts and expiry. The HTTP test sends requests through the
proxy to all three actual routes, checks normal responses, 429 with
`Retry-After` and `no-store`, then updates **only its disposable test bucket**
to expire it and checks recovery without waiting 15 minutes. These tests use
malformed or nonexistent booking details and do not create/cancel any
appointment. The DB test uses separate random keys and cleans them up. The
database and HTTP tests are opt-in and otherwise skip; do not treat a skipped
test as verification.

To manually check header spoofing, run:

```sh
curl -i -H 'Content-Type: application/json' -H 'x-trusted-client-ip: 192.0.2.99' \
  -d '{}' http://127.0.0.1:3100/api/bookings/lookup
```

A normal lookup gives 404, not 503, and the HTTP test proves that the request
was counted under loopback's hashed identity rather than the spoofed header.
Do **not** set `VERCEL=1` locally or access port 3101 as an untrusted client;
the local threat boundary is a loopback-only app behind the loopback proxy.
Production must enforce the trusted-ingress boundary separately. A 503 means
check the migration, database URL, secret, proxy, and configured header; never
work around it by trusting browser-supplied forwarding headers. `npm run lint`
currently also flags an unrelated existing `components/Dropdown.tsx` error;
run targeted ESLint on changed files if that remains unresolved.

When done, stop the app and proxy with Ctrl-C, then delete **only** this test
container: `docker rm -f dt524-postgres`.
