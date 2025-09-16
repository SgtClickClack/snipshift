import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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

    const PORT = process.env.PORT || 4000;
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 GraphQL endpoint: http://localhost:${PORT}/graphql`);
      logger.info(`🔍 GraphQL Playground: http://localhost:${PORT}/graphql`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
