import { logger } from '../utils/logger.js';
import { CacheService } from '../config/redis.js';

// Performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, Array<{ timestamp: Date; duration: number; metadata?: any }>> = new Map();
  private readonly MAX_METRICS_PER_OPERATION = 1000;

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTimer(operation: string): () => void {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      this.recordMetric(operation, duration);
      
      if (duration > 1000) { // Log slow operations
        logger.warn(`Slow operation detected: ${operation} took ${duration}ms`);
      }
    };
  }

  recordMetric(operation: string, duration: number, metadata?: any): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    const operationMetrics = this.metrics.get(operation)!;
    operationMetrics.push({
      timestamp: new Date(),
      duration,
      metadata,
    });

    // Keep only recent metrics
    if (operationMetrics.length > this.MAX_METRICS_PER_OPERATION) {
      operationMetrics.splice(0, operationMetrics.length - this.MAX_METRICS_PER_OPERATION);
    }
  }

  getMetrics(operation?: string): any {
    if (operation) {
      const metrics = this.metrics.get(operation) || [];
      return this.calculateStats(metrics);
    }

    const allMetrics: any = {};
    for (const [op, metrics] of this.metrics.entries()) {
      allMetrics[op] = this.calculateStats(metrics);
    }
    return allMetrics;
  }

  private calculateStats(metrics: Array<{ timestamp: Date; duration: number }>): any {
    if (metrics.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0, p95: 0, p99: 0 };
    }

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const count = durations.length;
    const avg = durations.reduce((sum, d) => sum + d, 0) / count;
    const min = durations[0];
    const max = durations[count - 1];
    const p95 = durations[Math.floor(count * 0.95)];
    const p99 = durations[Math.floor(count * 0.99)];

    return { count, avg: Math.round(avg), min, max, p95, p99 };
  }

  clearMetrics(): void {
    this.metrics.clear();
  }
}

// Error tracking
export class ErrorTracker {
  private static instance: ErrorTracker;
  private errors: Array<{
    timestamp: Date;
    error: Error;
    context: any;
    operation?: string;
    userId?: string;
  }> = [];
  private readonly MAX_ERRORS = 1000;

  public static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  trackError(error: Error, context: any = {}, operation?: string, userId?: string): void {
    this.errors.push({
      timestamp: new Date(),
      error,
      context,
      operation,
      userId,
    });

    // Keep only recent errors
    if (this.errors.length > this.MAX_ERRORS) {
      this.errors.splice(0, this.errors.length - this.MAX_ERRORS);
    }

    // Log error
    logger.error('Error tracked:', {
      message: error.message,
      stack: error.stack,
      context,
      operation,
      userId,
    });
  }

  getErrors(operation?: string, userId?: string): any[] {
    let filteredErrors = this.errors;

    if (operation) {
      filteredErrors = filteredErrors.filter(e => e.operation === operation);
    }

    if (userId) {
      filteredErrors = filteredErrors.filter(e => e.userId === userId);
    }

    return filteredErrors.map(e => ({
      timestamp: e.timestamp,
      message: e.error.message,
      operation: e.operation,
      userId: e.userId,
      context: e.context,
    }));
  }

  getErrorStats(): any {
    const stats = {
      total: this.errors.length,
      byOperation: {} as any,
      byType: {} as any,
      recent: this.errors.filter(e => 
        Date.now() - e.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
      ).length,
    };

    for (const error of this.errors) {
      // Count by operation
      if (error.operation) {
        stats.byOperation[error.operation] = (stats.byOperation[error.operation] || 0) + 1;
      }

      // Count by error type
      const errorType = error.error.constructor.name;
      stats.byType[errorType] = (stats.byType[errorType] || 0) + 1;
    }

    return stats;
  }

  clearErrors(): void {
    this.errors = [];
  }
}

// Health monitoring
export class HealthMonitor {
  private static instance: HealthMonitor;
  private healthChecks: Map<string, () => Promise<{ status: string; details?: any }>> = new Map();

  public static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor();
    }
    return HealthMonitor.instance;
  }

  registerHealthCheck(name: string, check: () => Promise<{ status: string; details?: any }>): void {
    this.healthChecks.set(name, check);
  }

  async runHealthChecks(): Promise<{ overall: string; checks: any }> {
    const results: any = {};
    let overallStatus = 'healthy';

    for (const [name, check] of this.healthChecks.entries()) {
      try {
        const result = await check();
        results[name] = result;
        
        if (result.status !== 'healthy') {
          overallStatus = 'unhealthy';
        }
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        };
        overallStatus = 'unhealthy';
      }
    }

    return { overall: overallStatus, checks: results };
  }

  async getSystemMetrics(): Promise<any> {
    const performanceMonitor = PerformanceMonitor.getInstance();
    const errorTracker = ErrorTracker.getInstance();
    const cache = CacheService.getInstance();

    return {
      performance: performanceMonitor.getMetrics(),
      errors: errorTracker.getErrorStats(),
      cache: {
        available: cache.redis !== null,
        // Add cache-specific metrics here
      },
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}

// Request monitoring middleware
export class RequestMonitor {
  private static instance: RequestMonitor;
  private requests: Array<{
    timestamp: Date;
    operation: string;
    duration: number;
    userId?: string;
    success: boolean;
  }> = [];
  private readonly MAX_REQUESTS = 10000;

  public static getInstance(): RequestMonitor {
    if (!RequestMonitor.instance) {
      RequestMonitor.instance = new RequestMonitor();
    }
    return RequestMonitor.instance;
  }

  recordRequest(operation: string, duration: number, userId?: string, success: boolean = true): void {
    this.requests.push({
      timestamp: new Date(),
      operation,
      duration,
      userId,
      success,
    });

    // Keep only recent requests
    if (this.requests.length > this.MAX_REQUESTS) {
      this.requests.splice(0, this.requests.length - this.MAX_REQUESTS);
    }
  }

  getRequestStats(timeWindowMs: number = 60 * 60 * 1000): any { // Default 1 hour
    const cutoff = Date.now() - timeWindowMs;
    const recentRequests = this.requests.filter(r => r.timestamp.getTime() > cutoff);

    const stats = {
      total: recentRequests.length,
      successful: recentRequests.filter(r => r.success).length,
      failed: recentRequests.filter(r => !r.success).length,
      avgDuration: 0,
      p95Duration: 0,
      p99Duration: 0,
      byOperation: {} as any,
    };

    if (recentRequests.length > 0) {
      const durations = recentRequests.map(r => r.duration).sort((a, b) => a - b);
      stats.avgDuration = Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length);
      stats.p95Duration = durations[Math.floor(durations.length * 0.95)];
      stats.p99Duration = durations[Math.floor(durations.length * 0.99)];

      // Count by operation
      for (const request of recentRequests) {
        stats.byOperation[request.operation] = (stats.byOperation[request.operation] || 0) + 1;
      }
    }

    return stats;
  }

  clearRequests(): void {
    this.requests = [];
  }
}

// Alerting system
export class AlertManager {
  private static instance: AlertManager;
  private alerts: Array<{
    timestamp: Date;
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    resolved: boolean;
  }> = [];

  public static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }

  createAlert(type: string, message: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
    this.alerts.push({
      timestamp: new Date(),
      type,
      message,
      severity,
      resolved: false,
    });

    logger.warn(`Alert created: [${severity.toUpperCase()}] ${type}: ${message}`);

    // Auto-resolve low severity alerts after 1 hour
    if (severity === 'low') {
      setTimeout(() => {
        this.resolveAlert(this.alerts.length - 1);
      }, 60 * 60 * 1000);
    }
  }

  resolveAlert(alertIndex: number): void {
    if (this.alerts[alertIndex]) {
      this.alerts[alertIndex].resolved = true;
      logger.info(`Alert resolved: ${this.alerts[alertIndex].type}`);
    }
  }

  getActiveAlerts(): any[] {
    return this.alerts
      .filter(a => !a.resolved)
      .map(a => ({
        timestamp: a.timestamp,
        type: a.type,
        message: a.message,
        severity: a.severity,
      }));
  }

  getAlertStats(): any {
    const stats = {
      total: this.alerts.length,
      active: this.alerts.filter(a => !a.resolved).length,
      resolved: this.alerts.filter(a => a.resolved).length,
      bySeverity: {} as any,
      byType: {} as any,
    };

    for (const alert of this.alerts) {
      stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;
      stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
    }

    return stats;
  }
}

// Initialize monitoring
export function initializeMonitoring(): void {
  const healthMonitor = HealthMonitor.getInstance();
  const alertManager = AlertManager.getInstance();

  // Register health checks
  healthMonitor.registerHealthCheck('database', async () => {
    try {
      const { healthCheck } = await import('../database/connection.js');
      return await healthCheck();
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  });

  healthMonitor.registerHealthCheck('redis', async () => {
    try {
      const { getRedis } = await import('../config/redis.js');
      const redis = getRedis();
      
      if (!redis) {
        return { status: 'unavailable', details: { message: 'Redis not configured' } };
      }

      await redis.ping();
      return { status: 'healthy' };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  });

  // Set up periodic monitoring
  setInterval(async () => {
    try {
      const health = await healthMonitor.runHealthChecks();
      const metrics = await healthMonitor.getSystemMetrics();
      
      // Check for critical issues
      if (health.overall !== 'healthy') {
        alertManager.createAlert(
          'system_health',
          'System health check failed',
          'high'
        );
      }

      // Check for high error rates
      if (metrics.errors.recent > 100) {
        alertManager.createAlert(
          'error_rate',
          `High error rate detected: ${metrics.errors.recent} errors in last 24 hours`,
          'medium'
        );
      }

      // Check for memory usage
      const memoryUsage = metrics.memory.heapUsed / metrics.memory.heapTotal;
      if (memoryUsage > 0.9) {
        alertManager.createAlert(
          'memory_usage',
          `High memory usage: ${Math.round(memoryUsage * 100)}%`,
          'high'
        );
      }

    } catch (error) {
      logger.error('Error in periodic monitoring:', error);
    }
  }, 5 * 60 * 1000); // Every 5 minutes
}

export {
  PerformanceMonitor,
  ErrorTracker,
  HealthMonitor,
  RequestMonitor,
  AlertManager,
};
