import path from "path";
import express from "express";
import routes from "./routes";
import { setupSwagger } from "./lib/swagger";
import { errorMiddleware } from "./middlewares/error.middleware";
import { notFoundMiddleware } from "./middlewares/notFound.middleware";

export function createApp(): express.Express {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json());
  app.use("/public", express.static(path.join(process.cwd(), "public")));
  setupSwagger(app);
  app.use(routes);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}
