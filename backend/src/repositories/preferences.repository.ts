import { prisma } from "../lib/prisma";

export async function mapUserValuesByKey(userId: string): Promise<Map<string, boolean>> {
  const rows = await prisma.userPreference.findMany({
    where: { userId },
    select: { key: true, value: true },
  });
  return new Map(rows.map((r) => [r.key, r.value]));
}

export async function maxUserPreferenceUpdatedAt(userId: string): Promise<Date | null> {
  const agg = await prisma.userPreference.aggregate({
    where: { userId },
    _max: { updatedAt: true },
  });
  return agg._max.updatedAt;
}

export async function upsertUserPreferences(
  userId: string,
  entries: Array<{ key: string; value: boolean }>
): Promise<void> {
  await prisma.$transaction(
    entries.map(({ key, value }) =>
      prisma.userPreference.upsert({
        where: { userId_key: { userId, key } },
        create: { userId, key, value },
        update: { value },
      })
    )
  );
}
