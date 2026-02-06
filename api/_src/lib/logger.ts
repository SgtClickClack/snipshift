/**
 * Centralized logger for the API.
 *
 * Goal: eliminate scattered `console.log/info/warn` usage while keeping
 * intentional, environment-aware logs available for operations/debugging.
 *
 * When GOOGLE_CLOUD_PROJECT is set, initConsoleToGoogleCloud() patches console
 * so all console output (including from this logger) is captured in Logs Explorer.
 */

type LogArgs = readonly unknown[];

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const levelOrder: Record<Exclude<LogLevel, 'silent'>, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function normalizeLevel(raw: string | undefined): LogLevel {
  const v = (raw || '').toLowerCase().trim();
  if (v === 'debug' || v === 'info' || v === 'warn' || v === 'error' || v === 'silent') return v;
  return process.env.NODE_ENV === 'development' ? 'debug' : 'info';
}

const configuredLevel = normalizeLevel(process.env.LOG_LEVEL);

function shouldLog(level: Exclude<LogLevel, 'silent'>) {
  if (configuredLevel === 'silent') return false;
  return levelOrder[level] >= levelOrder[configuredLevel as Exclude<LogLevel, 'silent'>];
}

function prefix(level: string, scope?: string) {
  return scope ? `[${level}][${scope}]` : `[${level}]`;
}

export const logger = {
  debug(scope: string | undefined, ...args: LogArgs) {
    if (!shouldLog('debug')) return;
    console.log(prefix('DEBUG', scope), ...args);
  },
  info(scope: string | undefined, ...args: LogArgs) {
    if (!shouldLog('info')) return;
    console.info(prefix('INFO', scope), ...args);
  },
  warn(scope: string | undefined, ...args: LogArgs) {
    if (!shouldLog('warn')) return;
    console.warn(prefix('WARN', scope), ...args);
  },
  error(scope: string | undefined, ...args: LogArgs) {
    if (!shouldLog('error')) return;
    console.error(prefix('ERROR', scope), ...args);
  },
};


