/**
 * Mask email address to prevent platform leakage before hire/relationship.
 * Example: "john.doe@gmail.com" -> "j***@g***.com"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***.***';
  const [local, domain] = email.split('@');
  const domainParts = domain.split('.');
  const maskedLocal = local.charAt(0) + '***';
  const maskedDomain = domainParts[0].charAt(0) + '***.' + domainParts.slice(1).join('.');
  return `${maskedLocal}@${maskedDomain}`;
}
