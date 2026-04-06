import type { OtpCodeEmailParams } from "../types/email";

export type { OtpCodeEmailParams };

export function otpCodeEmailSubject(p: OtpCodeEmailParams): string {
  return `Your verification code — ${p.purposeLabel}`;
}

export function otpCodeEmailTextLines(p: OtpCodeEmailParams): string[] {
  return [
    `Hi ${p.firstName},`,
    "",
    `Your verification code is: ${p.code}`,
    "",
    `This code expires in ${p.expiresInMinutes} minutes.`,
    `If you did not request this, you can ignore this email.`,
  ];
}

/** Placeholders: {{firstName}}, {{code}}, {{expiresInMinutes}}, {{primaryColor}} — dynamic strings escaped by the email service except {{primaryColor}} (brand hex). */
export const OTP_CODE_EMAIL_HTML_TEMPLATE = `<p>Hi {{firstName}},</p>
<p>Your verification code is:</p>
<p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: {{primaryColor}};">{{code}}</p>
<p>This code expires in <strong style="color: {{primaryColor}};">{{expiresInMinutes}}</strong> minutes.</p>
<p>If you did not request this, you can ignore this email.</p>`;
