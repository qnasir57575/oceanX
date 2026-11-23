/**
 * Seeds the DEVELOPMENT database with demonstration data.
 *   npm run db:seed
 * WARNING: wipes all tables first. Refuses to run with NODE_ENV=production.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedDemoData } from "./seed-lib";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed demo data with NODE_ENV=production.");
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (copy .env.example to .env).");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const counts = await seedDemoData(prisma);
    console.log("Seeded demo data:", counts);
    console.log("Demo logins (password: demo-password-123): admin@, editor@, researcher@, member@demo.oceanx.local");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
