import type { IncomingMessage, ServerResponse } from "http";
import { req as serializeReq, res as serializeRes } from "pino-std-serializers";

const SENSITIVE_REQ_HEADER_NAMES = new Set([
  "authorization",
  "cookie",
  "proxy-authorization",
  "x-api-key",
]);

function redactHeaderRecord(
  headers: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!headers || typeof headers !== "object") {
    return headers;
  }
  const out: Record<string, unknown> = { ...headers };
  for (const key of Object.keys(out)) {
    const lower = key.toLowerCase();
    if (lower === "set-cookie" || SENSITIVE_REQ_HEADER_NAMES.has(lower)) {
      out[key] = "[Redacted]";
    }
  }
  return out;
}

/** pino-http request serializer: same as default but never logs auth cookies or bearer tokens in headers. */
export function safeHttpReqSerializer(req: IncomingMessage) {
  const serialized = serializeReq(req);
  if (serialized && typeof serialized === "object" && "headers" in serialized) {
    return {
      ...serialized,
      headers: redactHeaderRecord(serialized.headers as Record<string, unknown>),
    };
  }
  return serialized;
}

/** pino-http response serializer: redacts Set-Cookie if present; does not log bodies. */
export function safeHttpResSerializer(res: ServerResponse) {
  const serialized = serializeRes(res);
  if (serialized && typeof serialized === "object" && "headers" in serialized) {
    return {
      ...serialized,
      headers: redactHeaderRecord(serialized.headers as Record<string, unknown>),
    };
  }
  return serialized;
}
