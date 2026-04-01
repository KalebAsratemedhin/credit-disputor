import { env } from "./config/env";
import { createApp } from "./app";
import { prisma } from "./lib/prisma";
import { logger } from "./lib/logger";

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info(`Server listening on http://localhost:${env.port}`);
  logger.info(`Swagger UI: http://localhost:${env.port}/api-docs`);
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutting down");
  await prisma.$disconnect();
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
