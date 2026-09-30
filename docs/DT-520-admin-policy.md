# DT-520 — Approved-admin contract / Mohamed handoff

- Missing/malformed/invalid sessions return 401 (`Unauthorized`). Verified sessions
  whose user IDs are not approved return 403 (`Forbidden`) before route database work.
- Set server-only `ADMIN_USER_IDS` to comma-separated Supabase Auth user IDs.
  Missing/empty policy denies every user. Names, emails and editable user metadata
  do not approve an account; changing an email does not change approval.
- Before merge/deployment, the owner must confirm their account and the deployment
  maintainer must add its ID from Supabase Authentication → Users to this setting.
  Configure each deployment and local `.env.local`, then restart/redeploy. Do not
  commit real IDs or use a `NEXT_PUBLIC_` variable. Remove an ID to revoke access.
- No cookie/login/CSRF changes here. Mohamed must preserve this approval check and
  the 401/403 contract when integrating cookie sessions. This is a prepared handoff,
  not confirmation that notification or provisioning occurred.
- Run `node --test tests/admin-auth-policy.test.mjs`. Manually check
  `/api/admin/account`: signed out → 401; signed in but unlisted → 403; listed → 200.
  DT-519 merges independently; its summary guard then inherits this policy without
  additional code integration. Service-specific regression tests belong to DT-521.
