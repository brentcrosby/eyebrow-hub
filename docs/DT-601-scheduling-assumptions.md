# DT-601 — Shared scheduling assumptions

Provisional pending client confirmation; no new settings are introduced.
Persisted BusinessHour rows and SchedulingRule id 1 override existing defaults:
Sunday 11:00–18:00, Monday–Saturday 10:00–20:00, 120-minute notice,
30 Pacific calendar days advance, and 15-minute appointment buffer.
Existing slot spacing remains 30 minutes from opening; unspecified availability
duration remains 15 minutes. Service durations come from active service records.

Opening and exact closing are inclusive for the group interval; notice equality
is allowed. The last advance date is included. Appointment separation needs one
configured buffer, not twice the buffer. Buffer can extend outside business
hours; only service time must fit. Blocks/closures use raw half-open intervals,
so touching their boundary is allowed. Sequential services have no internal gap.
Manual creation has no override. Pacific ambiguous/nonexistent labels remain
rejected. Cancellation behavior and response envelopes remain unchanged.

Date availability means at least one slot for the existing default duration;
service-specific times are still checked with the selected total duration.
Read-time availability is advisory: serializable save transactions re-read
settings, buffered conflicts and closures. A stale offer can legitimately become
a 409 after another booking, closure or settings edit.

This PR originally stacked on DT-600; DT-600 and DT-602 are now merged into
main and incorporated into this branch.
CI remains Bobby's DT-585 responsibility. Legacy tests explicitly isolate
policy where they test input/lifecycle/historical persistence; new owner tests
use the real policy and fixed clock. No production data is repaired or shifted.

Run database suites sharing the salon-wide test database with
`--test-concurrency=1`; independent serializable suites can otherwise cause
unrelated predicate-lock serialization failures. Bobby's CI invocation must
use this option (or isolate each file in a separate database). Each suite still
races its competing requests internally.

Local verification command after migrating the disposable DT-571 database:

```sh
DT571_TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55433/dt571_test \
  node --experimental-strip-types --disable-warning=ExperimentalWarning \
  --test --test-concurrency=1 tests/sprint08-mosab-reservations.test.mjs \
  tests/sprint09-mosab-capacity.test.mjs tests/sprint09-mosab-policy.test.mjs
```

DT-602's historical-persistence test uses the same explicit legacy-policy
isolation as the other persistence suites. Its timestamp, status, rollback and
conflict assertions are unchanged; dedicated policy tests enforce the real
scheduling rules. Verify the combined tree, not only each original branch.