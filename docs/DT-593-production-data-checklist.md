# DT-593 Production data checklist

What has to be true about real business data before release, and how to check
it without damaging anything. Nothing here deletes or overwrites production
data. Setting names only: never put database URLs or secrets in this file.

- **Owner:** Swechha. **Reviewer/backup:** Mosab.
- **Decision log:** Brent owns it. The client confirmation below is sent and
  recorded there; this file only tracks status.

## Rule: demo data never goes to production

- **Never run `npm run seed` (`prisma/seed.js`) against production or staging.**
  It deletes and recreates services and stylists and adds demo appointments.
  `prisma/seedGuard.mjs` already refuses non-local databases and needs
  `ALLOW_DEMO_SEED=1`; do not work around either lock.
- Real values go in through the admin screens (Availability, Services), one
  change at a time, so every change is visible and reversible.
- Staging uses only **clearly labelled, disposable test data**: customer names
  start with `TEST -`, phone numbers use the fictional `555-0100` to `555-0199`
  range, emails use `@example.com`, and service or stylist names added for a
  test start with `TEST -`. Remove them when the test is done.

## Business values awaiting client confirmation

Every value below is **UNCONFIRMED** until it is recorded in Brent's decision
log. Update the status column, with the decision-log date, when it is confirmed.

| Value | Current value in the app | Where it lives | Status |
| :---- | :---- | :---- | :---- |
| Weekly hours | Defaults if nothing is saved: Mon-Sat 10:00 am - 8:00 pm, Sun 11:00 am - 6:00 pm. Whatever is saved in the database overrides these. | `DEFAULT_BUSINESS_HOURS` in `lib/availabilitySettings.ts`; saved rows in `BusinessHour` (Admin > Availability) | UNCONFIRMED |
| Booking rules | Minimum notice 120 min, book up to 30 days ahead, 15 min buffer | `DEFAULT_SCHEDULING_RULE`; `SchedulingRule` row (Admin > Availability) | UNCONFIRMED |
| Services, prices, durations | 14 demo services from $0 (Brow Consult) to $30 (Full Face), all 15 minutes | `prisma/seed.js` (demo only); `Service` rows (Admin > Services) | UNCONFIRMED |
| Stylist roster | Ava Nguyen, Maya Patel, Sofia Ramirez, Jasmine Lee (demo names) | `prisma/seed.js` (demo only); `Stylist` rows | UNCONFIRMED |
| Salon capacity | One appointment group at a time across the salon (DT-600 provisional) | `docs/DT-600-capacity-assumption.md` | UNCONFIRMED |
| Address | 1215 Colusa Ave, Yuba City, CA 95991 | `components/Footer.tsx`, `components/LocationSection.tsx` | UNCONFIRMED |
| Phone | 530-751-5098 | `components/Footer.tsx` | UNCONFIRMED |
| Cancellation policy | Online cancellation only more than 4 hours before the first service | `CANCELLATION_NOTICE_MS` in `lib/bookingAccess.ts`; text in `components/ManageBookingForm.tsx` | UNCONFIRMED |
| Timezone | All times are Pacific (America/Los_Angeles) | `lib/salonTime.ts` | UNCONFIRMED |

## Confirmation request for the client

Send through Brent so the answer lands in the decision log:

> Before the booking site goes live we need you to confirm the details below.
> For each one, reply "correct" or send the right value.
>
> 1. Opening hours for each day of the week, and any days you are closed.
> 2. Each service you offer, its price, and how long it takes.
> 3. The names of the stylists who take bookings.
> 4. How many clients can be served at the same time.
> 5. The salon address and phone number shown on the site.
> 6. Your cancellation policy (the site currently allows online cancellation
>    up to 4 hours before the appointment).
> 7. Minimum notice for a new booking (now 2 hours), how far ahead people can
>    book (now 30 days), and the gap between appointments (now 15 minutes).

## Release checks (non-destructive)

Run these on a disposable or staging database, never against production data
you have not backed up.

1. **Hours update without a rebuild.** `npm run build`, then `npm start`.
   Change one day's hours in Admin > Availability and save. Reload the homepage:
   the new hours show. (The homepage is `force-dynamic` and the settings API is
   `no-store`, so nothing is cached at build time.)
2. **Settings survive a restart.** Stop the server, `npm start` again, reload
   Admin > Availability and the homepage: the saved hours and rules are still
   there. They are stored in the `BusinessHour` and `SchedulingRule` tables.
3. **Empty database.** With no `BusinessHour` rows, the homepage shows "Our
   business hours will be posted here soon..." instead of the demo defaults or
   a blank section.
4. **Database down.** With the database unreachable, the homepage still loads
   and the hours section says "We can't show our business hours right now...".
5. Record the date, commit and result of each check in the PR or the decision
   log.

Checks 3 and 4 are covered by `tests/sprint09-swechha-settings.test.mjs`.
Checks 1 and 2 need a running build and are done by hand.
