import { z } from "zod";
import { ValidationAppError } from "../lib/errors";
import {
  catalogByKey,
  groupApiSegment,
  listCatalogEntries,
} from "../lib/preferences/catalog";
import type { PreferenceItemResponse } from "../lib/types/preferences";
import { patchPreferencesBodySchema } from "../lib/validation/preferences.schemas";
import * as preferencesRepository from "../repositories/preferences.repository";

async function resolveUpdatedAt(userId: string): Promise<string> {
  const userMax = await preferencesRepository.maxUserPreferenceUpdatedAt(userId);
  const t = userMax ?? new Date(0);
  return t.toISOString();
}

export async function getPreferencesResponse(userId: string): Promise<{
  privacy: PreferenceItemResponse[];
  notifications: { email: PreferenceItemResponse[]; push: PreferenceItemResponse[] };
  updatedAt: string;
}> {
  const catalog = listCatalogEntries();
  const byKey = await preferencesRepository.mapUserValuesByKey(userId);

  const privacy: PreferenceItemResponse[] = [];
  const email: PreferenceItemResponse[] = [];
  const push: PreferenceItemResponse[] = [];

  for (const def of catalog) {
    const value = byKey.has(def.key) ? (byKey.get(def.key) as boolean) : def.defaultValue;
    const item: PreferenceItemResponse = {
      key: def.key,
      title: def.title,
      description: def.description,
      value,
    };
    const seg = groupApiSegment(def.group);
    if (seg === "privacy") {
      privacy.push(item);
    } else if (seg === "email") {
      email.push(item);
    } else {
      push.push(item);
    }
  }

  const updatedAt = await resolveUpdatedAt(userId);

  return {
    privacy,
    notifications: { email, push },
    updatedAt,
  };
}

export async function patchPreferences(
  userId: string,
  rawBody: unknown
): Promise<Awaited<ReturnType<typeof getPreferencesResponse>>> {
  const parsed = patchPreferencesBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ValidationAppError(parsed.error);
  }

  const body = parsed.data;
  const allowed = catalogByKey();

  const unknownKeys = Object.keys(body).filter((k) => !allowed.has(k));
  if (unknownKeys.length > 0) {
    throw new ValidationAppError(
      new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          message: `Unknown preference keys: ${unknownKeys.join(", ")}`,
          path: [],
        },
      ])
    );
  }

  await preferencesRepository.upsertUserPreferences(
    userId,
    Object.entries(body).map(([key, value]) => ({ key, value }))
  );

  return getPreferencesResponse(userId);
}
