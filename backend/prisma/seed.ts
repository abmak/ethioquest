import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { ensureQuizPool } from "../src/lib/quiz/pool";
import { ensurePrizeConfig } from "../src/lib/prizes";
import { DEFAULT_ROLES } from "../src/lib/permissions";
import { DESTINATIONS } from "./data";

const DEMO_PASSWORD = "Password123!";

async function seedDestinations() {
  for (const d of DESTINATIONS) {
    const { slug, ...data } = d;
    await prisma.destination.upsert({
      where: { slug },
      create: { slug, ...data, featured: d.featured ?? false },
      update: { ...data, featured: d.featured ?? false },
    });
  }
  return DESTINATIONS.length;
}

async function seedRoles() {
  for (const role of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      // Existing roles keep the permissions staff have tuned.
      create: role,
      update: { builtIn: role.builtIn },
    });
  }
  return DEFAULT_ROLES.length;
}

async function seedAccounts() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const accounts = [
    { email: "admin@ethioquest.test", username: "admin", displayName: "Admin", role: "ADMIN" },
    { email: "member@ethioquest.test", username: "member", displayName: "Demo Member", role: "USER" },
  ];
  for (const a of accounts) {
    await prisma.user.upsert({
      where: { email: a.email },
      create: { ...a, passwordHash },
      update: { role: a.role, banned: false },
    });
  }
  return accounts.length;
}

async function main() {
  const destinations = await seedDestinations();
  const roles = await seedRoles();
  const accounts = await seedAccounts();
  const pool = await ensureQuizPool();
  const tiers = await ensurePrizeConfig();
  console.log(
    `Seeded ${destinations} destinations, ${roles} roles, ${accounts} demo accounts, quiz pool: ${pool.inserted} inserted, ${pool.total} total, prize tiers: ${tiers} created.`,
  );
  console.log(`Demo password for seeded accounts: ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
