import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { ensureQuizPool } from "../src/lib/quiz/pool";
import { ensurePrizeConfig } from "../src/lib/prizes";
import { DEFAULT_ROLES } from "../src/lib/permissions";
import { DESTINATIONS } from "./data";

const DEMO_PASSWORD = "Password123!";
// Owner login used for local work and for the deployed API (see ADMIN_BOOTSTRAP_* in config/env.ts).
const OWNER_EMAIL = "admin@gmail.com";
const OWNER_PASSWORD = "Abay@1234";

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
  const demoHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const ownerHash = await bcrypt.hash(OWNER_PASSWORD, 12);
  const accounts = [
    { email: OWNER_EMAIL, username: "admin", displayName: "Admin", role: "ADMIN", passwordHash: ownerHash },
    { email: "member@ethioquest.test", username: "member", displayName: "Demo Member", role: "USER", passwordHash: demoHash },
  ];
  for (const { passwordHash, ...a } of accounts) {
    await prisma.user.upsert({
      where: { email: a.email },
      create: { ...a, passwordHash },
      update: { role: a.role, banned: false, passwordHash },
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
  console.log(`Owner login: ${OWNER_EMAIL} / ${OWNER_PASSWORD}`);
  console.log(`Demo member password: ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
