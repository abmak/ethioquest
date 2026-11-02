import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { allowedOrigins, env } from "./config/env";
import { logger } from "./lib/logger";
import { authenticate } from "./middleware/auth";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { apiLimiter } from "./lib/rate-limit";
import { apiRouter } from "./routes";
import { prisma } from "./lib/prisma";
import { uploadDir } from "./lib/storage";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  // One proxy (the web container's nginx), plus a second when a TLS proxy such
  // as the host's nginx sits in front. Without the right depth, every member
  // looks like the proxy and shares one rate-limit bucket.
  app.set("trust proxy", env.TRUST_PROXY);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
  app.use(cookieParser());
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === "/api/health" },
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "debug";
      },
    }),
  );

  app.get("/api/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok", database: "connected", timestamp: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: "degraded", database: "unavailable" });
    }
  });

  // Member photos are stored on disk and served from the same origin.
  app.use("/uploads", express.static(uploadDir, { maxAge: "7d", fallthrough: true }));

  app.use("/api", apiLimiter, authenticate, apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
