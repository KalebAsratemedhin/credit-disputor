import { env } from "../../config/env";
import { EmailConfigurationError } from "../../lib/errors";
import type { EmailSender } from "./emailSender";
import { ConsoleEmailSender } from "./consoleEmailSender";
import { ResendEmailSender } from "./resendEmailSender";

let cached: EmailSender | null = null;

export function getEmailSender(): EmailSender {
  if (cached) {
    return cached;
  }
  if (env.emailProvider === "resend") {
    if (!env.resendApiKey) {
      throw new EmailConfigurationError();
    }
    cached = new ResendEmailSender(env.resendApiKey, env.emailFrom);
  } else {
    cached = new ConsoleEmailSender();
  }
  return cached;
}

export function resetEmailSenderCacheForTests(): void {
  cached = null;
}
