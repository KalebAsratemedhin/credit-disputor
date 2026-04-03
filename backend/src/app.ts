import path from "path";
import type { IncomingMessage, ServerResponse } from "http";
import cors from "cors";
import express from "express";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { safeHttpReqSerializer, safeHttpResSerializer } from "./lib/httpLogSerializers";
import { logger } from "./lib/logger";
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

function httpLogSuccessObject(req: IncomingMessage, res: ServerResponse, loggable: Record<string, unknown>) {
  return { ...loggable, statusCode: res.statusCode };
}

function httpLogErrorObject(
  req: IncomingMessage,
  res: ServerResponse,
  _err: Error,
  loggable: Record<string, unknown>
) {
  return { ...loggable, statusCode: res.statusCode };
}

export function createApp(): express.Express {
  const app = express();
  app.set("trust proxy", 1);
  app.use(
    pinoHttp({
      logger,
      wrapSerializers: false,
      serializers: {
        req: safeHttpReqSerializer,
        res: safeHttpResSerializer,
      },
      customSuccessObject: httpLogSuccessObject,
      customErrorObject: httpLogErrorObject,
    })
  );
  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(express.json());
  app.use("/public", express.static(path.join(process.cwd(), "public")));
  setupSwagger(app);
  app.use(routes);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}
