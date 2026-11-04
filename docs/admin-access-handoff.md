# Admin access handoff — sessions and revoking access (DT-589)

## How a staff session works
- Signing in sets the `adminAccessToken` cookie: HttpOnly, SameSite=Lax,
  Path=/, Secure in production. Browser scripts cannot read it.
- The session lasts as long as the Supabase access token, usually **1 hour**.
  There is no "stay signed in"; after it expires the next admin action
  redirects to the login page with "Your session has expired".
- Every admin API call re-checks the token with Supabase **and** the approved
  list (`ADMIN_USER_IDS`), so a change takes effect on the next request.
- Logout ends the Supabase session and deletes the cookie. If Supabase can't be
  reached within 5 seconds, the cookie is still deleted and the message says
  the server session will expire on its own (within the 1 hour above).
- Admin API responses are sent with `Cache-Control: private, no-store`, so
  browsers and proxies don't keep copies of staff or customer data.

## Removing someone's access
1. Remove their Supabase user ID from `ADMIN_USER_IDS` in the hosting settings.
2. Restart or redeploy the app so the new setting is loaded.
3. Their next admin request gets 403, and they cannot sign in again.
4. For a person who should lose all access (not just admin), also disable or
   delete their user in Supabase → Authentication → Users.

## Giving someone access
1. Create or invite the user in Supabase → Authentication → Users.
2. Add their Supabase user ID (not their email) to `ADMIN_USER_IDS`,
   comma-separated, then restart or redeploy.

## Forgotten passwords
There is no self-service reset. The login page tells staff to contact the
salon owner, who resets the password in Supabase → Authentication → Users.
Never share passwords in chat or commit them to the repository.
