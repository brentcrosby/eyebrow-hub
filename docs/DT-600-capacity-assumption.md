# DT-600 — Provisional salon-wide capacity

Bobby's approval, supplied by Mosab in the task handoff, authorizes implementation:
one appointment group at a time across the salon, online/manual and named/Next
Available. Sequential services count as one group; Next Available stays
unassigned. No silent staff override, existing appointment edits or response
contract changes are authorized. The staffing model is pending client confirmation.

**Merge gate:** Brent owns the decision log. Link his recorded decision in the
DT-600 PR before merging. This document records the implementation assumption,
not a replacement decision-log entry or a claim that the merge gate is met.

Both create paths check the full group interval using the shared reservation
helper inside serializable transactions. Stylist validity is still checked,
but assignment does not partition capacity. Cancelled/rejected rows remain
nonblocking; other statuses retain their existing behavior.

If the client approves per-stylist capacity later, change the shared resource
predicate and availability together, define unassigned-resource semantics,
and replace the assigned/unassigned concurrency matrix accordingly. Do not
simply restore a stylist filter: null assignments must never bypass capacity.
No multi-stylist allocation or data migration is introduced here.

CI ownership remains with Bobby under DT-585. Reservation tests use the existing
`DT571_TEST_DATABASE_URL` contract: `127.0.0.1:55433/dt571_test`, a migrated,
disposable PostgreSQL database. They must run after migrations; a skipped test
is not evidence of database verification. No workflow files are changed here.