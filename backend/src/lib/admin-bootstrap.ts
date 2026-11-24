import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { prisma } from "./prisma";
import { logger } from "./logger";

const usernameFor = (email: string) => {
  const base = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20) || "admin";
  return base.length >= 3 ? base : `${base}admin`.slice(0, 20);
};

/**
 * Keeps the owner account usable: it is created on first boot, promoted to ADMIN
 * if it already exists, and its password is kept in sync with the configured
 * bootstrap password so the published owner login always works.
 */
export async function ensureAdminAccount(): Promise<void> {
  const email = env.ADMIN_BOOTSTRAP_EMAIL.trim().toLowerCase();
  const password = env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!email || password.length < 8) {
    logger.warn("ADMIN_BOOTSTRAP_EMAIL/PASSWORD is empty or too short; skipping the owner account");
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const passwordMatches = await bcrypt.compare(password, existing.passwordHash);
    const needsPromotion = existing.role !== "ADMIN" || existing.banned;
    if (!needsPromotion && passwordMatches) return;

    await prisma.user.update({
      where: { email },
      data: {
        role: "ADMIN",
        banned: false,
        ...(passwordMatches ? {} : { passwordHash: await bcrypt.hash(password, 12), passwordChangedAt: new Date() }),
      },
    });
    logger.info({ email }, "Ensured the owner account is an active ADMIN");
    return;
  }

  const taken = await prisma.user.findUnique({ where: { username: usernameFor(email) } });
  const username = taken ? `${usernameFor(email)}_${Date.now().toString(36).slice(-4)}` : usernameFor(email);

  await prisma.user.create({
    data: {
      email,
      username,
      displayName: "Admin",
      passwordHash: await bcrypt.hash(password, 12),
      role: "ADMIN",
    },
  });
  logger.info({ email, username }, "Created the owner ADMIN account");
}
