import type { PasswordResetEmailParams } from "../types/email";

export type { PasswordResetEmailParams };

export function passwordResetEmailSubject(): string {
  return "Reset your password";
}

export function passwordResetEmailTextLines(p: PasswordResetEmailParams): string[] {
  return [
    `Hi ${p.firstName},`,
    "",
    `We received a request to reset your password. Open the link below to choose a new password:`,
    p.resetUrl,
    "",
    `This link expires in ${p.expiresInMinutes} minutes.`,
    `If you did not request a reset, you can ignore this email.`,
  ];
}

/** Placeholders: {{firstName}}, {{resetUrl}}, {{expiresInMinutes}}, {{primaryColor}} — {{resetUrl}} is attribute-escaped for href. */
export const PASSWORD_RESET_EMAIL_HTML_TEMPLATE = `<p>Hi {{firstName}},</p>
<p>We received a request to reset your password.</p>
<p><a href="{{resetUrl}}" style="color: {{primaryColor}}; font-weight: 600;">Reset your password</a></p>
<p>This link expires in <strong style="color: {{primaryColor}};">{{expiresInMinutes}}</strong> minutes.</p>
<p>If you did not request a reset, you can ignore this email.</p>`;
