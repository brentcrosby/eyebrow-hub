import { execSync } from "node:child_process";

// Runs before `npm test`. Tests import the generated Prisma client, so it must
// exist and match the schema. prisma.config.ts requires DATABASE_URL even
// though generating never connects, so a placeholder covers a clean checkout.
try {
  execSync("npx prisma generate", {
    stdio: "pipe",
    env: {
      ...process.env,
      DATABASE_URL:
        process.env.DATABASE_URL ?? "postgresql://test:test@localhost:5432/test",
    },
  });
} catch (error) {
  process.stderr.write(error.stdout ?? "");
  process.stderr.write(error.stderr ?? "");
  process.exit(1);
}
