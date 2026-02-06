# Google Cloud Logging and Error Reporting Setup

HospoGo backend is configured to pipe errors and logs to Google Cloud when `GOOGLE_CLOUD_PROJECT` (or `GCP_PROJECT`) is set.

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLOUD_PROJECT` | GCP project ID (enables Cloud Logging + Error Reporting) |
| `GCP_PROJECT` | Alternative to `GOOGLE_CLOUD_PROJECT` |

### Service Name

Error Reporting uses the service name **`hospogo-backend`**.

## What Gets Captured

1. **Error Reporting** – All errors from:
   - `errorHandler` middleware (unhandled route errors)
   - `errorReporting.captureError()` / `captureCritical()` / `captureWarning()` in catch blocks
   - Google Cloud Error Reporting Express middleware (uncaught errors)

2. **Cloud Logging (Logs Explorer)** – All output from:
   - `console.log`, `console.info`, `console.warn`, `console.error` (when `GOOGLE_CLOUD_PROJECT` is set)
   - Structured log entries from the error-reporting service

## Verification

### 1. Enable in Local Dev

```bash
# In api/.env or root .env
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
```

Use [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials):

```bash
gcloud auth application-default login
```

### 2. Verify Logs in Logs Explorer

1. Open [Logs Explorer](https://console.cloud.google.com/logs/query)
2. Filter by log name: `hospogo-backend`
3. Or use: `resource.type="global" AND logName="projects/YOUR_PROJECT/logs/hospogo-backend"`

### 3. Verify Errors in Error Reporting

1. Open [Error Reporting](https://console.cloud.google.com/errors)
2. Filter by service: `hospogo-backend`

### 4. IAM Roles

The service account needs:

- `roles/logging.logWriter` – to write logs
- `roles/errorreporting.writer` – to report errors

On Cloud Run, GKE, or App Engine these are usually granted by default.

## Packages

- `@google-cloud/logging` – Cloud Logging client
- `@google-cloud/error-reporting` – Error Reporting client
