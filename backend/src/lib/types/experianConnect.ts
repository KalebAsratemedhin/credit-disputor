/** OAuth token response from Experian `/oauth2/v1/token`. */
export type ExperianTokenResponse = {
  issued_at?: string;
  expires_in: string | number;
  token_type: string;
  access_token: string;
  refresh_token?: string;
};

/** Connect API `POST /v3/user` — get KIQ questions. */
export type ExperianQuestionsResponse = {
  success?: boolean;
  error?: ExperianBaseError;
  authSession?: string;
  referenceID?: number;
  pidResult?: unknown;
  preciseIDServer?: unknown;
};

/** Connect API `POST /v3/user/answers`. */
export type ExperianUserTokenResponse = {
  success?: boolean;
  error?: ExperianBaseError;
  value?: string;
  referenceID?: number;
  pidResult?: unknown;
};

export type ExperianBaseError = {
  errorCode?: string;
  errorMessage?: string;
  [key: string]: unknown;
};

/** Connect API `POST /v3/report` — credit profile wrapper. */
export type ExperianReportResponse = {
  success?: boolean;
  error?: ExperianBaseError;
  transactionId?: number;
  CreditProfile?: ExperianCreditProfileReport;
};

export type ExperianCreditProfileReport = {
  RiskModel?: Array<{ Score?: string }>;
};

export type ExperianIdentityPayload = {
  firstName: string;
  lastName: string;
  middleName?: string;
  /** MMDDYYYY, 8 digits */
  dobMmddyyyy: string;
  ssn: string;
  email?: string;
};

export type ExperianAddressPayload = {
  street: string;
  city: string;
  state: string;
  zip: string;
  previousStreet?: string;
  previousCity?: string;
  previousState?: string;
  previousZip?: string;
};

export type ExperianSubmitUserResult = {
  needsKiq: boolean;
  authSession?: string;
  consumerToken?: string;
  pidResult?: unknown;
  raw: unknown;
};

export type ExperianSubmitAnswersResult = {
  consumerToken: string;
  raw: unknown;
};

export type ExperianPullReportResult = {
  score: number;
  scoreType: string;
  transactionId?: number;
  raw: unknown;
};
