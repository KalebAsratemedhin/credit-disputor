import twilio from "twilio";
import { env } from "../config/env";
import { TWILIO_VERIFY_CONSOLE_APPROVED_CODE } from "../lib/constants";
import {
  PhoneVerificationFailedError,
  PhoneVerificationSendError,
  TwilioVerifyNotConfiguredError,
} from "../lib/errors";
import { maskE164, twilioSidPreview } from "../lib/logPrivacy";
import { logger } from "../lib/logger";

let twilioClient: ReturnType<typeof twilio> | null = null;

function twilioRestErrorFields(e: unknown): Record<string, unknown> {
  if (!e || typeof e !== "object") {
    return {};
  }
  const o = e as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  if (typeof o.code === "number" || typeof o.code === "string") {
    out.twilioCode = o.code;
  }
  if (typeof o.status === "number") {
    out.twilioStatus = o.status;
  }
  if (typeof o.moreInfo === "string") {
    out.twilioMoreInfo = o.moreInfo;
  }
  return out;
}

function requireTwilioConfig(): void {
  const hasAccountSid = Boolean(env.twilioAccountSid);
  const hasAuthToken = Boolean(env.twilioAuthToken);
  const hasServiceSid = Boolean(env.twilioVerifyServiceSid);
  if (!hasAccountSid || !hasAuthToken || !hasServiceSid) {
    logger.warn(
      {
        missingTwilioConfig: {
          TWILIO_ACCOUNT_SID: !hasAccountSid,
          TWILIO_AUTH_TOKEN: !hasAuthToken,
          TWILIO_VERIFY_SERVICE_SID: !hasServiceSid,
        },
        previews: {
          accountSid: twilioSidPreview(env.twilioAccountSid),
          verifyServiceSid: twilioSidPreview(env.twilioVerifyServiceSid),
        },
      },
      "Twilio Verify: configuration incomplete (refusing API call)"
    );
    throw new TwilioVerifyNotConfiguredError();
  }
}

function getTwilioClient() {
  requireTwilioConfig();
  if (!twilioClient) {
    twilioClient = twilio(env.twilioAccountSid, env.twilioAuthToken);
  }
  return twilioClient;
}

export async function startPhoneVerification(e164: string): Promise<void> {
  const toMasked = maskE164(e164);
  logger.info(
    {
      toMasked,
      twilioVerifyProvider: env.twilioVerifyProvider,
    },
    "Twilio Verify: startPhoneVerification invoked"
  );

  if (env.twilioVerifyProvider === "console") {
    logger.info({ toMasked }, "Twilio Verify (console): would send SMS verification");
    return;
  }

  logger.info(
    {
      toMasked,
      accountSidPreview: twilioSidPreview(env.twilioAccountSid),
      authTokenPresent: Boolean(env.twilioAuthToken),
      verifyServiceSidPreview: twilioSidPreview(env.twilioVerifyServiceSid),
    },
    "Twilio Verify: using live API (env snapshot)"
  );

  try {
    const client = getTwilioClient();
    const verification = await client.verify.v2.services(env.twilioVerifyServiceSid).verifications.create({
      to: e164,
      channel: "sms",
    });
    logger.info(
      { toMasked, verificationSid: verification.sid, status: verification.status },
      "Twilio Verify: verification dispatch accepted"
    );
  } catch (e) {
    logger.error(
      {
        toMasked,
        err: e instanceof Error ? e.message : e,
        ...twilioRestErrorFields(e),
      },
      "Twilio Verify: failed to start verification"
    );
    throw new PhoneVerificationSendError();
  }
}

export async function checkPhoneVerification(e164: string, code: string): Promise<void> {
  const trimmed = code.trim();
  const toMasked = maskE164(e164);
  logger.info(
    { toMasked, twilioVerifyProvider: env.twilioVerifyProvider },
    "Twilio Verify: checkPhoneVerification invoked"
  );

  if (env.twilioVerifyProvider === "console") {
    if (trimmed !== TWILIO_VERIFY_CONSOLE_APPROVED_CODE) {
      logger.info({ toMasked }, "Twilio Verify (console): code rejected");
      throw new PhoneVerificationFailedError();
    }
    logger.info({ toMasked }, "Twilio Verify (console): code accepted");
    return;
  }

  logger.info(
    {
      toMasked,
      accountSidPreview: twilioSidPreview(env.twilioAccountSid),
      authTokenPresent: Boolean(env.twilioAuthToken),
      verifyServiceSidPreview: twilioSidPreview(env.twilioVerifyServiceSid),
    },
    "Twilio Verify: check using live API (env snapshot)"
  );

  try {
    const client = getTwilioClient();
    const result = await client.verify.v2
      .services(env.twilioVerifyServiceSid)
      .verificationChecks.create({
        to: e164,
        code: trimmed,
      });
    logger.info({ toMasked, checkStatus: result.status }, "Twilio Verify: verification check response");
    if (result.status !== "approved") {
      throw new PhoneVerificationFailedError();
    }
  } catch (e) {
    if (e instanceof PhoneVerificationFailedError) {
      throw e;
    }
    logger.error(
      {
        toMasked,
        err: e instanceof Error ? e.message : e,
        ...twilioRestErrorFields(e),
      },
      "Twilio Verify: verification check failed"
    );
    throw new PhoneVerificationFailedError();
  }
}
