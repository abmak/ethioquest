import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/async-handler";
import { ApiError } from "../lib/errors";
import { authLimiter } from "../lib/rate-limit";
import { clearAuthCookies, setAuthCookies } from "../lib/cookies";
import { requireAuth } from "../middleware/auth";
import { permissionsForRole } from "../lib/permissions";
import { validate } from "../middleware/validate";

export const authRouter = Router();

const adminEmails = new Set(
  env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean),
);

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  username: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/, "Use letters, numbers and underscores only"),
  displayName: z.string().trim().min(1).max(60),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

const publicUser = (u: {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: string;
  region: string | null;
  bio: string | null;
}) => ({
  id: u.id,
  email: u.email,
  username: u.username,
  displayName: u.displayName,
  role: u.role,
  region: u.region,
  bio: u.bio,
});

/**
 * The session user plus their role's capabilities, so the console can hide the
 * surfaces the API would refuse anyway.
 */
const userPayload = async (u: Parameters<typeof publicUser>[0]) => ({
  ...publicUser(u),
  permissions: await permissionsForRole(u.role),
});

authRouter.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, username, displayName, password } = req.body as z.infer<typeof registerSchema>;

    const clash = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { email: true },
    });
    if (clash) {
      throw ApiError.conflict(
        clash.email === email
          ? "An account with this email already exists"
          : "That username is taken",
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        username,
        displayName,
        passwordHash,
        role: adminEmails.has(email) ? "ADMIN" : "USER",
      },
    });

    setAuthCookies(res, user);
    res.status(201).json({ user: await userPayload(user) });
  }),
);

authRouter.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const user = await prisma.user.findUnique({ where: { email } });

    // Same message for unknown email and wrong password, so accounts can't be probed.
    const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || !ok) {
      throw ApiError.unauthorized("Email or password is incorrect");
    }
    if (user.banned) {
      throw ApiError.forbidden("This account has been suspended");
    }

    setAuthCookies(res, user);
    res.json({ user: await userPayload(user) });
  }),
);

authRouter.post("/logout", (_req, res) => {
  clearAuthCookies(res);
  res.status(204).end();
});

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) throw ApiError.unauthorized();
    res.json({ user: await userPayload(user) });
  }),
);
