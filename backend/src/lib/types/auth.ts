import type { PublicUser } from "./user";

export type AuthResponse = {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
};

export type SignupPendingResponse = {
  user: PublicUser;
  verificationRequired: true;
};

export type MfaMethods = {
  emailOtp: true;
  totp: boolean;
  backupCode: boolean;
  webauthn: boolean;
};

export type SigninMfaRequiredResponse = {
  mfaRequired: true;
  mfaToken: string;
  maskedEmail: string;
  mfaMethods: MfaMethods;
};

export type SigninResult = AuthResponse | SigninMfaRequiredResponse;
