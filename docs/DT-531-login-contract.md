# DT-531 — Admin login response contract (for Brent's login throttling)

`POST /api/admin/login` with JSON `{ "email": "...", "password": "..." }`.

| Status | Body `message` | Cookie |
| --- | --- | --- |
| 200 | `Login successful` | Sets `adminAccessToken` |
| 400 | `Invalid request body` or `Email and password are required` | None |
| 401 | `Invalid email or password` (same for unknown email and wrong password) | None |
| 500 | `Login failed. Please try again.` | None |

- The token is never in the response body. It is only in the `adminAccessToken`
  cookie: HttpOnly, SameSite=Lax, Path=/, Max-Age = Supabase `expires_in`
  (usually 1 hour), and Secure in production.
- No error details or tokens are returned or logged.
- Throttling can add a 429 without changing the responses above. The login page
  shows any `message` it gets back, so a 429 should include a `message` too.
- Logout is `POST /api/admin/logout` (DT-532).
- Test: `node --experimental-strip-types --test tests/admin-login.test.mjs`
