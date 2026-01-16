# 🛡️ Production Guardrails Implementation

**Date**: Pre-Launch Implementation  
**Status**: ✅ **IMPLEMENTED**  
**Version**: 1.0.0

---

## Executive Summary

Production guardrails have been implemented to enhance observability, error tracking, and system health monitoring for HospoGo v1.0.0. This includes enhanced health checks, error reporting integration, and correlation ID tracking for request tracing.

---

## 1. ✅ Health Check Hardening

### Implementation

**File**: `api/_src/services/health-check.service.ts`

The health check endpoint (`/api/health`) now performs comprehensive checks:

1. **Database Connectivity**
   - Executes `SELECT 1` query to verify PostgreSQL connection
   - Measures response time
   - Returns `healthy`, `degraded`, or `unhealthy` status

2. **Pusher Connectivity**
   - Verifies Pusher credentials are configured
   - Attempts to trigger a test event to verify API connectivity
   - Returns `degraded` if not configured, `unhealthy` if connectivity fails

3. **Stripe API Connectivity**
   - Performs lightweight API call (`account.retrieve()`) to verify connectivity
   - Distinguishes between connectivity issues and authentication errors
   - Returns appropriate status based on error type

### Health Check Response Format

```json
{
  "status": "ok" | "degraded" | "unhealthy",
  "timestamp": "2024-01-12T00:00:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": [
    {
      "service": "database",
      "status": "healthy",
      "message": "Database connection successful",
      "responseTime": 5
    },
    {
      "service": "pusher",
      "status": "healthy",
      "message": "Pusher connectivity verified",
      "responseTime": 120
    },
    {
      "service": "stripe",
      "status": "healthy",
      "message": "Stripe API connectivity verified",
      "responseTime": 250
    }
  ]
}
```

### HTTP Status Codes

- `200 OK`: All services healthy or degraded (non-critical)
- `503 Service Unavailable`: One or more services unhealthy (critical)

### Usage

```bash
# Check health
curl https://your-domain.com/api/health

# Monitor with uptime checks
# Configure your monitoring service to check /api/health
# Alert on 503 status or "unhealthy" in response
```

---

## 2. ✅ Error Reporting Integration

### Implementation

**File**: `api/_src/services/error-reporting.service.ts`

A comprehensive error reporting service has been implemented with support for:
- **Sentry** (commented boilerplate ready)
- **LogSnag** (commented boilerplate ready)
- **Console fallback** (active by default)

### Features

1. **Severity Levels**
   - `info`: Informational messages
   - `warning`: Non-critical issues (e.g., failed geofence attempts)
   - `error`: Standard errors (e.g., unhandled 500 errors)
   - `critical`: Critical failures (e.g., Stripe webhook signature failures)

2. **Context Enrichment**
   - Correlation ID tracking
   - User context (userId, email)
   - Request metadata (path, method)
   - Custom tags and metadata

3. **Integration Points**

   **Global Error Handler** (`api/_src/middleware/errorHandler.ts`):
   - All unhandled errors automatically reported
   - Includes correlation ID and request context
   - Severity based on HTTP status code (500+ = error)

   **Geofence Failures** (`api/_src/routes/shifts.ts`):
   - Failed clock-in attempts logged as warnings
   - Includes distance, coordinates, and shift context
   - Tagged with `eventType: 'geofence_failure'`

   **Stripe Webhook Failures** (`api/_src/routes/webhooks.ts`):
   - Signature verification failures logged as critical
   - Missing credentials logged as critical
   - Includes signature and error details

### Setup Instructions

#### Option 1: Sentry (Recommended)

1. Install Sentry:
   ```bash
   cd api
   npm install @sentry/node
   ```

2. Uncomment `SentryErrorReporting` class in `error-reporting.service.ts`

3. Set environment variable:
   ```env
   SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
   ```

4. Update `getErrorReportingService()` to use Sentry:
   ```typescript
   if (process.env.SENTRY_DSN) {
     errorReportingService = new SentryErrorReporting();
     return errorReportingService;
   }
   ```

#### Option 2: LogSnag

1. Install LogSnag:
   ```bash
   cd api
   npm install logsnag
   ```

2. Uncomment `LogSnagErrorReporting` class in `error-reporting.service.ts`

3. Set environment variables:
   ```env
   LOGSNAG_API_KEY=your-logsnag-api-key
   LOGSNAG_PROJECT=hospogo
   ```

4. Update `getErrorReportingService()` to use LogSnag

#### Option 3: Console (Default)

- No setup required
- All errors logged to console with structured format
- Suitable for development and small deployments

### Error Reporting Examples

```typescript
// Critical error (Stripe webhook failure)
await errorReporting.captureCritical(
  'Stripe webhook signature verification failed',
  error,
  {
    correlationId: req.correlationId,
    path: req.path,
    method: req.method,
    tags: { eventType: 'stripe_webhook_failure' },
  }
);

// Warning (Geofence failure)
await errorReporting.captureWarning(
  'Failed geofence clock-in attempt',
  {
    correlationId: req.correlationId,
    userId: userId,
    metadata: { distance: 250, maxRadius: 200 },
    tags: { eventType: 'geofence_failure' },
  }
);

// Standard error (500 error)
await errorReporting.captureError(
  'Unhandled server error',
  error,
  {
    correlationId: req.correlationId,
    path: req.path,
    method: req.method,
  }
);
```

---

## 3. ✅ Production Log Standard

### Implementation

**File**: `api/_src/middleware/correlation-id.ts`

### Correlation ID Generation

1. **Automatic Generation**
   - Middleware generates UUID v4 for each request
   - Attached to `req.correlationId`
   - Added to response header `X-Correlation-ID`

2. **Header Support**
   - Accepts existing correlation IDs from:
     - `X-Correlation-ID`
     - `X-Request-ID`
     - `X-Trace-ID`
   - If present, uses existing ID (enables frontend-to-backend tracing)

3. **Log Integration**
   - All request logs include `correlationId`
   - Error logs include `correlationId`
   - Error reporting includes `correlationId`

### Frontend Integration

To enable end-to-end tracing, include correlation ID in frontend requests:

```typescript
// Generate correlation ID on frontend
const correlationId = crypto.randomUUID();

// Include in all API requests
fetch('/api/endpoint', {
  headers: {
    'X-Correlation-ID': correlationId,
    'Authorization': `Bearer ${token}`,
  },
});
```

### Log Format

**Request Logs**:
```
[2024-01-12T00:00:00.000Z] POST /api/shifts/123/clock-in {
  correlationId: '550e8400-e29b-41d4-a716-446655440000',
  hasBody: true,
  bodyKeys: ['latitude', 'longitude'],
  hasAuth: true,
  ...
}
```

**Error Logs**:
```
🔥 CRITICAL SERVER CRASH [errorHandler]: {
  message: 'Database connection failed',
  correlationId: '550e8400-e29b-41d4-a716-446655440000',
  path: '/api/shifts/123/clock-in',
  method: 'POST',
  ...
}
```

### Tracing Workflow

1. **Frontend Request**:
   - Generate correlation ID: `abc-123`
   - Include in header: `X-Correlation-ID: abc-123`
   - Send request to backend

2. **Backend Processing**:
   - Middleware extracts correlation ID: `abc-123`
   - All logs include: `correlationId: 'abc-123'`
   - Errors reported with: `correlationId: 'abc-123'`

3. **Error Tracking**:
   - Search error tracking service for: `correlationId: 'abc-123'`
   - Find all logs with same correlation ID
   - Trace request from frontend to backend

---

## 4. 📋 Integration Checklist

### Pre-Deployment

- [ ] Choose error reporting service (Sentry/LogSnag/Console)
- [ ] Install required npm packages
- [ ] Uncomment appropriate error reporting class
- [ ] Set environment variables:
  - `SENTRY_DSN` (if using Sentry)
  - `LOGSNAG_API_KEY` and `LOGSNAG_PROJECT` (if using LogSnag)
- [ ] Test health check endpoint: `GET /api/health`
- [ ] Verify correlation IDs in logs
- [ ] Test error reporting with intentional errors

### Post-Deployment

- [ ] Monitor health check endpoint
- [ ] Set up alerts for unhealthy health checks
- [ ] Configure error tracking service alerts
- [ ] Verify correlation IDs in production logs
- [ ] Test end-to-end tracing with frontend

---

## 5. 🔍 Monitoring Recommendations

### Health Check Monitoring

1. **Uptime Monitoring**
   - Check `/api/health` every 60 seconds
   - Alert on 503 status code
   - Alert if any service status is `unhealthy`

2. **Response Time Monitoring**
   - Track response times for each service check
   - Alert if response time > 5 seconds
   - Alert if database response time > 1 second

### Error Monitoring

1. **Critical Errors**
   - Alert immediately on `critical` severity errors
   - Monitor Stripe webhook failures
   - Monitor authentication failures

2. **Warning Trends**
   - Track geofence failure rates
   - Alert if failure rate > 10% in 5 minutes
   - Monitor for patterns in failures

3. **Error Rate Monitoring**
   - Track 500 error rate
   - Alert if error rate > 1% of requests
   - Monitor error rate trends

### Correlation ID Usage

1. **Request Tracing**
   - Use correlation ID to trace user-reported issues
   - Search logs by correlation ID
   - Correlate frontend and backend errors

2. **Debugging Workflow**
   - User reports issue with error message
   - Extract correlation ID from error response header
   - Search all logs and error tracking for correlation ID
   - Trace complete request flow

---

## 6. 📊 Files Modified

1. **New Files**:
   - `api/_src/services/error-reporting.service.ts` - Error reporting service
   - `api/_src/middleware/correlation-id.ts` - Correlation ID middleware
   - `api/_src/services/health-check.service.ts` - Enhanced health checks

2. **Modified Files**:
   - `api/_src/index.ts` - Added correlation ID middleware, enhanced health endpoint
   - `api/_src/middleware/errorHandler.ts` - Integrated error reporting
   - `api/_src/routes/shifts.ts` - Added geofence failure reporting
   - `api/_src/routes/webhooks.ts` - Added webhook failure reporting

---

## 7. ✅ Verification

### Health Check Verification

```bash
# Test health endpoint
curl https://your-domain.com/api/health

# Expected: 200 OK with all services healthy
# If unhealthy: 503 with details
```

### Correlation ID Verification

```bash
# Make request and check response header
curl -v https://your-domain.com/api/health

# Look for: X-Correlation-ID: <uuid>
```

### Error Reporting Verification

1. Trigger intentional error (e.g., invalid endpoint)
2. Check error tracking service for report
3. Verify correlation ID is included
4. Verify context and metadata are present

---

## 8. 🚀 Next Steps

1. **Choose Error Reporting Service**
   - Evaluate Sentry vs LogSnag vs custom solution
   - Install and configure chosen service
   - Test error reporting in staging

2. **Frontend Integration**
   - Add correlation ID generation to frontend
   - Include in all API requests
   - Test end-to-end tracing

3. **Monitoring Setup**
   - Configure uptime monitoring for health checks
   - Set up error alerts in error tracking service
   - Create dashboards for error trends

4. **Documentation**
   - Document error reporting setup for team
   - Create runbook for common error scenarios
   - Document correlation ID usage for debugging

---

**Status**: ✅ **PRODUCTION GUARDRAILS IMPLEMENTED**

All production guardrails have been successfully implemented and are ready for deployment. The system now has comprehensive health monitoring, error tracking, and request tracing capabilities.
