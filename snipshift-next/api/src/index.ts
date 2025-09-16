import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
// Body parser middleware available directly from Express
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { PubSub } from 'graphql-subscriptions';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { typeDefs } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers.js';
import { context } from './graphql/context.js';
import { authMiddleware } from './middleware/auth.js';
import { rateLimitMiddleware } from './middleware/rateLimit.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import { connectDatabase } from './database/connection.js';
import { initializeRedis } from './config/redis.js';

// Initialize PubSub for real-time subscriptions
export const pubsub = new PubSub();

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('Database connected successfully');

    // Initialize Redis for caching and sessions
    await initializeRedis();
    logger.info('Redis connected successfully');

    const app = express();
    const httpServer = createServer(app);

    // Trust proxy for Cloud Run (1 proxy layer)
    app.set('trust proxy', 1);

    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    app.use(cors({
      origin: process.env.NODE_ENV === 'production'
        ? ['https://www.snipshift.com.au', 'https://app.snipshift.com.au']
        : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8081'],
      credentials: true,
    }));

    // Rate limiting
    app.use(rateLimitMiddleware);

    // Body parsing
    app.use(express.json({ limit: '10mb' }));

    // Serve a simple landing page for the root route
    app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>SnipShift - Professional Marketplace</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 40px; background: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #333; text-align: center; margin-bottom: 30px; }
            p { color: #666; line-height: 1.6; margin-bottom: 20px; }
            .status { background: #e8f5e8; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745; margin: 20px 0; }
            .links { text-align: center; margin-top: 30px; }
            .links a { display: inline-block; margin: 0 15px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🚀 SnipShift 2.0 - Professional Marketplace</h1>
            
            <div class="status">
              ✅ <strong>API Server Running Successfully</strong><br>
              The SnipShift backend is online and ready to serve the creative community.
            </div>
            
            <p>Welcome to SnipShift, the premier B2B2C marketplace connecting the barbering, hairdressing, and creative industries.</p>
            
            <p><strong>What's Working:</strong></p>
            <ul>
              <li>✅ GraphQL API Backend</li>
              <li>✅ Database Connectivity</li>
              <li>✅ Security & Rate Limiting</li>
              <li>✅ Real-time Subscriptions</li>
              <li>✅ Enterprise-grade Authentication</li>
            </ul>
            
            <p><strong>For Developers:</strong></p>
            <ul>
              <li>GraphQL Playground: <a href="/graphql">/graphql</a></li>
              <li>Health Check: <a href="/health">/health</a></li>
            </ul>
            
            <div class="links">
              <a href="/graphql">🔍 GraphQL Playground</a>
              <a href="/health">💓 Health Check</a>
            </div>
            
            <p style="text-align: center; margin-top: 30px; color: #999; font-size: 14px;">
              SnipShift 2.0 - Connecting Professionals, Brands, and Talent
            </p>
          </div>
        </body>
        </html>
      `);
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // WebSocket server for subscriptions
    const wsServer = new WebSocketServer({
      server: httpServer,
      path: '/graphql',
    });

    useServer(
      {
        schema,
        context: (ctx: any) => context({ req: ctx.extra.request }),
        onConnect: () => { logger.info('WebSocket client connected'); },
        onDisconnect: () => { logger.info('WebSocket client disconnected'); },
      },
      wsServer as any
    );

    // Apollo Server setup
    const server = new ApolloServer({
      schema,
      // Security: Disable introspection and playground in production
      introspection: process.env.NODE_ENV !== 'production',
      plugins: [
        {
          async serverWillStart() {
            return {
              async drainServer() {
                wsServer.close();
              },
            };
          },
        },
      ],
    });

    await server.start();

    // Apply Apollo middleware
    app.use(
      '/graphql',
      authMiddleware,
      expressMiddleware(server, {
        context: context,
      })
    );

    // Error handling
    app.use(errorHandler);

    const PORT = parseInt(process.env.PORT || '4000', 10);
    const HOST = process.env.HOST || '0.0.0.0'; // Bind to all interfaces for containers
    
    httpServer.listen(PORT, HOST, () => {
      logger.info(`🚀 Server running on ${HOST}:${PORT}`);
      logger.info(`📊 GraphQL endpoint: http://${HOST}:${PORT}/graphql`);
      logger.info(`🔍 GraphQL Playground: http://${HOST}:${PORT}/graphql`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
