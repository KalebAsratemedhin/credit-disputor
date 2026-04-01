import { logger } from "../../lib/logger";
import type { EmailSender, SendTransactionalParams } from "./emailSender";

export class ConsoleEmailSender implements EmailSender {
  async sendTransactional(params: SendTransactionalParams): Promise<void> {
    logger.info(
      {
        to: params.to,
        subject: params.subject,
        text: params.text,
        hasHtml: Boolean(params.html),
      },
      "[email:console] would send transactional email"
    );
  }
}
