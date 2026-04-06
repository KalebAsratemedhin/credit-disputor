import {
  OTP_CODE_EMAIL_HTML_TEMPLATE,
  otpCodeEmailSubject,
  otpCodeEmailTextLines,
} from "../../lib/emails/otpCode";
import {
  PASSWORD_RESET_EMAIL_HTML_TEMPLATE,
  passwordResetEmailSubject,
  passwordResetEmailTextLines,
} from "../../lib/emails/passwordReset";
import { env } from "../../config/env";
import { EMAIL_PRIMARY_COLOR } from "../../lib/constants";
import type {
  OtpCodeEmailParams,
  PasswordResetEmailParams,
  RenderedEmail,
} from "../../lib/types/email";
import { getEmailSender } from "./getEmailSender";

export type { OtpCodeEmailParams, PasswordResetEmailParams } from "../../lib/types/email";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeHtmlAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(value);
  }
  return out;
}

function transactionalLogoMarkUrl(): string {
  const base = env.publicApiUrl;
  return `${base}/public/Group-2.svg`;
}

function transactionalWordmarkUrl(): string {
  const base = env.publicApiUrl;
  return `${base}/public/Group-1.svg`;
}

function appendPlainTextFooter(text: string): string {
  const year = new Date().getFullYear();
  return `${text}\n\n---\n© ${year}`;
}

function layoutTransactionalEmailHtml(mainHtml: string): string {
  const logoMarkSrc = escapeHtmlAttr(transactionalLogoMarkUrl());
  const wordmarkSrc = escapeHtmlAttr(transactionalWordmarkUrl());
  const year = new Date().getFullYear();
  const inner = `<div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 16px; line-height: 1.6; color: #1f2937;">${mainHtml}</div>`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;padding:24px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr>
          <td style="background-color:${EMAIL_PRIMARY_COLOR};padding:28px 32px;text-align:center;">
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
              <tr>
                <td style="padding-right:12px;vertical-align:middle;">
                  <img src="${logoMarkSrc}" alt="Logo" width="28" style="display:block;height:auto;border:0;outline:none;text-decoration:none;">
                </td>
                <td style="vertical-align:middle;">
                  <img src="${wordmarkSrc}" alt="App name" width="180" style="display:block;height:auto;border:0;outline:none;text-decoration:none;">
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 32px 28px;">${inner}</td>
        </tr>
        <tr>
          <td style="padding:20px 32px 28px;background-color:#f9fafb;border-top:1px solid #e5e7eb;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;line-height:1.5;color:#6b7280;text-align:center;">
            © ${year}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function renderOtpCodeEmail(p: OtpCodeEmailParams): RenderedEmail {
  const subject = otpCodeEmailSubject(p);
  const text = appendPlainTextFooter(otpCodeEmailTextLines(p).join("\n"));
  const inner = applyTemplate(OTP_CODE_EMAIL_HTML_TEMPLATE, {
    firstName: escapeHtml(p.firstName),
    code: escapeHtml(p.code),
    expiresInMinutes: String(p.expiresInMinutes),
    primaryColor: EMAIL_PRIMARY_COLOR,
  });
  return { subject, text, html: layoutTransactionalEmailHtml(inner) };
}

function renderPasswordResetEmail(p: PasswordResetEmailParams): RenderedEmail {
  const subject = passwordResetEmailSubject();
  const text = appendPlainTextFooter(passwordResetEmailTextLines(p).join("\n"));
  const inner = applyTemplate(PASSWORD_RESET_EMAIL_HTML_TEMPLATE, {
    firstName: escapeHtml(p.firstName),
    resetUrl: escapeHtmlAttr(p.resetUrl),
    expiresInMinutes: String(p.expiresInMinutes),
    primaryColor: EMAIL_PRIMARY_COLOR,
  });
  return { subject, text, html: layoutTransactionalEmailHtml(inner) };
}

export async function sendOtpCodeEmail(
  params: { to: string } & OtpCodeEmailParams
): Promise<void> {
  const { to, ...rest } = params;
  const rendered = renderOtpCodeEmail(rest);
  await getEmailSender().sendTransactional({ to, ...rendered });
}

export async function sendPasswordResetEmail(
  params: { to: string } & PasswordResetEmailParams
): Promise<void> {
  const { to, ...rest } = params;
  const rendered = renderPasswordResetEmail(rest);
  await getEmailSender().sendTransactional({ to, ...rendered });
}
