import { env } from "../../config/env";
import {
  ExperianConnectHttpError,
  ExperianConnectInternalError,
  ExperianConnectInvalidResponseError,
} from "../../lib/errors";
import { logger } from "../../lib/logger";
import { getExperianAccessToken } from "./experianOAuth.service";

function connectUrl(path: string): string {
  const base = env.experianConnectBaseUrl.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/**
 * POST `application/x-www-form-urlencoded` to Connect API (Swagger `formData`).
 */
export async function connectPostForm(
  path: string,
  fields: Record<string, string | number | undefined>,
  multiValue?: Record<string, number[]>
): Promise<unknown> {
  if (env.experianMock) {
    throw new ExperianConnectInternalError();
  }

  const token = await getExperianAccessToken();
  const body = new URLSearchParams();
  for (const [key, val] of Object.entries(fields)) {
    if (val === undefined || val === null) continue;
    body.append(key, String(val));
  }
  if (multiValue) {
    for (const [key, arr] of Object.entries(multiValue)) {
      for (const v of arr) {
        body.append(key, String(v));
      }
    }
  }

  const res = await fetch(connectUrl(path), {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Bearer ${token}`,
    },
    body: body.toString(),
    signal: AbortSignal.timeout(env.experianHttpTimeoutMs),
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    logger.warn({ httpStatus: res.status, path }, "Experian Connect response was not JSON");
    throw new ExperianConnectInvalidResponseError();
  }

  if (!res.ok) {
    logger.warn(
      {
        httpStatus: res.status,
        path,
        bodyKeys: json && typeof json === "object" ? Object.keys(json as object) : [],
      },
      "Experian Connect HTTP error"
    );
    throw new ExperianConnectHttpError();
  }

  return json;
}
