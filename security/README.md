# Security checks

`.github/workflows/security-checks.yml` runs two checks on every pull request
into `main`, every push to `main`, once a week, and on demand from the
Actions tab:

- **Dependency audit:** `node security/check-audit.mjs` checks production
  dependencies against the live advisory database. It fails on any high or
  critical advisory that is not listed in `audit-exceptions.json`, on an
  exception past its review date, and when the audit cannot reach the
  registry, because no result is not a clean result.
- **Secret scan:** gitleaks v8.30.1 scans every commit on every branch. Secret
  values are redacted from the log, which matters because this repository's
  logs are public.

Both run on GitHub automatically, so nothing needs installing. To run them
locally anyway:

- **Audit:** `node security/check-audit.mjs`
- **Secret scan (optional):** install gitleaks once
  (`winget install --id Gitleaks.Gitleaks` on Windows, `brew install gitleaks`
  on macOS), then run
  `gitleaks git . --redact` from the repo root.

## Results: 2026-10-04

Scanned commit `08a952d` (`main` after PR #99), Node 22.14.0, npm 10.9.2.

### Secret scan: no leaks found

- gitleaks v8.30.1, full history: 286 commits across 72 branches and tags.
  182 commits were scanned; the rest are 100 merge commits and a few commits
  that only delete files or add images, so they add no text to scan.
- A fake token planted in a throwaway copy was detected, confirming the scan
  works.
- gitleaks cannot read images. The two screenshots in `docs/images/` were
  checked by eye and show no tokens, cookies or customer data.
- No secrets were confirmed, so no credentials need rotating.

### Dependency audit: 1 critical, 14 high (production)

30 high or critical advisories across 21 vulnerable production packages. The
same PR applied the two safe fixes below, which leaves 2 advisories, both
covered by an exception. Neither fix used `--force`.

| Finding | Fix | Owner | Status |
|---|---|---|---|
| `next` 16.1.6 (critical, including unauthenticated remote code execution and middleware bypass advisories), plus the `postcss` and `sharp` it bundles | Upgraded `next` and `eslint-config-next` to 16.3.8 (same major version) | Babar Chechi | **Fixed** |
| 14 transitive packages, including `hono`, `ws`, `defu`, `nanoid`, `lodash` and `effect` | `npm audit fix` without `--force` (lockfile changes only) | Babar Chechi | **Fixed** |
| `mysql2` and `deepmerge-ts` inside the Prisma CLI (4 packages, 2 advisories) | None without downgrading to Prisma 6 | Babar Chechi | Exception until 2026-10-25, reasons in `audit-exceptions.json` |

After both fixes: tests, the TypeScript check, lint and `npm run build` pass.
Development-only packages (lint and build tooling) have further advisories;
they are reported by `npm audit` but not gated, because they do not ship with
the app.

### Exposed endpoint access

`GET /api/admin/dashboard-summary` returned customer names, phone numbers and
emails without a login until commit `141b621` (2026-09-30). Whether anyone
used that depends on where the app was running:

- The app has never been deployed (confirmed by the team on 2026-10-04, and no
  GitHub deployments or hosting configuration exist). The endpoint was only
  reachable on developers' own machines, so there are no access logs to
  review.

### What these checks do not cover

- Advisories published after the scan date. The weekly run picks those up.
- Secrets outside git history: chat messages, Jira, PR comments, and
  dashboards such as Supabase or a hosting provider.
- GitHub's own secret scanning and Dependabot alerts for this repository,
  which only the repo owner can view.
