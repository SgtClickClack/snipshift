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

    // Serve the SnipShift web application
    app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>SnipShift 2.0 - Professional Marketplace</title>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap">
          <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Roboto', sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
            .hero { background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); color: white; padding: 80px 20px; text-align: center; }
            .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
            .hero h1 { font-size: 3.5rem; font-weight: 300; margin-bottom: 20px; }
            .hero p { font-size: 1.5rem; margin-bottom: 40px; opacity: 0.9; }
            .roles-section { padding: 80px 20px; background: white; }
            .section-title { text-align: center; font-size: 2.5rem; margin-bottom: 20px; color: #333; }
            .section-subtitle { text-align: center; font-size: 1.25rem; color: #666; margin-bottom: 60px; }
            .roles-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 30px; max-width: 1200px; margin: 0 auto; }
            .role-card { background: white; border-radius: 12px; padding: 40px 30px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.1); transition: transform 0.3s ease, box-shadow 0.3s ease; border: 1px solid #e0e0e0; }
            .role-card:hover { transform: translateY(-8px); box-shadow: 0 8px 40px rgba(0,0,0,0.15); }
            .role-icon { width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 40px; color: white; }
            .hub { background: #2196F3; }
            .professional { background: #4CAF50; }
            .brand { background: #9C27B0; }
            .trainer { background: #FF9800; }
            .role-title { font-size: 1.5rem; font-weight: 500; margin-bottom: 15px; color: #333; }
            .role-description { color: #666; margin-bottom: 25px; line-height: 1.6; }
            .role-button { background: #1976d2; color: white; border: none; padding: 12px 30px; border-radius: 25px; font-size: 1rem; cursor: pointer; transition: background 0.3s ease; text-decoration: none; display: inline-block; }
            .role-button:hover { background: #1565c0; text-decoration: none; color: white; }
            .cta-section { background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); color: white; padding: 80px 20px; text-align: center; }
            .cta-title { font-size: 2.5rem; margin-bottom: 20px; }
            .cta-subtitle { font-size: 1.25rem; margin-bottom: 40px; opacity: 0.9; }
            .cta-button { background: #ff5722; color: white; border: none; padding: 15px 40px; border-radius: 30px; font-size: 1.1rem; cursor: pointer; transition: background 0.3s ease; text-decoration: none; display: inline-block; }
            .cta-button:hover { background: #e64a19; text-decoration: none; color: white; }
            @media (max-width: 768px) {
              .hero h1 { font-size: 2.5rem; }
              .hero p { font-size: 1.2rem; }
              .section-title { font-size: 2rem; }
              .roles-grid { grid-template-columns: 1fr; }
            }
          </style>
        </head>
        <body>
          <!-- Hero Section -->
          <section class="hero">
            <div class="container">
              <h1>Welcome to SnipShift 2.0</h1>
              <p>The next generation platform connecting the creative industry</p>
            </div>
          </section>

          <!-- Role Selection Section -->
          <section class="roles-section">
            <div class="container">
              <h2 class="section-title">Choose Your Role</h2>
              <p class="section-subtitle">Join the platform that connects the creative industry</p>
              
              <div class="roles-grid">
                <div class="role-card">
                  <div class="role-icon hub">
                    <span class="material-icons">store</span>
                  </div>
                  <h3 class="role-title">Hub Owner</h3>
                  <p class="role-description">Own a barbershop or salon? Post shifts and find talented professionals.</p>
                  <a href="/auth/register?role=hub" class="role-button">Get Started</a>
                </div>

                <div class="role-card">
                  <div class="role-icon professional">
                    <span class="material-icons">person</span>
                  </div>
                  <h3 class="role-title">Professional</h3>
                  <p class="role-description">Barber or stylist? Find flexible work opportunities and showcase your skills.</p>
                  <a href="/auth/register?role=professional" class="role-button">Get Started</a>
                </div>

                <div class="role-card">
                  <div class="role-icon brand">
                    <span class="material-icons">emoji_events</span>
                  </div>
                  <h3 class="role-title">Brand</h3>
                  <p class="role-description">Product company? Connect with professionals and promote your products.</p>
                  <a href="/auth/register?role=brand" class="role-button">Get Started</a>
                </div>

                <div class="role-card">
                  <div class="role-icon trainer">
                    <span class="material-icons">school</span>
                  </div>
                  <h3 class="role-title">Trainer</h3>
                  <p class="role-description">Educator? Share your expertise and monetize your training content.</p>
                  <a href="/auth/register?role=trainer" class="role-button">Get Started</a>
                </div>
              </div>
            </div>
          </section>

          <!-- CTA Section -->
          <section class="cta-section">
            <div class="container">
              <h2 class="cta-title">Ready to Join the Revolution?</h2>
              <p class="cta-subtitle">Connect with the creative community and take your career to the next level.</p>
              <a href="/auth/register" class="cta-button">Get Started Today</a>
            </div>
          </section>

          <!-- Health Status for Developers -->
          <div style="position: fixed; bottom: 20px; right: 20px; z-index: 1000;">
            <a href="/graphql" style="background: #333; color: white; padding: 8px 12px; border-radius: 4px; text-decoration: none; font-size: 12px; margin-right: 8px;">GraphQL</a>
            <a href="/health" style="background: #4CAF50; color: white; padding: 8px 12px; border-radius: 4px; text-decoration: none; font-size: 12px;">Health</a>
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
