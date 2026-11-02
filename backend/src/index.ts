import http from "node:http";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";
import { createApp } from "./app";
import { ensureQuizPool } from "./lib/quiz/pool";
import { ensurePrizeConfig } from "./lib/prizes";

async function main(): Promise<void> {
  await ensureQuizPool().catch((err) => {
    logger.warn({ err }, "Could not seed the quiz question pool");
  });
  await ensurePrizeConfig().catch((err) => {
    logger.warn({ err }, "Could not seed the default prize configuration");
  });

  const app = createApp();
  const server = http.createServer(app);

  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV, client: env.CLIENT_ORIGIN }, "EthioQuest API listening");
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down EthioQuest API");
    server.close();
    await prisma.$disconnect().catch(() => undefined);
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("unhandledRejection", (reason) => {
    logger.error({ err: reason }, "Unhandled promise rejection");
  });
}

main().catch((error) => {
  logger.error({ err: error }, "Failed to start EthioQuest API");
  process.exit(1);
});
