import type { AuthenticationResponseJSON, AuthenticatorTransportFuture } from "@simplewebauthn/server";
import type { AuthResponse } from "../lib/types/auth";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { env } from "../config/env";
import {
  ValidationAppError,
  WebAuthnChallengeError,
  WebAuthnNotAvailableError,
  WebAuthnVerificationError,
} from "../lib/errors";
import { signinWebauthnVerifyBodySchema } from "../lib/validation/auth.schemas";
import { WEBAUTHN_REGISTRATION_CHALLENGE_TTL_MS } from "../lib/constants";
import * as webauthnRepository from "../repositories/webauthn.repository";
import { issueAuthTokensAfterMfa } from "./auth.service";

export async function signinWebauthnAuthenticationOptions(userId: string) {
  const count = await webauthnRepository.countWebauthnCredentials(userId);
  if (count === 0) {
    throw new WebAuthnNotAvailableError();
  }

  await webauthnRepository.deleteAuthenticationChallengesForUser(userId);

  const existing = await webauthnRepository.listWebauthnCredentialsForExclude(userId);
  const allowCredentials = existing.map((e) => ({
    id: e.credentialId,
    transports: e.transports
      ? (JSON.parse(e.transports) as AuthenticatorTransportFuture[])
      : undefined,
  }));

  const options = await generateAuthenticationOptions({
    rpID: env.webauthnRpId,
    allowCredentials,
    userVerification: "discouraged",
  });

  const expiresAt = new Date(Date.now() + WEBAUTHN_REGISTRATION_CHALLENGE_TTL_MS);
  await webauthnRepository.createAuthenticationChallenge({
    userId,
    challenge: options.challenge,
    expiresAt,
  });

  return options;
}

export async function signinWebauthnAuthenticationVerifyFromRaw(
  userId: string,
  rawBody: unknown
): Promise<AuthResponse> {
  const parsed = signinWebauthnVerifyBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ValidationAppError(parsed.error);
  }
  return signinWebauthnAuthenticationVerify(userId, parsed.data as AuthenticationResponseJSON);
}

export async function signinWebauthnAuthenticationVerify(
  userId: string,
  response: AuthenticationResponseJSON
): Promise<AuthResponse> {
  const challengeRow = await webauthnRepository.findLatestAuthenticationChallenge(userId);
  if (!challengeRow) {
    throw new WebAuthnChallengeError(
      "Passkey sign-in challenge expired or missing. Call authentication-options again."
    );
  }

  const stored = await webauthnRepository.findWebauthnCredentialByUserAndCredentialId(
    userId,
    response.id
  );
  if (!stored) {
    throw new WebAuthnVerificationError("Unknown security key for this account.");
  }

  const transports =
    stored.transports && stored.transports.length > 0
      ? (JSON.parse(stored.transports) as AuthenticatorTransportFuture[])
      : undefined;

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: env.webauthnOrigins,
      expectedRPID: env.webauthnRpId,
      credential: {
        id: stored.credentialId,
        publicKey: new Uint8Array(stored.publicKey),
        counter: Number(stored.counter),
        transports,
      },
      requireUserVerification: false,
    });
  } catch {
    throw new WebAuthnVerificationError("Security key sign-in failed.");
  }

  await webauthnRepository.deleteWebauthnChallengeById(challengeRow.id);

  if (!verification.verified) {
    throw new WebAuthnVerificationError("Security key sign-in failed.");
  }

  const { newCounter } = verification.authenticationInfo;
  await webauthnRepository.updateWebauthnCredentialCounter(stored.id, userId, BigInt(newCounter));

  return issueAuthTokensAfterMfa(userId);
}
