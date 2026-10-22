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

- **Test and build:** clean `npm ci`, generate the Prisma client, `npm test`,
  apply the committed migrations with `prisma migrate deploy`, check that the
  migrated database matches `prisma/schema.prisma`, then `npm run build`. A
  failing test, a broken migration, a schema change with no migration, or a
  broken build fails this job.
- **Lint:** clean `npm ci`, then `npm run lint`. It runs as a separate job so
  a lint problem doesn't hide whether tests and the build passed.

The checks use no secrets and no real data. The job starts an empty, throwaway
Postgres container, applies every migration in `prisma/migrations/` to it in
order (the same way a real release will), builds against it, and discards it
when the job ends. It never connects to the team database. Both workflows use
the Node version in `.nvmrc`.

To run the same checks locally: `npm ci`, `npm test`, `npm run build`,
`npm run lint`. Don't run `prisma migrate deploy` locally unless
`DATABASE_URL` points at a throwaway database: it writes to whatever database
that variable names.

### Making the checks required

A workflow file alone does not stop anyone merging. The repo owner has to turn
that on in GitHub: **Settings → Branches → add a rule for `main` → Require
status checks to pass**, then select **Test and build** and **Lint**. The check
names only appear in that list after the workflow has run at least once.
