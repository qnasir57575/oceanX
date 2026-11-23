/** Applies migrations to the TEST database once before contract tests run. */
import { execSync } from "node:child_process";
import { config } from "dotenv";

export default function setup() {
  config({ path: ".env", quiet: true });
  config({ path: ".env.local", quiet: true });
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("TEST_DATABASE_URL is not set. Copy .env.example to .env and run `npm run db:up`.");
  }
  if (!/test/i.test(new URL(url).pathname)) {
    throw new Error(`Refusing to run contract tests: TEST_DATABASE_URL must point to a database whose name contains "test" (got ${new URL(url).pathname}).`);
  }
  try {
    execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  } catch (error) {
    const out = (error as { stderr?: Buffer; stdout?: Buffer }).stderr?.toString() || (error as Error).message;
    throw new Error(`Could not migrate the test database. Is Postgres running (npm run db:up)?\n${out}`);
  }
}
