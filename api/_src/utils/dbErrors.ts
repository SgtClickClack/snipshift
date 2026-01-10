/**
 * Database error helpers
 *
 * These helpers normalize common database outage/limit scenarios into stable checks
 * so routes/middleware can return consistent HTTP status codes.
 */

type UnknownErrorLike = {
  message?: unknown;
  cause?: unknown;
  originalError?: unknown;
};

function getMessageCandidates(err: unknown): string[] {
  const out: string[] = [];

  if (typeof err === 'string') {
    out.push(err);
    return out;
  }

  if (!err || typeof err !== 'object') {
    return out;
  }

  // Fall back to stringifying the error object (covers cases where `.message`
  // is non-standard or not a plain string).
  try {
    out.push(String(err));
  } catch {
    // ignore
  }

  const anyErr = err as UnknownErrorLike;
  if (typeof anyErr.message === 'string') out.push(anyErr.message);

  const cause = anyErr.cause as UnknownErrorLike | undefined;
  if (cause && typeof cause === 'object') {
    if (typeof cause.message === 'string') out.push(cause.message);
    const nested = (cause.cause as UnknownErrorLike | undefined);
    if (nested && typeof nested === 'object' && typeof nested.message === 'string') {
      out.push(nested.message);
    }
  }

  const original = anyErr.originalError as UnknownErrorLike | undefined;
  if (original && typeof original === 'object' && typeof original.message === 'string') {
    out.push(original.message);
  }

  return out;
}

/**
 * Neon (and some other hosted Postgres providers) return this message when the project
 * has exceeded its compute time quota. In that case, the API should return 503 so the
 * frontend can show a “service temporarily unavailable” message instead of “auth failed”.
 */
export function isDatabaseComputeQuotaExceededError(err: unknown): boolean {
  const candidates = getMessageCandidates(err);
  if (candidates.length === 0) return false;

  return candidates.some((msg) => {
    const lower = msg.toLowerCase();
    return (
      lower.includes('exceeded the compute time quota') ||
      lower.includes('compute time quota')
    );
  });
}


