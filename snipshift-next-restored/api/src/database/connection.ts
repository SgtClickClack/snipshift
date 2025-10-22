import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import { logger } from '../utils/logger.js';

// Database connection string
const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/snipshift';

// Enhanced connection configuration
const connectionConfig = {
  max: 20, // Maximum number of connections
  min: 5,  // Minimum number of connections
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout
  prepare: false, // Disable prepared statements for better performance
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // Connection pool settings
  max_lifetime: 60 * 30, // 30 minutes
  // Performance optimizations
  transform: {
    undefined: null, // Transform undefined to null
  },
  // Error handling
  onnotice: (notice: any) => {
    logger.debug('PostgreSQL notice:', notice);
  },
  onparameter: (key: string, value: any) => {
    logger.debug(`PostgreSQL parameter: ${key} = ${value}`);
  },
};

// Create connection with enhanced configuration
const client = postgres(connectionString, connectionConfig);

// Create drizzle instance with logging
export const db = drizzle(client, { 
  schema, 
  logger: process.env.NODE_ENV === 'development' ? {
    logQuery: (query, params) => {
      logger.debug('SQL Query:', { query, params });
    },
    logQueryError: (error, query, params) => {
      logger.error('SQL Query Error:', { error, query, params });
    },
  } : false,
});

// Connection health check
export async function connectDatabase(): Promise<void> {
  try {
    // Test connection with a simple query
    await client`SELECT 1 as test`;
    logger.info('Database connected successfully');
    
    // Log connection info
    const connectionInfo = await client`
      SELECT 
        current_database() as database,
        current_user as user,
        version() as version,
        inet_server_addr() as server_address,
        inet_server_port() as server_port
    `;
    
    logger.info('Database connection info:', connectionInfo[0]);
    
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw new Error('Failed to connect to database');
  }
}

// Graceful shutdown
export async function closeDatabase(): Promise<void> {
  try {
    await client.end();
    logger.info('Database connection closed gracefully');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
}

// Connection monitoring
export async function getConnectionStats(): Promise<any> {
  try {
    const stats = await client`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections,
        count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `;
    
    return stats[0];
  } catch (error) {
    logger.error('Error getting connection stats:', error);
    return null;
  }
}

// Query performance monitoring
export class QueryMonitor {
  private static instance: QueryMonitor;
  private slowQueries: Array<{ query: string; duration: number; timestamp: Date }> = [];
  private readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second

  public static getInstance(): QueryMonitor {
    if (!QueryMonitor.instance) {
      QueryMonitor.instance = new QueryMonitor();
    }
    return QueryMonitor.instance;
  }

  logQuery(query: string, duration: number): void {
    if (duration > this.SLOW_QUERY_THRESHOLD) {
      this.slowQueries.push({
        query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
        duration,
        timestamp: new Date(),
      });
      
      logger.warn(`Slow query detected (${duration}ms):`, query.substring(0, 200));
      
      // Keep only last 100 slow queries
      if (this.slowQueries.length > 100) {
        this.slowQueries = this.slowQueries.slice(-100);
      }
    }
  }

  getSlowQueries(): Array<{ query: string; duration: number; timestamp: Date }> {
    return [...this.slowQueries];
  }

  clearSlowQueries(): void {
    this.slowQueries = [];
  }
}

// Database transaction helper
export class TransactionHelper {
  static async executeInTransaction<T>(
    callback: (tx: typeof db) => Promise<T>
  ): Promise<T> {
    return await db.transaction(async (tx) => {
      return await callback(tx);
    });
  }
}

// Database health check endpoint
export async function healthCheck(): Promise<{ status: string; details: any }> {
  try {
    const start = Date.now();
    await client`SELECT 1`;
    const duration = Date.now() - start;
    
    const connectionStats = await getConnectionStats();
    
    return {
      status: 'healthy',
      details: {
        responseTime: duration,
        connectionStats,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return {
      status: 'unhealthy',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
    };
  }
}