import type { Prisma } from "@prisma/client";
import { BureauCode, BureauConnectionState, BureauPullJobStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";

const NON_TERMINAL_STATES: BureauConnectionState[] = [
  BureauConnectionState.AWAITING_IDENTITY,
  BureauConnectionState.AWAITING_ADDRESS,
  BureauConnectionState.AWAITING_CONSENT,
  BureauConnectionState.AWAITING_EXPERIAN_KIQ,
  BureauConnectionState.PROCESSING,
];

export async function createConnection(
  userId: string,
  institutionId?: string | null
): Promise<{ id: string; state: BureauConnectionState }> {
  const row = await prisma.bureauConnection.create({
    data: {
      userId,
      institutionId: institutionId ?? null,
      state: BureauConnectionState.AWAITING_IDENTITY,
    },
    select: { id: true, state: true },
  });
  return row;
}

export async function findNonTerminalConnectionForUser(
  userId: string
): Promise<{ id: string; state: BureauConnectionState } | null> {
  return prisma.bureauConnection.findFirst({
    where: {
      userId,
      state: { in: NON_TERMINAL_STATES },
    },
    select: { id: true, state: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getByIdForUser(
  connectionId: string,
  userId: string
): Promise<Prisma.BureauConnectionGetPayload<{
  include: { pullJobs: true; consent: true };
}> | null> {
  return prisma.bureauConnection.findFirst({
    where: { id: connectionId, userId },
    include: { pullJobs: true, consent: true },
  });
}

export async function updateConnectionForUser(
  connectionId: string,
  userId: string,
  data: Prisma.BureauConnectionUpdateInput
): Promise<{ id: string; state: BureauConnectionState } | null> {
  const existing = await prisma.bureauConnection.findFirst({
    where: { id: connectionId, userId },
    select: { id: true },
  });
  if (!existing) {
    return null;
  }
  try {
    return await prisma.bureauConnection.update({
      where: { id: connectionId },
      data,
      select: { id: true, state: true },
    });
  } catch {
    return null;
  }
}

export async function createConsentForConnection(
  connectionId: string,
  userId: string,
  input: { agreementVersion: string; textHash?: string | null; agreedAt?: Date }
): Promise<void> {
  await prisma.bureauConsentRecord.create({
    data: {
      connectionId,
      userId,
      agreementVersion: input.agreementVersion,
      textHash: input.textHash ?? null,
      agreedAt: input.agreedAt ?? new Date(),
    },
  });
}

export async function ensurePullJobsForConnection(connectionId: string): Promise<void> {
  const bureaus: Array<{ bureau: BureauCode; status: BureauPullJobStatus }> = [
    { bureau: BureauCode.EXPERIAN, status: BureauPullJobStatus.PENDING },
    { bureau: BureauCode.TRANSUNION, status: BureauPullJobStatus.PENDING_PROVIDER },
    { bureau: BureauCode.EQUIFAX, status: BureauPullJobStatus.PENDING_PROVIDER },
  ];

  await prisma.$transaction(
    bureaus.map(({ bureau, status }) =>
      prisma.bureauPullJob.upsert({
        where: {
          connectionId_bureau: { connectionId, bureau },
        },
        create: { connectionId, bureau, status },
        update: {},
      })
    )
  );
}

export async function updatePullJob(
  connectionId: string,
  bureau: BureauCode,
  data: Prisma.BureauPullJobUpdateInput
): Promise<void> {
  await prisma.bureauPullJob.update({
    where: { connectionId_bureau: { connectionId, bureau } },
    data,
  });
}

export async function getPullJob(
  connectionId: string,
  bureau: BureauCode
): Promise<{ status: BureauPullJobStatus; providerRef: string | null; errorCode: string | null } | null> {
  return prisma.bureauPullJob.findUnique({
    where: { connectionId_bureau: { connectionId, bureau } },
    select: { status: true, providerRef: true, errorCode: true },
  });
}

export async function insertScoreSnapshot(input: {
  userId: string;
  connectionId: string;
  bureau: BureauCode;
  score: number;
  scoreType: string;
}): Promise<void> {
  await prisma.scoreSnapshot.create({
    data: {
      userId: input.userId,
      connectionId: input.connectionId,
      bureau: input.bureau,
      score: input.score,
      scoreType: input.scoreType,
    },
  });
}

export async function listPullJobsForConnection(connectionId: string) {
  return prisma.bureauPullJob.findMany({
    where: { connectionId },
    orderBy: { bureau: "asc" },
  });
}

export async function getLatestScoreSnapshot(
  connectionId: string,
  bureau: BureauCode
): Promise<{ score: number; scoreType: string } | null> {
  return prisma.scoreSnapshot.findFirst({
    where: { connectionId, bureau },
    orderBy: { capturedAt: "desc" },
    select: { score: true, scoreType: true },
  });
}
