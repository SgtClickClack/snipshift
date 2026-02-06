/**
 * Google Cloud Logging and Error Reporting client initialization
 *
 * Service name: hospogo-backend
 * Enable with: GOOGLE_CLOUD_PROJECT env var
 *
 * IMPORTANT: All @google-cloud/* imports are DYNAMIC (lazy) to avoid
 * "ReferenceError: Cannot access 'ts' before initialization" in Vercel's
 * production bundler. These packages have complex internal module graphs
 * that cause TDZ errors when statically imported and bundled by @vercel/ncc.
 */

const SERVICE_NAME = 'hospogo-backend';
const LOG_NAME = 'hospogo-backend';

// Lazy-loaded singletons (populated on first use when GCP is enabled)
let errorReportingClient: any | null = null;
let loggingClient: any | null = null;
let logWriter: any | null = null;

/**
 * Get project ID from environment
 */
export function getGoogleCloudProjectId(): string | null {
  return process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || null;
}

/**
 * Check if Google Cloud integration is enabled
 */
export function isGoogleCloudEnabled(): boolean {
  return !!getGoogleCloudProjectId();
}

/**
 * Initialize and return the Error Reporting client with service name 'hospogo-backend'
 *
 * Uses dynamic import() to avoid bundler TDZ issues with @google-cloud packages.
 */
export async function getErrorReportingClient(): Promise<any | null> {
  if (errorReportingClient) return errorReportingClient;

  const projectId = getGoogleCloudProjectId();
  if (!projectId) return null;

  try {
    const { ErrorReporting } = await import('@google-cloud/error-reporting');
    errorReportingClient = new ErrorReporting({
      projectId,
      serviceContext: {
        service: SERVICE_NAME,
        version: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version || '1.0.0',
      },
      reportMode: process.env.NODE_ENV === 'production' || process.env.VERCEL === '1' ? 'production' : 'always',
    });
    return errorReportingClient;
  } catch (err) {
    console.error('[GOOGLE_CLOUD] Failed to initialize Error Reporting:', err);
    return null;
  }
}

/**
 * Initialize and return the Cloud Logging client
 *
 * Uses dynamic import() to avoid bundler TDZ issues with @google-cloud packages.
 */
export async function getLoggingClient(): Promise<any | null> {
  if (loggingClient) return loggingClient;

  const projectId = getGoogleCloudProjectId();
  if (!projectId) return null;

  try {
    const { Logging } = await import('@google-cloud/logging');
    loggingClient = new Logging({ projectId });
    return loggingClient;
  } catch (err) {
    console.error('[GOOGLE_CLOUD] Failed to initialize Logging:', err);
    return null;
  }
}

/**
 * Get the log writer for writing entries to Cloud Logging
 */
export async function getLogWriter(): Promise<any | null> {
  if (logWriter) return logWriter;

  const logging = await getLoggingClient();
  if (!logging) return null;

  logWriter = logging.log(LOG_NAME);
  return logWriter;
}

/**
 * Report an error to Google Cloud Error Reporting
 */
export async function reportErrorToGoogleCloud(error: Error | string): Promise<void> {
  const client = await getErrorReportingClient();
  if (!client) return;

  try {
    client.report(error);
  } catch (reportErr) {
    console.error('[GOOGLE_CLOUD] Failed to report error:', reportErr);
  }
}

/**
 * Write a log entry to Google Cloud Logging
 */
export async function writeLogToGoogleCloud(
  severity: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR',
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const log = await getLogWriter();
  if (!log) return;

  try {
    const entryMetadata: Record<string, unknown> = {
      severity,
      resource: { type: 'global' },
    };
    const payload = metadata ? { message, ...metadata } : { message };
    const entry = log.entry(entryMetadata, payload);
    await log.write(entry);
  } catch (err) {
    console.error('[GOOGLE_CLOUD] Failed to write log:', err);
  }
}
