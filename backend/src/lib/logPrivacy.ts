/** E.164 for logs: partial only, not full PII. */
export function maskE164(e164: string): string {
  const t = e164.trim();
  if (t.length < 8) return "[short]";
  if (t.length <= 12) return `${t.slice(0, 4)}…`;
  return `${t.slice(0, 5)}…${t.slice(-4)}`;
}

/** Twilio SID for logs (AC… / VA…): prefix + suffix only. */
export function twilioSidPreview(s: string): string {
  const t = s.trim();
  if (!t) return "(empty)";
  if (t.length <= 8) return "(short)";
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
}
