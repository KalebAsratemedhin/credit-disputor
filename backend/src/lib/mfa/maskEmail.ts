export function maskEmail(email: string): string {
  const [local, domain] = email.toLowerCase().split("@");
  if (!domain || local.length === 0) {
    return "***";
  }
  if (local.length <= 2) {
    return `**@${domain}`;
  }
  const stars = "*".repeat(Math.min(4, local.length - 2));
  return `${local.slice(0, 2)}${stars}@${domain}`;
}
