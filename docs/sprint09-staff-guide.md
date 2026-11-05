# Eyebrow Hub staff operating guide

Use an approved staff account on the team's staging build for practice. All schedule dates and times are Pacific Time, including daylight-saving changes. Catalog names, prices and durations remain **unconfirmed until the client confirms them**. Test examples below are fixtures, not approved business settings.

## Find a day or week

1. Open **Schedule** (on a phone, open the navigation menu first).
2. Use the date field, previous/next arrows, or **Today**. Switch **Day** / **Week** to change the view. The arrows move one day or one week to match the view.
3. In Week view on a phone, scroll inside the weekly grid to reach other days. Keyboard users can focus the weekly scroll region and use arrow keys; Tab reaches each appointment and open slot.
4. Amber **Salon closure** labels show the reason, when provided. Day view also lists the closure time or “All day.” Gray **Unavailable** blocks are separate. A closure does not cancel an existing appointment: appointments in closed time remain selectable for staff follow-up.
5. Select an appointment to open its shared detail panel. Confirm the customer and time before taking any action. Report detail-panel defects to Fraz.

## Make a manual booking

1. Select an open grid slot or **+ Add appointment**. A grid slot prefills its date and time.
2. Enter the customer's name and phone. Email and notes are optional.
3. Choose an active service, optionally a stylist, then the date and an available time. Choosing a service refreshes times for its full duration. Closed or taken times cannot be selected.
4. Choose the intended status, review the details, and select **Save appointment** once.
5. Wait for the confirmation. The dialog closes and the schedule refreshes. Reopening starts with empty customer details.
6. To abandon an unsaved booking, select **Cancel**, **Close**, or press Escape. Focus returns to the opening slot or toolbar button; unsaved fields are discarded.

## Recover when a slot is taken

1. If another booking took the time, the form says “That time was taken…” and clears the selected time.
2. Keep the customer details; the form retains them and refreshes availability automatically.
3. Choose a newly available time and save again. If availability fails, use **Retry times** first. Do not assume a failed request created a booking; check the schedule before making a duplicate.

## Add, edit, deactivate or reactivate a service

1. Open **Services**, then **+ Add New**, or select **Edit** beside an existing service.
2. Enter a name of 1–100 characters, a whole-minute duration from 5–480, and a price from 0–99,999,999.99 with at most two decimal places. A free Brow Consult may keep price **0**.
3. Leave **Active** checked to offer the service. Clear it to deactivate; past bookings remain attached to the service. Prefer deactivation for a service used before. **Delete** removes an unused service; a referenced service is deactivated instead.
4. Select **Save** or **Update** and wait for the success message. To reactivate, edit the inactive service, check **Active**, and update. To abandon changes, select **Cancel** or press Escape while in the form.
5. Confirm the stored name, duration, price and status in the list. Do not substitute fixture values for client-approved details.

## Loading, access and refresh problems

- Wait for loading to finish before booking. If schedule, services or booking choices fail, use the nearby **Try again** / **Retry** control after checking your connection.
- An expired session requires signing in again. For **permission denied**, contact an administrator and retry after access has been corrected; retry does not grant access.
- A failed background schedule refresh leaves the last display visible with a warning and disables new booking starts. Use **Try again** before booking.
- Reload the page to fetch a fresh schedule or catalog from another staff member's changes. Saved changes persist; unsaved form entries are lost on reload.

## Teammate staging walkthrough (pending)

Reviewer/backup: Swechha. A teammate who did not build these screens must perform this checklist on the staging candidate after merge/deployment. Local fixture checks do not establish staging or client acceptance.

- [ ] At 375 px, reach every control without horizontal page scrolling; the weekly grid scrolls internally.
- [ ] Find a full-day and a partial closure in Day and Week; select an existing overlapping appointment and verify no closed interval is offered as open.
- [ ] Book manually, recover from a deliberately taken slot, and verify saved/cancelled forms reset.
- [ ] With the keyboard, open the booking dialog, Tab/Shift+Tab within it, press Escape, and verify focus returns to the opener.
- [ ] Save the free consult unchanged; add/edit a paid service; deactivate/reactivate both and verify historical bookings remain attached.
- [ ] Exercise loading, denied access, failed loading and retries on the test build; record any detail-panel issue for Fraz.
- [ ] Record staging URL, commit, reviewer, date and result here or in DT-598. Client confirmation of actual catalog values remains separate.
