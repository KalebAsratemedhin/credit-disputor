import { AppError } from "../utils/errors";

/** Experian OAuth / Connect credentials or product configuration missing or invalid. */
export class ExperianConfigError extends AppError {
  constructor(message: string) {
    super(message, 503, "EXPERIAN_CONFIG");
  }
}

/** Token endpoint returned non-JSON. */
export class ExperianTokenInvalidError extends AppError {
  constructor(message: string) {
    super(message, 502, "EXPERIAN_TOKEN_INVALID");
  }
}

/** Password grant token request rejected. */
export class ExperianTokenDeniedError extends AppError {
  constructor() {
    super("Experian OAuth token request failed.", 502, "EXPERIAN_TOKEN_DENIED");
  }
}

/** Refresh grant failed. */
export class ExperianRefreshDeniedError extends AppError {
  constructor() {
    super("Experian OAuth refresh failed.", 502, "EXPERIAN_REFRESH_DENIED");
  }
}

/** Connect returned success: false (details logged server-side only). */
export class ExperianConnectReportedError extends AppError {
  constructor() {
    super(
      "Unable to complete the bureau verification step. Please try again.",
      502,
      "EXPERIAN_CONNECT_ERROR"
    );
  }
}

/** Unexpected Connect response shape or missing required fields. */
export class ExperianConnectUnexpectedError extends AppError {
  constructor(message: string) {
    super(message, 502, "EXPERIAN_CONNECT_UNEXPECTED");
  }
}

/** Service-layer validation before calling Connect (empty KIQ answers). */
export class ExperianKiqAnswersRequiredError extends AppError {
  constructor() {
    super("At least one KIQ answer is required.", 400, "VALIDATION_ERROR");
  }
}

/** Report JSON missing a parsable score. */
export class ExperianReportNoScoreError extends AppError {
  constructor() {
    super("Experian report did not include a parsable score.", 502, "EXPERIAN_REPORT_NO_SCORE");
  }
}

/** Connect response body was not valid JSON. */
export class ExperianConnectInvalidResponseError extends AppError {
  constructor() {
    super("Experian Connect response was not valid JSON.", 502, "EXPERIAN_CONNECT_INVALID");
  }
}

/** Connect HTTP status not OK (body logged server-side). */
export class ExperianConnectHttpError extends AppError {
  constructor() {
    super("Experian Connect request failed.", 502, "EXPERIAN_CONNECT_HTTP");
  }
}

/** Programming error: real Connect called while mock mode is on. */
export class ExperianConnectInternalError extends AppError {
  constructor() {
    super(
      "Experian Connect client was invoked while mock mode is enabled.",
      500,
      "INTERNAL"
    );
  }
}
