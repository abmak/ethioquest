import type { CookieOptions, Response } from "express";
import { cookieSecure, env } from "../config/env";
import { signAuthToken } from "./jwt";

export const TOKEN_COOKIE = "ch_token";

const maxAge = env.JWT_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000;

const baseOptions: CookieOptions = {
  httpOnly: true,
  secure: cookieSecure,
  sameSite: "lax",
  path: "/",
  maxAge,
};

export interface SessionUser {
  id: string;
  username: string;
  role: string;
}

export function setAuthCookies(res: Response, user: SessionUser): void {
  const token = signAuthToken({ sub: user.id, role: user.role, username: user.username });
  res.cookie(TOKEN_COOKIE, token, baseOptions);
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(TOKEN_COOKIE, { ...baseOptions, maxAge: undefined });
}
