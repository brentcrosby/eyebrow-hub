# DT-557 — partial implementation and integration blocker

The confirmation copy, calendar text escaping, and RFC 5545 line folding are independent of the
booking API. **Do not mark Pacific-time consistency or the full customer journey
complete yet.** The creation endpoint currently interprets a selected wall time
in the server's timezone. No backend timestamp conversion is changed here.

## Reproducible mocked-handler finding

On October 16, 2026, the actual `app/api/bookings/route.ts` `POST` handler was
loaded with `tests/helpers/loadModule.mjs`. Mocks supplied two 30-minute services,
an available `10:00 AM` slot, a fixed reference `0123456789ABCDEF`, and an
in-memory appointment `create`. The request selected October 20, 2026 at
10:00 AM Pacific with fictitious `example.invalid` / 555 customer data.
There was **no real database, HTTP booking request, or customer appointment**.
The handler returned 201 and both stored rows shared the reference.

| Node server TZ        | Handler `booking.startTime`–`endTime`                 | Pacific rendering of those instants         | UTC `.ics` date fields from those instants           |
| --------------------- | ----------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------- |
| `UTC`                 | `2026-10-20T10:00:00.000Z`–`2026-10-20T11:00:00.000Z` | 3:00–4:00 AM PDT, **not selected 10:00 AM** | `DTSTART:20261020T100000Z`, `DTEND:20261020T110000Z` |
| `America/Los_Angeles` | `2026-10-20T17:00:00.000Z`–`2026-10-20T18:00:00.000Z` | 10:00–11:00 AM PDT                          | `DTSTART:20261020T170000Z`, `DTEND:20261020T180000Z` |

The lookup and `.ics` columns above are formatting of the returned timestamps,
**not** an executed lookup request or imported calendar. The API uses
`new Date("YYYY-MM-DDTHH:mm:ss")`, which interprets the time in the server's
local timezone. `toISOString()` serializes that instant; neither lookup's
Pacific formatter nor the calendar's UTC serializer can correct an already
incorrect instant. The earlier timezone risk is also noted in
`docs/DT-463-walkthrough.md`.

## Before DT-557 can be completed

- Coordinate a separate owner-reviewed backend timezone fix; do not silently
  adjust the `.ics` file to mask the API result.
- Rerun **creation → lookup → calendar** with controlled responses or a
  disposable database under UTC and Pacific server settings (including PDT
  and PST dates). Check selected wall time, API ISO values, each service's lookup
  display, and the imported/exported calendar event against the same instants.
- Recheck invalid lookup, four-hour cancellation policy, multi-service group
  cancellation, and DT-555 conflict recovery. Record actual desktop and narrow
  viewport results; no visual browser check is claimed here.

AI assisted the draft code, tests, and this note. Review and explain each change
before committing; mark AI used and record the actual model shown in your IDE
in the Sprint Execution Report (not guessed here), and obtain peer review per
the CSC 190/191 agreement.
