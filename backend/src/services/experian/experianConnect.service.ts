import { env } from "../../config/env";
import {
  ExperianConfigError,
  ExperianConnectReportedError,
  ExperianConnectUnexpectedError,
  ExperianKiqAnswersRequiredError,
  ExperianReportNoScoreError,
} from "../../lib/errors";
import { logger } from "../../lib/logger";
import { connectPostForm } from "./connectApi.client";
import type {
  ExperianAddressPayload,
  ExperianIdentityPayload,
  ExperianPullReportResult,
  ExperianQuestionsResponse,
  ExperianReportResponse,
  ExperianSubmitAnswersResult,
  ExperianSubmitUserResult,
  ExperianUserTokenResponse,
} from "../../lib/types/experianConnect";

const ALLOWED_PRODUCT_IDS = new Set([9, 34, 38, 68]);

function normalizeZip(z: string): string {
  return z.replace(/-/g, "");
}

function buildUserFormFields(
  identity: ExperianIdentityPayload,
  address: ExperianAddressPayload,
  clientIp?: string
): Record<string, string | number | undefined> {
  const fields: Record<string, string | number | undefined> = {
    firstName: identity.firstName,
    lastName: identity.lastName,
    currentAddress: address.street,
    currentCity: address.city,
    currentState: address.state,
    currentZip: normalizeZip(address.zip),
    ssn: identity.ssn,
    dob: identity.dobMmddyyyy,
  };
  if (identity.middleName) {
    fields.middleName = identity.middleName;
  }
  if (identity.email) {
    fields.email = identity.email;
  }
  if (clientIp) {
    fields.ipAddress = clientIp;
  }
  if (address.previousStreet) {
    fields.previousAddress = address.previousStreet;
    fields.previousCity = address.previousCity;
    fields.previousState = address.previousState;
    if (address.previousZip) {
      fields.previousZip = normalizeZip(address.previousZip);
    }
  }
  return fields;
}

function assertProductId(): number {
  const id = parseInt(env.experianConnectProductId, 10);
  if (!ALLOWED_PRODUCT_IDS.has(id)) {
    throw new ExperianConfigError(
      "EXPERIAN_CONNECT_PRODUCT_ID must be one of 9, 34, 38, 68."
    );
  }
  return id;
}

function throwIfConnectReportedFailure(success: boolean | undefined, error: unknown): void {
  if (success === false) {
    const e = error as { errorMessage?: string; errorCode?: string } | undefined;
    logger.warn(
      {
        providerErrorCode: e?.errorCode,
        providerErrorMessage: e?.errorMessage,
      },
      "Experian Connect reported success: false"
    );
    throw new ExperianConnectReportedError();
  }
}

/**
 * Connect API consumer registration: `POST /v3/user`.
 */
export async function experianConnectSubmitUser(
  identity: ExperianIdentityPayload,
  address: ExperianAddressPayload,
  clientIp?: string
): Promise<ExperianSubmitUserResult> {
  if (env.experianMock) {
    return {
      needsKiq: true,
      authSession: "mock-auth-session",
      pidResult: { mock: true },
      raw: { mock: true },
    };
  }

  const json = (await connectPostForm(
    "/v3/user",
    buildUserFormFields(identity, address, clientIp)
  )) as ExperianQuestionsResponse;

  throwIfConnectReportedFailure(json.success, json.error);

  const withValue = json as ExperianQuestionsResponse & { value?: string };
  if (withValue.value && typeof withValue.value === "string") {
    return {
      needsKiq: false,
      consumerToken: withValue.value,
      pidResult: json.pidResult,
      raw: json,
    };
  }

  if (!json.authSession) {
    throw new ExperianConnectUnexpectedError(
      "Experian did not return authSession or consumer token."
    );
  }

  return {
    needsKiq: true,
    authSession: json.authSession,
    pidResult: json.pidResult,
    raw: json,
  };
}

/**
 * Connect API: `POST /v3/user/answers`.
 */
export async function experianConnectSubmitAnswers(
  authSession: string,
  answers: number[]
): Promise<ExperianSubmitAnswersResult> {
  if (env.experianMock) {
    return { consumerToken: "mock-consumer-token", raw: { mock: true } };
  }

  if (answers.length === 0) {
    throw new ExperianKiqAnswersRequiredError();
  }

  const json = (await connectPostForm(
    "/v3/user/answers",
    { authSession },
    { answer: answers }
  )) as ExperianUserTokenResponse;

  throwIfConnectReportedFailure(json.success, json.error);

  if (!json.value) {
    throw new ExperianConnectUnexpectedError("Experian did not return consumer token.");
  }

  return { consumerToken: json.value, raw: json };
}

/**
 * Connect API: `POST /v3/report`.
 */
export async function experianConnectPullReport(
  consumerToken: string,
  clientIp?: string
): Promise<ExperianPullReportResult> {
  if (env.experianMock) {
    const scoreType = env.experianConnectRiskModel === "VQ" ? "VANTAGE_V4" : "VANTAGE_V3";
    return { score: 742, scoreType, transactionId: undefined, raw: { mock: true } };
  }

  const productId = assertProductId();
  const fields: Record<string, string | number | undefined> = {
    productId,
    consumerToken,
    purposeType: env.experianConnectPurposeType,
    riskModel: env.experianConnectRiskModel,
  };
  if (clientIp) {
    fields.ipAddress = clientIp;
  }

  const json = (await connectPostForm("/v3/report", fields)) as ExperianReportResponse;

  throwIfConnectReportedFailure(json.success, json.error);

  const scoreStr = json.CreditProfile?.RiskModel?.[0]?.Score;
  const score = scoreStr != null ? parseInt(String(scoreStr), 10) : NaN;
  if (!Number.isFinite(score)) {
    logger.warn(
      { hasCreditProfile: json.CreditProfile != null },
      "Experian report missing parsable score"
    );
    throw new ExperianReportNoScoreError();
  }

  const scoreType = env.experianConnectRiskModel === "VQ" ? "VANTAGE_V4" : "VANTAGE_V3";
  return {
    score,
    scoreType,
    transactionId: json.transactionId,
    raw: json,
  };
}
