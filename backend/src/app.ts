import path from "path";
import cors from "cors";
import express from "express";
import { env } from "./config/env";
import routes from "./routes";
import { setupSwagger } from "./lib/swagger";
import { errorMiddleware } from "./middlewares/error.middleware";
import { notFoundMiddleware } from "./middlewares/notFound.middleware";

const localhostDevOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function corsOrigin(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
): void {
  if (!origin) {
    callback(null, true);
    return;
  }
  if (env.isDevelopment && localhostDevOrigin.test(origin)) {
    callback(null, true);
    return;
  }
  const normalizedFrontend = env.frontendUrl.replace(/\/$/, "");
  if (env.webauthnOrigins.includes(origin) || origin === normalizedFrontend) {
    callback(null, true);
    return;
  }
  callback(null, false);
}

export function createApp(): express.Express {
  const app = express();
  app.set("trust proxy", 1);
  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(express.json());
  app.use("/public", express.static(path.join(process.cwd(), "public")));
  setupSwagger(app);
  app.use(routes);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}
