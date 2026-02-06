/**
 * Environment Variable Sanitization
 *
 * Prevents sensitive keys (Firebase private keys, Stripe secrets, API keys, etc.)
 * from being accidentally logged or exposed. Use safeEnvForLog() whenever
 * logging environment variable names or values.
 */

const SENSITIVE_PATTERNS = [
  /secret/i,
  /private[_-]?key/i,
  /password/i,
  /api[_-]?key/i,
  /token/i,
  /credential/i,
  /auth[_-]?token/i,
  /webhook[_-]?secret/i,
  /client[_-]?secret/i,
  /service[_-]?account/i, // FIREBASE_SERVICE_ACCOUNT contains full JSON with private key
];

/**
 * Returns a safe representation of an env value for logging.
 * - Sensitive keys: always "[REDACTED]"
 * - Project IDs and other non-secret identifiers: "[SET]" or "[NOT SET]" to avoid leaking values
 */
export function safeEnvForLog(key: string, value: string | undefined): string {
  if (value === undefined || value === null || String(value).trim() === '') {
    return '[NOT SET]';
  }
  const isSensitive = SENSITIVE_PATTERNS.some((p) => p.test(key));
  if (isSensitive) {
    return '[REDACTED]';
  }
  // For non-sensitive keys (e.g. FIREBASE_PROJECT_ID), show presence only to avoid leaking internal IDs
  return '[SET]';
}

/**
 * Sanitize an object of env key-value pairs for safe logging.
 */
export function sanitizeEnvForLog(env: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(env)) {
    out[k] = safeEnvForLog(k, v);
  }
  return out;
}
