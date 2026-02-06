/**
 * Type declarations for @google-cloud/* packages.
 * Used so tsc can compile without resolving these at build time.
 * Runtime uses dynamic import() to avoid bundler TDZ issues.
 */
declare module '@google-cloud/error-reporting' {
  export class ErrorReporting {
    constructor(options?: { projectId?: string; serviceContext?: { service?: string; version?: string }; reportMode?: string });
    report(error: Error | string): void;
  }
}

declare module '@google-cloud/logging' {
  export class Logging {
    constructor(options?: { projectId?: string });
    log(name: string): { entry: (meta: unknown, payload: unknown) => unknown; write: (entry: unknown) => Promise<void> };
  }
}
