import {
  BureauCode,
  BureauConnectionState,
  BureauPullJobStatus,
} from "@prisma/client";
import { env } from "../config/env";
import { decryptUtf8, encryptUtf8 } from "../lib/crypto/aes256gcm";
import { decryptJsonValue, encryptJsonValue } from "../lib/crypto/piiJson";
import { parsePiiEncryptionKey } from "../lib/crypto/piiKey";
import {
  ActiveBureauConnectionError,
  BureauConnectionCorruptError,
  BureauConnectionStateError,
  ExperianConnectUnexpectedError,
  NotFoundError,
} from "../lib/errors";
import type {
  BureauStoredAddress,
  BureauStoredIdentity,
} from "../lib/types/bureauConnection";
import type {
  ExperianSubmitAnswersResult,
  ExperianSubmitUserResult,
} from "../lib/types/experianConnect";
import type {
  BureauConnectionAddressBody,
  BureauConnectionConsentBody,
  BureauConnectionIdentityBody,
  BureauConnectionKiqAnswersBody,
  BureauConnectionStartBody,
} from "../lib/validation/bureauConnection.schemas";
import { AppError } from "../lib/utils/errors";
import * as bureauRepo from "../repositories/bureauConnection.repository";
import {
  experianConnectPullReport,
  experianConnectSubmitAnswers,
  experianConnectSubmitUser,
} from "./experian/experianConnect.service";

const PROVIDER_POLL_DEBOUNCE_MS = 10_000;

let piiKeyCache: Buffer | null = null;
function piiKey(): Buffer {
  if (!piiKeyCache) {
    piiKeyCache = parsePiiEncryptionKey(env.piiEncryptionKeyHex);
  }
  return piiKeyCache;
}

function toApiConnectionState(state: BureauConnectionState): string {
  const m: Record<BureauConnectionState, string> = {
    [BureauConnectionState.AWAITING_IDENTITY]: "awaitingIdentity",
    [BureauConnectionState.AWAITING_ADDRESS]: "awaitingAddress",
    [BureauConnectionState.AWAITING_CONSENT]: "awaitingConsent",
    [BureauConnectionState.AWAITING_EXPERIAN_KIQ]: "awaitingExperianKiq",
    [BureauConnectionState.PROCESSING]: "processing",
    [BureauConnectionState.COMPLETE]: "complete",
    [BureauConnectionState.FAILED]: "failed",
  };
  return m[state];
}

function toApiBureau(code: BureauCode): string {
  return code.toLowerCase();
}

function toApiJobStatus(s: BureauPullJobStatus): string {
  const m: Record<BureauPullJobStatus, string> = {
    [BureauPullJobStatus.PENDING]: "pending",
    [BureauPullJobStatus.PENDING_PROVIDER]: "pendingProvider",
    [BureauPullJobStatus.IN_FLIGHT]: "inFlight",
    [BureauPullJobStatus.COMPLETE]: "complete",
    [BureauPullJobStatus.FAILED]: "failed",
  };
  return m[s];
}

function assertState(
  actual: BureauConnectionState,
  expected: BureauConnectionState,
  message = "This step is not valid for the current connection state."
): void {
  if (actual !== expected) {
    throw new BureauConnectionStateError(message);
  }
}

async function loadOwnedOr404(
  connectionId: string,
  userId: string
): Promise<NonNullable<Awaited<ReturnType<typeof bureauRepo.getByIdForUser>>>> {
  const row = await bureauRepo.getByIdForUser(connectionId, userId);
  if (!row) {
    throw new NotFoundError("Bureau connection");
  }
  return row;
}

export async function startConnection(
  userId: string,
  body: BureauConnectionStartBody
): Promise<{ connectionId: string; state: string }> {
  const active = await bureauRepo.findNonTerminalConnectionForUser(userId);
  if (active) {
    throw new ActiveBureauConnectionError();
  }
  const row = await bureauRepo.createConnection(userId, body.institutionId ?? null);
  return { connectionId: row.id, state: toApiConnectionState(row.state) };
}

export async function submitIdentity(
  userId: string,
  connectionId: string,
  body: BureauConnectionIdentityBody
): Promise<{ state: string }> {
  const row = await loadOwnedOr404(connectionId, userId);
  assertState(row.state, BureauConnectionState.AWAITING_IDENTITY);

  const payload: BureauStoredIdentity = {
    firstName: body.firstName,
    lastName: body.lastName,
    middleName: body.middleName,
    dobMmddyyyy: body.dob,
    ssn: body.ssn,
    email: body.email,
  };
  const enc = encryptJsonValue(payload, piiKey());

  const updated = await bureauRepo.updateConnectionForUser(connectionId, userId, {
    identityPayloadEnc: enc,
    state: BureauConnectionState.AWAITING_ADDRESS,
  });
  if (!updated) {
    throw new NotFoundError("Bureau connection");
  }
  return { state: toApiConnectionState(updated.state) };
}

export async function submitAddress(
  userId: string,
  connectionId: string,
  body: BureauConnectionAddressBody
): Promise<{ state: string }> {
  const row = await loadOwnedOr404(connectionId, userId);
  assertState(row.state, BureauConnectionState.AWAITING_ADDRESS);
  if (!row.identityPayloadEnc) {
    throw new BureauConnectionCorruptError("Identity step is missing.");
  }

  const payload: BureauStoredAddress = {
    street: body.street,
    city: body.city,
    state: body.state,
    zip: body.zip,
    addressOverTwoYears: body.addressOverTwoYears,
    previousStreet: body.previousStreet,
    previousCity: body.previousCity,
    previousState: body.previousState,
    previousZip: body.previousZip,
  };
  const enc = encryptJsonValue(payload, piiKey());

  const updated = await bureauRepo.updateConnectionForUser(connectionId, userId, {
    addressPayloadEnc: enc,
    state: BureauConnectionState.AWAITING_CONSENT,
  });
  if (!updated) {
    throw new NotFoundError("Bureau connection");
  }
  return { state: toApiConnectionState(updated.state) };
}

async function tryPullExperianReport(
  userId: string,
  connectionId: string,
  clientIp: string | undefined,
  options: { skipDebounce: boolean }
): Promise<void> {
  const row = await bureauRepo.getByIdForUser(connectionId, userId);
  if (!row || row.state !== BureauConnectionState.PROCESSING) {
    return;
  }
  if (!row.experianConsumerTokenEnc) {
    return;
  }

  const now = Date.now();
  if (
    !options.skipDebounce &&
    row.lastProviderPollAt &&
    now - row.lastProviderPollAt.getTime() < PROVIDER_POLL_DEBOUNCE_MS
  ) {
    return;
  }

  await bureauRepo.updateConnectionForUser(connectionId, userId, {
    lastProviderPollAt: new Date(),
  });

  let consumerToken: string;
  try {
    consumerToken = decryptUtf8(row.experianConsumerTokenEnc, piiKey());
  } catch {
    await bureauRepo.updateConnectionForUser(connectionId, userId, {
      state: BureauConnectionState.FAILED,
      userSafeFailureCode: "DECRYPT_FAILED",
    });
    await bureauRepo.updatePullJob(connectionId, BureauCode.EXPERIAN, {
      status: BureauPullJobStatus.FAILED,
      errorCode: "DECRYPT_FAILED",
    });
    return;
  }

  await bureauRepo.updatePullJob(connectionId, BureauCode.EXPERIAN, {
    status: BureauPullJobStatus.IN_FLIGHT,
    errorCode: null,
  });

  try {
    const report = await experianConnectPullReport(consumerToken, clientIp);
    await bureauRepo.insertScoreSnapshot({
      userId,
      connectionId,
      bureau: BureauCode.EXPERIAN,
      score: report.score,
      scoreType: report.scoreType,
    });
    await bureauRepo.updatePullJob(connectionId, BureauCode.EXPERIAN, {
      status: BureauPullJobStatus.COMPLETE,
      providerRef: report.transactionId != null ? String(report.transactionId) : null,
      errorCode: null,
    });
    await bureauRepo.updateConnectionForUser(connectionId, userId, {
      state: BureauConnectionState.COMPLETE,
      userSafeFailureCode: null,
    });
  } catch (err) {
    const code =
      err instanceof AppError ? err.code ?? "EXPERIAN_ERROR" : "EXPERIAN_ERROR";
    await bureauRepo.updatePullJob(connectionId, BureauCode.EXPERIAN, {
      status: BureauPullJobStatus.FAILED,
      errorCode: code,
    });
    await bureauRepo.updateConnectionForUser(connectionId, userId, {
      state: BureauConnectionState.FAILED,
      userSafeFailureCode: code,
    });
  }
}

export async function submitConsent(
  userId: string,
  connectionId: string,
  body: BureauConnectionConsentBody,
  clientIp: string | undefined
): Promise<{ state: string }> {
  const row = await loadOwnedOr404(connectionId, userId);
  assertState(row.state, BureauConnectionState.AWAITING_CONSENT);
  if (!row.identityPayloadEnc || !row.addressPayloadEnc) {
    throw new BureauConnectionCorruptError("Previous steps are incomplete.");
  }

  let identity: BureauStoredIdentity;
  let address: BureauStoredAddress;
  try {
    identity = decryptJsonValue<BureauStoredIdentity>(row.identityPayloadEnc, piiKey());
    address = decryptJsonValue<BureauStoredAddress>(row.addressPayloadEnc, piiKey());
  } catch {
    throw new BureauConnectionCorruptError("Could not read stored identity or address.");
  }

  await bureauRepo.createConsentForConnection(connectionId, userId, {
    agreementVersion: body.agreementVersion,
    textHash: body.textHash ?? null,
  });
  await bureauRepo.ensurePullJobsForConnection(connectionId);

  let exp: ExperianSubmitUserResult;
  try {
    exp = await experianConnectSubmitUser(
      {
        firstName: identity.firstName,
        lastName: identity.lastName,
        middleName: identity.middleName,
        dobMmddyyyy: identity.dobMmddyyyy,
        ssn: identity.ssn,
        email: identity.email,
      },
      {
        street: address.street,
        city: address.city,
        state: address.state,
        zip: address.zip,
        previousStreet: address.previousStreet,
        previousCity: address.previousCity,
        previousState: address.previousState,
        previousZip: address.previousZip,
      },
      clientIp
    );
  } catch (e) {
    await bureauRepo.updateConnectionForUser(connectionId, userId, {
      state: BureauConnectionState.FAILED,
      userSafeFailureCode: e instanceof AppError ? e.code ?? "EXPERIAN_ERROR" : "EXPERIAN_ERROR",
    });
    await bureauRepo.updatePullJob(connectionId, BureauCode.EXPERIAN, {
      status: BureauPullJobStatus.FAILED,
      errorCode: e instanceof AppError ? e.code ?? "EXPERIAN_ERROR" : "EXPERIAN_ERROR",
    });
    throw e;
  }

  if (exp.needsKiq && !exp.consumerToken) {
    if (!exp.authSession) {
      throw new ExperianConnectUnexpectedError("Experian did not return a KIQ session.");
    }
    const sessionEnc = encryptUtf8(exp.authSession, piiKey());
    const kiqEnc = encryptJsonValue(exp.pidResult ?? null, piiKey());
    const updated = await bureauRepo.updateConnectionForUser(connectionId, userId, {
      state: BureauConnectionState.AWAITING_EXPERIAN_KIQ,
      experianAuthSessionEnc: sessionEnc,
      experianKiqPayloadEnc: kiqEnc,
    });
    if (!updated) {
      throw new NotFoundError("Bureau connection");
    }
    return { state: toApiConnectionState(updated.state) };
  }

  if (exp.consumerToken) {
    const tokenEnc = encryptUtf8(exp.consumerToken, piiKey());
    await bureauRepo.updateConnectionForUser(connectionId, userId, {
      state: BureauConnectionState.PROCESSING,
      experianConsumerTokenEnc: tokenEnc,
      experianAuthSessionEnc: null,
      experianKiqPayloadEnc: null,
    });
    await tryPullExperianReport(userId, connectionId, clientIp, { skipDebounce: true });
    const after = await bureauRepo.getByIdForUser(connectionId, userId);
    return { state: toApiConnectionState(after!.state) };
  }

  throw new ExperianConnectUnexpectedError("Unexpected Experian response after consent.");
}

export async function submitKiqAnswers(
  userId: string,
  connectionId: string,
  body: BureauConnectionKiqAnswersBody,
  clientIp: string | undefined
): Promise<{ state: string }> {
  const row = await loadOwnedOr404(connectionId, userId);
  assertState(row.state, BureauConnectionState.AWAITING_EXPERIAN_KIQ);
  if (!row.experianAuthSessionEnc) {
    throw new BureauConnectionCorruptError("KIQ session is missing.");
  }

  let authSession: string;
  try {
    authSession = decryptUtf8(row.experianAuthSessionEnc, piiKey());
  } catch {
    throw new BureauConnectionCorruptError("Could not read KIQ session.");
  }

  let answersResult: ExperianSubmitAnswersResult;
  try {
    answersResult = await experianConnectSubmitAnswers(authSession, body.answers);
  } catch (e) {
    await bureauRepo.updateConnectionForUser(connectionId, userId, {
      state: BureauConnectionState.FAILED,
      userSafeFailureCode: e instanceof AppError ? e.code ?? "EXPERIAN_ERROR" : "EXPERIAN_ERROR",
    });
    await bureauRepo.updatePullJob(connectionId, BureauCode.EXPERIAN, {
      status: BureauPullJobStatus.FAILED,
      errorCode: e instanceof AppError ? e.code ?? "EXPERIAN_ERROR" : "EXPERIAN_ERROR",
    });
    throw e;
  }

  const tokenEnc = encryptUtf8(answersResult.consumerToken, piiKey());
  await bureauRepo.updateConnectionForUser(connectionId, userId, {
    state: BureauConnectionState.PROCESSING,
    experianConsumerTokenEnc: tokenEnc,
    experianAuthSessionEnc: null,
    experianKiqPayloadEnc: null,
  });

  await tryPullExperianReport(userId, connectionId, clientIp, { skipDebounce: true });
  const after = await bureauRepo.getByIdForUser(connectionId, userId);
  return { state: toApiConnectionState(after!.state) };
}

export async function getConnectionStatus(
  userId: string,
  connectionId: string,
  clientIp: string | undefined
): Promise<{
  connectionId: string;
  state: string;
  userSafeFailureCode: string | null;
  bureaus: Array<{
    bureau: string;
    status: string;
    score?: number;
    scoreType?: string;
    errorCode?: string | null;
  }>;
  experianKiq?: { pidResult: unknown };
}> {
  const row = await loadOwnedOr404(connectionId, userId);

  if (row.state === BureauConnectionState.PROCESSING) {
    await tryPullExperianReport(userId, connectionId, clientIp, { skipDebounce: false });
  }

  const fresh = await bureauRepo.getByIdForUser(connectionId, userId);
  if (!fresh) {
    throw new NotFoundError("Bureau connection");
  }

  const jobs = await bureauRepo.listPullJobsForConnection(connectionId);
  const bureaus = await Promise.all(
    jobs.map(async (j) => {
      const snap =
        j.status === BureauPullJobStatus.COMPLETE
          ? await bureauRepo.getLatestScoreSnapshot(connectionId, j.bureau)
          : null;
      const entry: {
        bureau: string;
        status: string;
        score?: number;
        scoreType?: string;
        errorCode?: string | null;
      } = {
        bureau: toApiBureau(j.bureau),
        status: toApiJobStatus(j.status),
        errorCode: j.errorCode,
      };
      if (snap) {
        entry.score = snap.score;
        entry.scoreType = snap.scoreType;
      }
      return entry;
    })
  );

  const result: Awaited<ReturnType<typeof getConnectionStatus>> = {
    connectionId: fresh.id,
    state: toApiConnectionState(fresh.state),
    userSafeFailureCode: fresh.userSafeFailureCode,
    bureaus,
  };

  if (fresh.state === BureauConnectionState.AWAITING_EXPERIAN_KIQ && fresh.experianKiqPayloadEnc) {
    try {
      result.experianKiq = {
        pidResult: decryptJsonValue<unknown>(fresh.experianKiqPayloadEnc, piiKey()),
      };
    } catch {
      result.experianKiq = { pidResult: null };
    }
  }

  return result;
}
