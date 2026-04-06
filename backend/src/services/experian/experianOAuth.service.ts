import { env } from "../../config/env";
import {
  ExperianConfigError,
  ExperianRefreshDeniedError,
  ExperianTokenDeniedError,
  ExperianTokenInvalidError,
} from "../../lib/errors";
import { logger } from "../../lib/logger";
import type { ExperianTokenResponse } from "../../lib/types/experianConnect";

const REFRESH_SKEW_MS = 90_000;

type TokenCache = {
  accessToken: string;
  refreshToken: string;
  expiresAtMs: number;
};

let cache: TokenCache | null = null;
let inFlight: Promise<string> | null = null;

function parseExpiresIn(raw: string | number): number {
  const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : 1800;
}

async function fetchPasswordGrant(): Promise<ExperianTokenResponse> {
  const {
    experianClientId,
    experianClientSecret,
    experianUsername,
    experianPassword,
    experianTokenUrl,
  } = env;

  if (!experianClientId || !experianClientSecret || !experianUsername || !experianPassword) {
    throw new ExperianConfigError("Experian OAuth credentials are not configured.");
  }

  const res = await fetch(experianTokenUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "password",
      username: experianUsername,
      password: experianPassword,
      client_id: experianClientId,
      client_secret: experianClientSecret,
    }),
    signal: AbortSignal.timeout(env.experianHttpTimeoutMs),
  });

  const text = await res.text();
  let json: ExperianTokenResponse | { message?: string } = {};
  try {
    json = JSON.parse(text) as ExperianTokenResponse;
  } catch {
    logger.warn({ httpStatus: res.status }, "Experian token response was not JSON");
    throw new ExperianTokenInvalidError("Experian token response was not JSON.");
  }

  if (!res.ok || !("access_token" in json) || !json.access_token) {
    logger.warn(
      { httpStatus: res.status, bodyKeys: json && typeof json === "object" ? Object.keys(json) : [] },
      "Experian OAuth token request denied"
    );
    throw new ExperianTokenDeniedError();
  }

  return json as ExperianTokenResponse;
}

async function fetchRefreshGrant(refreshToken: string): Promise<ExperianTokenResponse> {
  const res = await fetch(env.experianTokenUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: env.experianClientId,
      client_secret: env.experianClientSecret,
    }),
    signal: AbortSignal.timeout(env.experianHttpTimeoutMs),
  });

  const text = await res.text();
  let json: ExperianTokenResponse | Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as ExperianTokenResponse;
  } catch {
    logger.warn({ httpStatus: res.status }, "Experian refresh response was not JSON");
    throw new ExperianTokenInvalidError("Experian refresh response was not JSON.");
  }

  if (!res.ok || !("access_token" in json) || !json.access_token) {
    logger.warn(
      { httpStatus: res.status, bodyKeys: json && typeof json === "object" ? Object.keys(json) : [] },
      "Experian OAuth refresh denied"
    );
    throw new ExperianRefreshDeniedError();
  }

  return json as ExperianTokenResponse;
}

function applyTokenResponse(body: ExperianTokenResponse): void {
  const sec = parseExpiresIn(body.expires_in);
  const prevRefresh = cache?.refreshToken;
  cache = {
    accessToken: body.access_token,
    refreshToken: body.refresh_token || prevRefresh || "",
    expiresAtMs: Date.now() + sec * 1000,
  };
}

/**
 * Returns a valid Bearer access token, using cache + refresh + password grant.
 */
export async function getExperianAccessToken(): Promise<string> {
  if (env.experianMock) {
    return "mock-experian-access-token";
  }

  if (cache && cache.expiresAtMs - REFRESH_SKEW_MS > Date.now()) {
    return cache.accessToken;
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    try {
      if (cache?.refreshToken) {
        try {
          const refreshed = await fetchRefreshGrant(cache.refreshToken);
          applyTokenResponse(refreshed);
          return cache!.accessToken;
        } catch {
          cache = null;
        }
      }

      const body = await fetchPasswordGrant();
      applyTokenResponse(body);
      return cache!.accessToken;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Test helper: clear cached tokens. */
export function resetExperianTokenCacheForTests(): void {
  cache = null;
  inFlight = null;
}
