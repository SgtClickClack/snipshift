/**
 * Pipes console.log/info/warn/error to Google Cloud Logging when GOOGLE_CLOUD_PROJECT is set.
 * Ensures all console output is visible in Logs Explorer.
 *
 * Call initConsoleToGoogleCloud() early in app bootstrap (e.g. index.ts after dotenv).
 */

import { isGoogleCloudEnabled, writeLogToGoogleCloud } from './google-cloud.js';

type ConsoleMethod = 'log' | 'info' | 'warn' | 'error';

const SEVERITY_MAP: Record<ConsoleMethod, 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR'> = {
  log: 'INFO',
  info: 'INFO',
  warn: 'WARNING',
  error: 'ERROR',
};

function formatArgs(args: unknown[]): string {
  return args
    .map((a) => (typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a)))
    .join(' ');
}

let initialized = false;

export function initConsoleToGoogleCloud(): void {
  if (!isGoogleCloudEnabled() || initialized) return;
  initialized = true;

  const methods: ConsoleMethod[] = ['log', 'info', 'warn', 'error'];

  for (const method of methods) {
    const original = console[method].bind(console);
    console[method] = (...args: unknown[]) => {
      original(...args);
      const message = formatArgs(args);
      const severity = SEVERITY_MAP[method];
      writeLogToGoogleCloud(severity, message).catch(() => {
        // Silently ignore Cloud Logging failures
      });
    };
  }
}
