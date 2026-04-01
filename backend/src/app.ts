import express from "express";
import routes from "./routes";
import { setupSwagger } from "./lib/swagger";
import { errorMiddleware } from "./middlewares/error.middleware";
import { notFoundMiddleware } from "./middlewares/notFound.middleware";

export function createApp(): express.Express {
  const app = express();
  app.use(express.json());
  setupSwagger(app);
  app.use(routes);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}
