import { Resend } from "resend";
import { EmailDeliveryError } from "../../lib/errors";
import type { EmailSender, SendTransactionalParams } from "./emailSender";

export class ResendEmailSender implements EmailSender {
  private readonly resend: Resend;
  private readonly from: string;

  constructor(apiKey: string, from: string) {
    this.resend = new Resend(apiKey);
    this.from = from;
  }

  async sendTransactional(params: SendTransactionalParams): Promise<void> {
    const { to, subject, text, html } = params;
    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject,
      text,
      html: html ?? text,
    });
    if (error) {
      throw new EmailDeliveryError({
        provider: "resend",
        reason: error.message,
      });
    }
  }
}
