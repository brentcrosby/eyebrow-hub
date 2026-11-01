# DT-602 — Read-only booking data checks and recovery handoff

No existing appointment is shifted or repaired by this task. Any repair needs
its own reviewed migration, evidence, backup and restore verification.

## Timestamp provenance before proposing a repair

The initial migration creates `Appointment.startTime` and `endTime` as
`TIMESTAMP(3)` (without time zone). A value alone does not establish the original
customer wall-clock selection. Before Pacific normalization (DT-573), public
creation parsed offset-free date strings and manual creation used host-local
date setters. Their interpretation depended on the deployment's timezone.
Current creation uses `lib/salonTime.ts` to convert America/Los_Angeles wall
time to an instant; Prisma serializes that instant to the existing columns.
Do not apply a blanket seven/eight-hour correction or infer timezone from
`createdAt` alone. Establish the deployed commit, host TZ, booking source,
original confirmation/request evidence and date-specific Pacific offset first.

Use a read-only database role and an approved connection. Never paste customer
rows, connection URLs or credentials into PRs. The following checks avoid PII:

```sql
BEGIN TRANSACTION READ ONLY;
SHOW TIME ZONE;
SELECT column_name, data_type, datetime_precision
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'Appointment'
  AND column_name IN ('startTime', 'endTime', 'createdAt');

SELECT source, status, count(*)
FROM "Appointment" GROUP BY source, status ORDER BY source, status;

SELECT count(*) AS nonpositive_intervals
FROM "Appointment" WHERE "endTime" <= "startTime";

-- Only for rows whose provenance confirms UTC-normalized storage:
-- bind :appointment_id using your SQL client's parameter support.
SELECT id, source, status, "startTime", "endTime",
  ("startTime" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Los_Angeles'
    AS pacific_start_if_utc
FROM "Appointment" WHERE id = :appointment_id;
ROLLBACK;
```

Record findings in an access-controlled incident note. Do not interpret the
last query as proof that every historic row was stored as UTC.

## Reusable synthetic fixtures and tests

`tests/fixtures/sprint09-bookings.mjs` exports Pacific cases before, during and
after November 1, 2026, every canonical status and fresh request/payload builders.
The repeated 1:30 AM fall-back label is rejected rather than guessed. The
transition day is 25 hours. Cancelled/rejected do not occupy capacity; completed
appointments retain the existing blocking semantics.

From the repository root, create a dedicated disposable PostgreSQL database:

```sh
docker run -d --name eyebrow-sprint09-db \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=sprint09_test -p 127.0.0.1:55434:5432 postgres:17-alpine
# Wait for pg_isready before applying migrations.
docker exec eyebrow-sprint09-db pg_isready -U postgres -d sprint09_test
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55434/sprint09_test npx prisma migrate deploy
DT_SPRINT09_TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55434/sprint09_test \
  node --experimental-strip-types --disable-warning=ExperimentalWarning \
  --test tests/sprint09-mosab-recovery.test.mjs
docker rm -f -v eyebrow-sprint09-db
```

Without the explicit test URL, persistence tests skip; that is not a database
verification pass. The test refuses non-loopback, wrong-port/name and
schema-override URLs. It inserts synthetic records and removes only its own
fixtures. Never point it at a reused application database. PostgreSQL writes
are real; rate limiting and the offer-time response are mocked to isolate
historical persistence from current notice/hours policy. This is not a full
browser or live availability test.

Tests verify assigned/unassigned stored instants, status conflicts with usable
409 messages, second-service rollback for both unexpected failure and conflict,
and successful multi-service retry with one reference and contiguous rows.

## Recovery handoff to Brent (must be completed before release)

- [ ] Brent records the backup snapshot, deployment SHA and restore-drill owner.
- [ ] Restore into an isolated database, never over the live database for a drill.
- [ ] Run the read-only provenance checks on the restored copy; compare counts
      and representative verified bookings against the snapshot evidence.
- [ ] Run synthetic persistence/rollback tests on the dedicated test database.
- [ ] Reconcile an uncertain booking by its existing reference before retrying;
      do not blindly replay a request after a network failure.
- [ ] For bad historic timestamps, document affected IDs and evidence, obtain
      client/team approval and review a separate narrowly targeted migration.
- [ ] Record restore verification, rollback criteria and release sign-off.

These are coordination requirements, not a claim that Brent's drill or any
production-data verification has already been performed.