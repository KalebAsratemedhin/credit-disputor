export type RenderedEmail = {
  subject: string;
  text: string;
  html?: string;
};

export type SendTransactionalParams = RenderedEmail & {
  to: string;
};

export interface EmailSender {
  sendTransactional(params: SendTransactionalParams): Promise<void>;
}

export type OtpCodeEmailParams = {
  code: string;
  expiresInMinutes: number;
  firstName: string;
  purposeLabel: string;
};

export type PasswordResetEmailParams = {
  firstName: string;
  resetUrl: string;
  expiresInMinutes: number;
};

export type EmailDeliveryDetails = {
  provider: "resend";
  reason?: string;
};
