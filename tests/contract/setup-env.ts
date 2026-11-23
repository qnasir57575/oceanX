/** Runs in every contract-test worker before any module imports the Prisma client. */
import { config } from "dotenv";

config({ path: ".env", quiet: true });
config({ path: ".env.local", quiet: true });
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.APP_ORIGIN = "http://localhost:3000";
