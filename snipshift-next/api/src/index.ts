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

    // Serve static files (for hero background image)
    app.use('/public', express.static(path.join(__dirname, '../public')));

    // Serve the SnipShift web application with proper Black & Chrome design
    app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>SnipShift - Professional Marketplace</title>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap">
          <style>
            :root {
              /* Enhanced Steel & Chrome Color Palette */
              --background: hsl(210, 15%, 94%);
              --foreground: hsl(210, 15%, 12%);
              --steel-50: hsl(210, 20%, 98%);
              --steel-100: hsl(210, 18%, 95%);
              --steel-200: hsl(210, 15%, 90%);
              --steel-300: hsl(210, 12%, 82%);
              --steel-400: hsl(210, 10%, 68%);
              --steel-500: hsl(210, 8%, 52%);
              --steel-600: hsl(210, 10%, 38%);
              --steel-700: hsl(210, 15%, 28%);
              --steel-800: hsl(210, 18%, 18%);
              --steel-900: hsl(210, 20%, 12%);
              --red-accent: hsl(0, 85%, 35%);
              --red-accent-light: hsl(0, 85%, 45%);
              --red-accent-hover: hsl(0, 88%, 40%);
              --chrome-light: hsl(210, 8%, 95%);
              --chrome-medium: hsl(210, 8%, 68%);
              --chrome-dark: hsl(210, 12%, 45%);
            }
            
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body { 
              font-family: 'Inter', system-ui, -apple-system, sans-serif; 
              line-height: 1.5; 
              letter-spacing: -0.01em; 
              color: var(--foreground);
              background: var(--background);
            }
            
            .hero {
              position: relative;
              background-image: url('/public/hero-background.jpg');
              background-size: cover;
              background-position: center;
              background-repeat: no-repeat;
              color: white;
              padding: 120px 20px;
              text-align: center;
              overflow: hidden;
            }
            
            .hero::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.7) 100%);
              z-index: 1;
            }
            
            .hero-content {
              position: relative;
              z-index: 2;
              max-width: 1200px;
              margin: 0 auto;
            }
            
            .hero-icon {
              display: inline-flex;
              padding: 16px;
              background: linear-gradient(145deg, var(--red-accent), var(--red-accent-hover));
              border-radius: 50%;
              box-shadow: 0 8px 32px rgba(0,0,0,0.3);
              margin-bottom: 32px;
            }
            
            .hero h1 { 
              font-size: 4rem; 
              font-weight: 700; 
              margin-bottom: 24px; 
              tracking-tight: -0.02em;
            }
            
            .hero p { 
              font-size: 1.5rem; 
              margin-bottom: 48px; 
              opacity: 0.95; 
              max-width: 800px; 
              margin-left: auto; 
              margin-right: auto;
            }
            
            .cta-buttons {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 16px;
              margin-bottom: 32px;
            }
            
            .btn-primary {
              background: linear-gradient(145deg, var(--red-accent), var(--red-accent-hover));
              color: white;
              border: none;
              padding: 16px 48px;
              border-radius: 12px;
              font-size: 1.125rem;
              font-weight: 600;
              text-decoration: none;
              display: inline-block;
              transition: all 0.2s ease;
              box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            }
            
            .btn-primary:hover {
              background: linear-gradient(145deg, var(--red-accent-light), var(--red-accent));
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(0,0,0,0.3);
              text-decoration: none;
              color: white;
            }
            
            .btn-secondary {
              background: rgba(255,255,255,0.1);
              color: white;
              border: 2px solid rgba(255,255,255,0.3);
              padding: 14px 32px;
              border-radius: 12px;
              font-size: 1rem;
              font-weight: 500;
              text-decoration: none;
              display: inline-block;
              transition: all 0.2s ease;
              backdrop-filter: blur(8px);
            }
            
            .btn-secondary:hover {
              background: rgba(255,255,255,0.2);
              border-color: rgba(255,255,255,0.5);
              transform: translateY(-1px);
              text-decoration: none;
              color: white;
            }
            
            .roles-section { 
              padding: 100px 20px; 
              background: linear-gradient(135deg, var(--steel-50) 0%, white 100%);
            }
            
            .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
            
            .section-title { 
              text-align: center; 
              font-size: 3rem; 
              font-weight: 700; 
              margin-bottom: 16px; 
              color: var(--steel-900);
              letter-spacing: -0.02em;
            }
            
            .section-subtitle { 
              text-align: center; 
              font-size: 1.25rem; 
              color: var(--steel-600); 
              margin-bottom: 80px; 
              max-width: 600px; 
              margin-left: auto; 
              margin-right: auto;
            }
            
            .roles-grid { 
              display: grid; 
              grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
              gap: 32px; 
            }
            
            .role-card { 
              background: linear-gradient(145deg, #ffffff 0%, #f8f8f8 50%, #ffffff 100%);
              border: 2px solid var(--steel-300);
              border-radius: 16px; 
              padding: 48px 32px; 
              text-align: center; 
              transition: all 0.3s ease; 
              position: relative;
              overflow: hidden;
              box-shadow: 
                0 4px 8px rgba(0, 0, 0, 0.05),
                0 8px 16px rgba(0, 0, 0, 0.05),
                inset 0 1px 0 rgba(255, 255, 255, 0.8);
            }
            
            .role-card::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 4px;
              background: linear-gradient(90deg, var(--steel-400), var(--chrome-medium));
            }
            
            .role-card:hover { 
              transform: translateY(-8px); 
              border-color: var(--steel-400);
              box-shadow: 
                0 8px 16px rgba(0, 0, 0, 0.08),
                0 16px 32px rgba(0, 0, 0, 0.08),
                inset 0 2px 4px rgba(255, 255, 255, 0.9);
            }
            
            .role-icon { 
              width: 80px; 
              height: 80px; 
              border-radius: 50%; 
              margin: 0 auto 24px; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              font-size: 32px; 
              color: white;
              background: linear-gradient(145deg, var(--steel-600), var(--steel-700));
              box-shadow: 0 4px 16px rgba(0,0,0,0.15);
            }
            
            .role-icon.hub { background: linear-gradient(145deg, #2196F3, #1976d2); }
            .role-icon.professional { background: linear-gradient(145deg, #4CAF50, #388e3c); }
            .role-icon.brand { background: linear-gradient(145deg, #9C27B0, #7b1fa2); }
            .role-icon.trainer { background: linear-gradient(145deg, #FF9800, #f57c00); }
            
            .role-title { 
              font-size: 1.5rem; 
              font-weight: 600; 
              margin-bottom: 16px; 
              color: var(--steel-900);
            }
            
            .role-description { 
              color: var(--steel-600); 
              margin-bottom: 32px; 
              line-height: 1.6; 
            }
            
            .role-button { 
              background: linear-gradient(145deg, var(--steel-600), var(--steel-700));
              color: white; 
              border: none; 
              padding: 12px 32px; 
              border-radius: 8px; 
              font-size: 1rem; 
              font-weight: 500;
              cursor: pointer; 
              transition: all 0.2s ease; 
              text-decoration: none; 
              display: inline-block;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .role-button:hover { 
              background: linear-gradient(145deg, var(--steel-500), var(--steel-600));
              transform: translateY(-1px);
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              text-decoration: none; 
              color: white; 
            }
            
            .scissors-icon {
              display: inline-block;
              width: 48px;
              height: 48px;
              background: white;
              mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Ccircle cx='6' cy='6' r='3'/%3E%3Cpath d='m6 9 6 6'/%3E%3Cpath d='m21 7-2-2-6 6'/%3E%3Cpath d='m21 17-2 2-6-6'/%3E%3Ccircle cx='6' cy='18' r='3'/%3E%3C/svg%3E") no-repeat center;
              mask-size: contain;
            }
            
            @media (max-width: 768px) {
              .hero h1 { font-size: 2.5rem; }
              .hero p { font-size: 1.2rem; }
              .section-title { font-size: 2rem; }
              .roles-grid { grid-template-columns: 1fr; }
              .cta-buttons { flex-direction: column; }
            }
            
            @media (min-width: 640px) {
              .cta-buttons { flex-direction: row; justify-content: center; }
            }
          </style>
        </head>
        <body>
          <!-- Hero Section with Barber Tools Background -->
          <section class="hero">
            <div class="hero-content">
              <div class="hero-icon">
                <div class="scissors-icon"></div>
              </div>
              
              <h1>Connect. Cover. Grow.</h1>
              <p>Snipshift bridges barbershops, salons and creative hubs with verified professionals for seamless workforce flexibility</p>
              
              <div class="cta-buttons">
                <a href="/auth/register" class="btn-primary">Get Started Today</a>
                <a href="/auth/login" class="btn-secondary">Already have an account? Login</a>
              </div>
              
              <p style="font-size: 0.875rem; opacity: 0.8;">Join thousands of professionals already on Snipshift</p>
            </div>
          </section>

          <!-- Role Selection Section -->
          <section class="roles-section">
            <div class="container">
              <h2 class="section-title">Perfect For</h2>
              <p class="section-subtitle">Whether you own a business, work as a professional, represent a brand, or teach others</p>
              
              <div class="roles-grid">
                <div class="role-card">
                  <div class="role-icon hub">🏪</div>
                  <h3 class="role-title">Hub Owner</h3>
                  <p class="role-description">Own a barbershop or salon? Post shifts and find talented professionals.</p>
                  <a href="/auth/register?role=hub" class="role-button">Get Started</a>
                </div>

                <div class="role-card">
                  <div class="role-icon professional">👤</div>
                  <h3 class="role-title">Professional</h3>
                  <p class="role-description">Barber or stylist? Find flexible work opportunities and showcase your skills.</p>
                  <a href="/auth/register?role=professional" class="role-button">Get Started</a>
                </div>

                <div class="role-card">
                  <div class="role-icon brand">🏆</div>
                  <h3 class="role-title">Brand</h3>
                  <p class="role-description">Product company? Connect with professionals and promote your products.</p>
                  <a href="/auth/register?role=brand" class="role-button">Get Started</a>
                </div>

                <div class="role-card">
                  <div class="role-icon trainer">🎓</div>
                  <h3 class="role-title">Trainer</h3>
                  <p class="role-description">Educator? Share your expertise and monetize your training content.</p>
                  <a href="/auth/register?role=trainer" class="role-button">Get Started</a>
                </div>
              </div>
            </div>
          </section>

          <!-- Health Status for Developers -->
          <div style="position: fixed; bottom: 20px; right: 20px; z-index: 1000;">
            <a href="/graphql" style="background: var(--steel-800); color: white; padding: 8px 12px; border-radius: 4px; text-decoration: none; font-size: 12px; margin-right: 8px;">GraphQL</a>
            <a href="/health" style="background: var(--red-accent); color: white; padding: 8px 12px; border-radius: 4px; text-decoration: none; font-size: 12px;">Health</a>
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
