# DT-531 — Admin login response contract (for Brent's login throttling)

`POST /api/admin/login` with JSON `{ "email": "...", "password": "..." }`.

| Status | Body `message` | Cookie |
| --- | --- | --- |
| 200 | `Login successful` | Sets `adminAccessToken` |
| 400 | `Invalid request body`, `Email and password are required`, or `Invalid email or password` (email over 254 or password over 1024 characters) | None |
| 401 | `Invalid email or password` (same for unknown email and wrong password) | None |
| 403 | `This account does not have admin access.` (correct password, but not in `ADMIN_USER_IDS`; DT-575) | None |
| 429 | `Too many login attempts. Please try again later.` plus a `Retry-After` header (seconds) | None |
| 500 | `Login failed. Please try again.` | None |
| 503 | `Login is temporarily unavailable.` (the attempt limiter is not configured or the database is down) | None |

- The token is never in the response body. It is only in the `adminAccessToken`
  cookie: HttpOnly, SameSite=Lax, Path=/, Max-Age = Supabase `expires_in`
  (usually 1 hour), and Secure in production.
- No error details or tokens are returned or logged.
- Attempt limit (DT-576): 10 login attempts per caller per 15 minutes, counted
  before the email and password are checked, so malformed attempts count too.
  It reuses the booking limiter (`lib/bookingRateLimit.ts`, operation `login`):
  the same `booking_request_limits` table, so the count is shared across app
  instances; only an HMAC of the caller IP is stored, never the IP or credentials.
  It needs the same settings as booking: `BOOKING_RATE_LIMIT_SECRET` and a
  trusted client-IP header (`x-vercel-forwarded-for` on Vercel, otherwise
  `BOOKING_CLIENT_IP_HEADER`). Without them, login returns 503 (fails closed).
- Logout is `POST /api/admin/logout` (DT-532).
- Test: `node --experimental-strip-types --test tests/admin-login.test.mjs`
