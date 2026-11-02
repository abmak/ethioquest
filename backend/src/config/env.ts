import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN_DAYS: z.coerce.number().positive().default(7),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
  // Number of reverse proxies in front of the API. 1 = the web container's nginx.
  TRUST_PROXY: z.coerce.number().int().min(1).max(10).default(1),
  CORS_EXTRA_ORIGINS: z.string().optional().default(""),
  // Secure cookie flag. Left empty it follows NODE_ENV; set `false` only while
  // the site is served over plain HTTP.
  COOKIE_SECURE: z.enum(["true", "false"]).or(z.literal("")).optional(),
  // Comma-separated admin emails that are promoted to ADMIN on boot.
  ADMIN_EMAILS: z.string().optional().default(""),
  // Where member photos are stored, relative to the API's working directory.
  UPLOAD_DIR: z.string().default("uploads"),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().max(25).default(6),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";

const extraOrigins = env.CORS_EXTRA_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const allowedOrigins = Array.from(new Set([env.CLIENT_ORIGIN, ...extraOrigins]));

export const cookieSecure =
  env.COOKIE_SECURE === undefined || env.COOKIE_SECURE === ""
    ? isProduction
    : env.COOKIE_SECURE === "true";
