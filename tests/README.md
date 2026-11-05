# Tests

```bash
npm test
```

Runs every `tests/**/*.test.mjs` file with Node's built-in test runner. There
is no extra framework to install. Use Node 22, the version pinned in `.nvmrc`
and used by CI (`nvm use` picks it up).

Before the tests run, `npm test` regenerates the Prisma client so it always
matches the schema. That step never connects to a database, and it works on a
fresh checkout with no `.env` file.

A failing assertion, or a test file that cannot load, makes `npm test` exit
with code 1. To check that yourself, add a test containing
`assert.equal(1, 2)`, run `npm test`, then delete it.

## Writing a test

Name the file `something.test.mjs` and put it under `tests/`. Use
`node:test` and `node:assert/strict`:

```js
import assert from "node:assert/strict";
import { test } from "node:test";
```

How you load the code depends on what it imports.

### Plain helpers: import the `.ts` file directly

For files with no imports, or only imports of packages, such as
`lib/bookingAccess.ts`:

```js
import { isBookingCancellable } from "../lib/bookingAccess.ts";
```

This does not work if the file imports `@/...` paths. Use `loadModule` for
those.

### Routes and anything using `@/...`, Prisma, Supabase or Next.js: `loadModule`

`tests/helpers/loadModule.mjs` loads a TypeScript file and replaces each of
its imports with a mock you supply:

```js
import { NextResponse } from "next/server.js";
import { loadModule } from "./helpers/loadModule.mjs";

test("lists active stylists", async () => {
  const calls = [];
  const route = loadModule("app/api/stylists/route.ts", {
    mocks: {
      "next/server": { NextResponse },
      "@/lib/db": {
        db: {
          stylist: {
            findMany: async (args) => {
              calls.push(args);
              return [{ id: 1, name: "Fixture Stylist" }];
            },
          },
        },
      },
    },
  });

  const response = await route.GET();

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [{ id: 1, name: "Fixture Stylist" }]);
  assert.equal(calls[0].where.active, true);
});
```

The path is relative to the repo root. The returned object holds the file's
exports, so `route.GET()` runs the real handler against your mocks.

## Mock conventions

- **Every import needs a mock.** An import without one throws and names the
  missing module. This is what keeps tests away from the real database and
  Supabase. `import type` lines are removed before the file runs and need no
  mock.
- **Mock only what the code calls.** For `@/lib/db`, include just the model
  methods the code under test uses.
- **Record calls when it matters.** Push to a `calls` array inside each mock
  so a test can assert that a denied request made no database calls.
- **Pass the real thing when it is cheap.** Use the real `NextResponse` from
  `next/server.js` so status codes and headers are genuine.
- **Default imports read `.default`.** For `import x from "pkg"`, mock it as
  `{ default: x }`.
- **Environment is explicit.** The module sees only the `env` you pass, never
  the real environment, so a missing setting really is missing.
- **`.tsx` files** also need a `"react/jsx-runtime"` mock.

## Fixture data

- Use made-up data: names like "Fixture Customer", emails at
  `example.invalid`, phone numbers such as `5550100100`.
- Never use real customer data, and never copy values from `.env`,
  `.env.local` or the database.
- Keep fixtures inside the test file that uses them.

## Existing tests

- `bookingAccess.test.mjs` and `manageBooking.test.mjs` import plain helpers
  directly.
- `admin-auth-policy.test.mjs`, `dashboard-summary-access.test.mjs` and
  `service-security.test.mjs` predate `loadModule` and each contain their own
  copy of the same loader. They work as they are; new tests should use the
  shared helper.

## Pull request checks

`.github/workflows/pr-checks.yml` runs on every pull request into `main` and
on every push to `main`. It has two jobs:

- **Test and build:** clean `npm ci`, generate the Prisma client, apply the
  committed migrations with `prisma migrate deploy`, check that the migrated
  database matches `prisma/schema.prisma`, migrate the three test databases,
  `npm run build`, start the built app behind the local proxy, then run every
  test, **including the database tests**. A failing test, a skipped test, a
  broken migration, a schema change with no migration, or a broken build fails
  this job.
- **Lint:** clean `npm ci`, then `npm run lint`. It runs as a separate job so
  a lint problem doesn't hide whether tests and the build passed.

The checks use no real secrets and no real data. The job starts four empty,
throwaway Postgres containers, applies every migration in `prisma/migrations/`
to them in order (the same way a real release will), and discards them when
the job ends. It never connects to the team database. The limiter secret is
generated fresh for each run. Both workflows use the Node version in `.nvmrc`.

### Database tests

A few tests need a real PostgreSQL database. Each one only accepts one fixed
local address, so it can never reach the team database, and **skips** when its
setting isn't given:

| Setting | Database | Tests |
| :---- | :---- | :---- |
| `DT524_TEST_DATABASE_URL` | `postgres@127.0.0.1:55432/dt524_test` | `booking-rate-limit-db`, and with `DT524_HTTP_TEST=1`, `booking-rate-limit-http` |
| `DT571_TEST_DATABASE_URL` | `127.0.0.1:55433/dt571_test` | `sprint08-mosab-reservations`, `sprint09-mosab-capacity`, `sprint09-mosab-policy` |
| `DT_SPRINT09_TEST_DATABASE_URL` | `127.0.0.1:55434/sprint09_test` | `sprint09-mosab-recovery` |

So a plain `npm test` reports these as skipped, and a skipped test is not a
pass. CI turns them all on and fails the job if any test is skipped. Test
files run one at a time (`--test-concurrency=1`), because the reservation
tests share one salon-wide database.

### Running the full release check yourself

Needs Docker and Node 22 (`nvm use`). Run from the repo root in Git Bash (on
Windows) or any POSIX shell. Only throwaway containers are used.

```bash
npm ci
docker run -d --name dt585-dt524 -e POSTGRES_PASSWORD=ci -e POSTGRES_DB=dt524_test -p 127.0.0.1:55432:5432 postgres:17-alpine
docker run -d --name dt585-dt571 -e POSTGRES_PASSWORD=ci -e POSTGRES_DB=dt571_test -p 127.0.0.1:55433:5432 postgres:17-alpine
docker run -d --name dt585-sprint09 -e POSTGRES_PASSWORD=ci -e POSTGRES_DB=sprint09_test -p 127.0.0.1:55434:5432 postgres:17-alpine

export DT524_TEST_DATABASE_URL=postgresql://postgres:ci@127.0.0.1:55432/dt524_test
export DT571_TEST_DATABASE_URL=postgresql://postgres:ci@127.0.0.1:55433/dt571_test
export DT_SPRINT09_TEST_DATABASE_URL=postgresql://postgres:ci@127.0.0.1:55434/sprint09_test
export BOOKING_RATE_LIMIT_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
export BOOKING_CLIENT_IP_HEADER=x-trusted-client-ip
export DT524_HTTP_TEST=1
unset VERCEL

for url in "$DT524_TEST_DATABASE_URL" "$DT571_TEST_DATABASE_URL" "$DT_SPRINT09_TEST_DATABASE_URL"; do
  DATABASE_URL="$url" npx prisma migrate deploy
done
DATABASE_URL="$DT571_TEST_DATABASE_URL" npm run build
```

In a second terminal (with the same `export` lines), start the app on the
limiter database, and in a third, the proxy:

```bash
DATABASE_URL="$DT524_TEST_DATABASE_URL" npx next start --hostname 127.0.0.1 --port 3101
```

```bash
node scripts/dt524-local-proxy.mjs
```

Back in the first terminal, run every test the way CI does:

```bash
node --experimental-strip-types --disable-warning=ExperimentalWarning \
  --test --test-concurrency=1 --test-reporter=tap "tests/**/*.test.mjs" | tee test-results.tap
grep -E '^# (tests|pass|fail|skipped)' test-results.tap
```

Expect `# fail 0` and `# skipped 0`. Then stop the app and proxy (Ctrl+C) and
remove the containers:

```bash
docker rm -f -v dt585-dt524 dt585-dt571 dt585-sprint09
rm test-results.tap
```

Don't run `prisma migrate deploy` against anything else: it writes to whatever
database `DATABASE_URL` names.

### Making the checks required

A workflow file alone does not stop anyone merging. `main` already has an
active ruleset (`main-branch-protection`) that requires one approving review
and blocks deletion and force pushes, but it requires no status checks. The
repo owner adds them in GitHub: **Settings → Rules → Rulesets →
main-branch-protection → Require status checks to pass**, then adds
**Test and build**, **Lint**, **Dependency audit** and **Secret scan**. Keep
the required approval. The check names only appear in that list after the
workflows have run at least once.
