import type { NextFunction, Request, RequestHandler, Response } from "express";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";
import { TOKEN_COOKIE } from "../lib/cookies";
import { verifyAuthToken } from "../lib/jwt";
import { asyncHandler } from "../lib/async-handler";
import { permissionsForRole } from "../lib/permissions";

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  const cookie = req.cookies?.[TOKEN_COOKIE];
  return typeof cookie === "string" && cookie.length > 0 ? cookie : null;
}

/**
 * Populates req.userId for valid sessions. Invalid or expired tokens fall
 * through as anonymous so public pages still load; protected routes reject.
 */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const payload = verifyAuthToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, username: true, banned: true, passwordChangedAt: true },
    });
    // Changing a password invalidates sessions issued before the change.
    const sessionStale =
      user?.passwordChangedAt && payload.iat
        ? payload.iat * 1000 < user.passwordChangedAt.getTime()
        : false;
    if (user && !user.banned && !sessionStale) {
      req.userId = user.id;
      req.userRole = user.role;
      req.username = user.username;
    }
  } catch {
    // requireAuth produces the 401.
  }
  next();
});

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.userId) {
    next(ApiError.unauthorized());
    return;
  }
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.userId) {
    next(ApiError.unauthorized());
    return;
  }
  if (req.userRole !== "ADMIN") {
    next(ApiError.forbidden("This area is restricted to administrators"));
    return;
  }
  next();
}

export const requireRole = (...roles: string[]): RequestHandler => (req, _res, next) => {
  if (!req.userId) {
    next(ApiError.unauthorized());
    return;
  }
  if (!req.userRole || !roles.includes(req.userRole)) {
    next(ApiError.forbidden());
    return;
  }
  next();
};

/**
 * Guards an admin route with a named capability from the role's permission
 * list, so custom roles and edited built-in roles take effect immediately.
 */
export const requirePermission = (permission: string): RequestHandler =>
  asyncHandler(async (req, _res, next) => {
    if (!req.userId) throw ApiError.unauthorized();
    const permissions = await permissionsForRole(req.userRole ?? "");
    if (!permissions.includes(permission)) {
      throw ApiError.forbidden("Your role does not include this permission");
    }
    next();
  });
