import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export function isolatedDatabaseUrl() {
  const raw = process.env.DT524_TEST_DATABASE_URL;
  if (!raw)
    throw new Error(
      "Set DT524_TEST_DATABASE_URL to the disposable DT-524 PostgreSQL container"
    );
  const url = new URL(raw);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    url.hostname !== "127.0.0.1" ||
    url.port !== "55432" ||
    url.username !== "postgres" ||
    url.pathname !== "/dt524_test" ||
    url.search !== ""
  ) {
    throw new Error(
      "Refusing database URL: use the disposable 127.0.0.1:55432/dt524_test container"
    );
  }
  return raw;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const databaseUrl = isolatedDatabaseUrl();
    const result = spawnSync(
      "./node_modules/.bin/prisma",
      ["migrate", "deploy"],
      {
        stdio: "inherit",
        env: { ...process.env, DATABASE_URL: databaseUrl },
      }
    );
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
