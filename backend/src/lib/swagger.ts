import fs from "fs";
import path from "path";
import type { Express } from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";

function loadOpenApiSpec(): Record<string, unknown> {
  const filePath = path.join(process.cwd(), "src/docs/openapi.yaml");
  const raw = fs.readFileSync(filePath, "utf8");
  return YAML.parse(raw) as Record<string, unknown>;
}

export function setupSwagger(app: Express): void {
  const spec = loadOpenApiSpec();
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(spec));
}
