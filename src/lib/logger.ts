/**
 * Centralized logger.
 *
 * Goal: eliminate scattered `console.log/info/warn` usage while keeping
 * intentional, environment-aware logs available for debugging.
 */
type LogArgs = readonly unknown[];

function getPrefix(level: string, scope?: string) {
  return scope ? `[${level}][${scope}]` : `[${level}]`;
}

const isDev = import.meta.env.DEV;
const debugEnabled =
  isDev || String(import.meta.env.VITE_DEBUG_LOGS).toLowerCase() === 'true';

export const logger = {
  debug(scope: string | undefined, ...args: LogArgs) {
    if (!debugEnabled) return;
    console.log(getPrefix('DEBUG', scope), ...args);
  },
  info(scope: string | undefined, ...args: LogArgs) {
    // Keep info logs dev-only by default to avoid production noise.
    if (!isDev) return;
    console.info(getPrefix('INFO', scope), ...args);
  },
  warn(scope: string | undefined, ...args: LogArgs) {
    // Keep warn logs dev-only by default to avoid production noise.
    if (!isDev) return;
    console.warn(getPrefix('WARN', scope), ...args);
  },
  error(scope: string | undefined, ...args: LogArgs) {
    // Errors should surface in all environments.
    console.error(getPrefix('ERROR', scope), ...args);
  },
};


