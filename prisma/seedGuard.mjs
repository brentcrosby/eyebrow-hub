// Imported first by seed.js, so this is read before dotenv loads .env. That is
// deliberate: the opt-in has to be given for the one command, and can't be left
// switched on in a .env file by accident.
const OPT_IN = process.env.ALLOW_DEMO_SEED;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

// Returns why seeding must not run, or null when it may. The seed deletes and
// recreates services, stylists and demo appointments, so it is for disposable
// local databases only and is never a production bootstrap.
export function demoSeedRefusal({
  optIn = OPT_IN,
  databaseUrl = process.env.DATABASE_URL,
} = {}) {
  if (optIn !== "1") {
    return "Refusing to seed: this replaces services, stylists and demo appointments. Run it only against a disposable database, with ALLOW_DEMO_SEED=1 set for this one command.";
  }
  if (!databaseUrl) {
    return "Refusing to seed: DATABASE_URL is not set.";
  }
  // A second lock: Prisma and this script read .env, which usually holds the
  // shared team database, so a disposable URL in .env.local is easy to miss.
  let host;
  try {
    host = new URL(databaseUrl).hostname;
  } catch {
    return "Refusing to seed: DATABASE_URL is not a valid URL.";
  }
  if (!LOCAL_HOSTS.has(host)) {
    return `Refusing to seed: DATABASE_URL points at ${host}, not this computer. The demo seed only runs against a disposable local database.`;
  }
  return null;
}

// Host, port and database name only, so the password never reaches the console.
export function describeTarget(databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    return `${url.hostname}${url.port ? `:${url.port}` : ""}${url.pathname}`;
  } catch {
    return "an unreadable DATABASE_URL";
  }
}
