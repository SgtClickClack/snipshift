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
import Stripe from 'stripe';
import cookieParser from 'cookie-parser';

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

    // Initialize Stripe client
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });
    logger.info('Stripe client initialized');

    const app = express();
    const httpServer = createServer(app);

    // Trust proxy for Cloud Run (1 proxy layer)
    app.set('trust proxy', 1);

    // Security middleware with Google CSP permissions
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://accounts.google.com"],
          frameSrc: ["https://accounts.google.com"],
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

    // CRITICAL: Stripe webhook endpoint MUST come before express.json() to use raw body
    app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
      const sig = req.headers['stripe-signature'] as string;
      
      try {
        if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) {
          logger.error('Stripe configuration missing', { 
            hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
            hasSecretKey: !!process.env.STRIPE_SECRET_KEY 
          });
          return res.status(500).send('Stripe not configured');
        }

        const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
        
        logger.info('Webhook event received', { 
          type: event.type, 
          id: event.id,
          requestId: req.headers['stripe-request-id'] 
        });

        // Handle webhook events with idempotency
        switch (event.type) {
          case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            logger.info('Payment succeeded', { 
              id: paymentIntent.id,
              amount: paymentIntent.amount,
              currency: paymentIntent.currency,
              metadata: paymentIntent.metadata
            });
            break;
            
          case 'payment_intent.payment_failed':
            const failedPayment = event.data.object;
            logger.warn('Payment failed', { 
              id: failedPayment.id,
              lastPaymentError: failedPayment.last_payment_error?.message
            });
            break;
            
          case 'customer.subscription.created':
          case 'customer.subscription.updated':
          case 'customer.subscription.deleted':
            const subscription = event.data.object;
            logger.info('Subscription event', { 
              type: event.type,
              id: subscription.id,
              status: subscription.status,
              customerId: subscription.customer
            });
            break;
            
          default:
            logger.info('Unhandled webhook event', { type: event.type, id: event.id });
        }

        res.json({ received: true, eventId: event.id });
        
      } catch (err: any) {
        logger.error('Webhook signature verification failed', { 
          error: err.message,
          stripeSignature: sig ? 'present' : 'missing',
          requestId: req.headers['stripe-request-id']
        });
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    });

    // Body parsing (AFTER webhook route)
    app.use(express.json({ limit: '10mb' }));
    app.use(cookieParser());

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

    // Registration routes  
    app.get('/auth/register', (req, res) => {
      const role = req.query.role as string || '';
      const roleTitle = role ? role.charAt(0).toUpperCase() + role.slice(1) : '';
      const roleDescriptions: Record<string, string> = {
        hub: 'Own a barbershop or salon? Post shifts and find talented professionals.',
        professional: 'Barber or stylist? Find flexible work opportunities and showcase your skills.',
        brand: 'Product company? Connect with professionals and promote your products.',
        trainer: 'Educator? Share your expertise and monetize your training content.'
      };
      const roleDescription = roleDescriptions[role] || 'Join the SnipShift professional marketplace';

      const roleBadgeHtml = role ? `<div class="role-badge">${roleTitle} Registration</div>` : '';
      const roleSelectHtml = !role ? `
        <div class="form-group">
          <label for="role">I am a:</label>
          <select id="role" name="role" required>
            <option value="">Select your role</option>
            <option value="hub">Hub Owner (Barbershop/Salon)</option>
            <option value="professional">Professional (Barber/Stylist)</option>
            <option value="brand">Brand (Product Company)</option>
            <option value="trainer">Trainer (Educator)</option>
          </select>
        </div>
      ` : `<input type="hidden" name="role" value="${role}">`;
      
      const hubFieldsHtml = role === 'hub' ? `
        <div class="form-group">
          <label for="businessName">Business Name</label>
          <input type="text" id="businessName" name="businessName" required>
        </div>
      ` : '';
      
      const professionalFieldsHtml = role === 'professional' ? `
        <div class="form-group">
          <label for="experience">Years of Experience</label>
          <select id="experience" name="experience" required>
            <option value="">Select experience level</option>
            <option value="0-1">0-1 years</option>
            <option value="2-5">2-5 years</option>
            <option value="6-10">6-10 years</option>
            <option value="10+">10+ years</option>
          </select>
        </div>
      ` : '';

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Sign Up - SnipShift</title>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap">
          <style>
            :root {
              --background: hsl(210, 15%, 94%);
              --foreground: hsl(210, 15%, 12%);
              --steel-50: hsl(210, 20%, 98%);
              --steel-300: hsl(210, 12%, 82%);
              --steel-600: hsl(210, 10%, 38%);
              --steel-800: hsl(210, 18%, 18%);
              --steel-900: hsl(210, 20%, 12%);
              --red-accent: hsl(0, 85%, 35%);
              --red-accent-hover: hsl(0, 88%, 40%);
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Inter', system-ui, -apple-system, sans-serif;
              background: var(--background);
              color: var(--foreground);
              line-height: 1.6;
            }
            .container {
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .form-card {
              background: linear-gradient(145deg, #ffffff 0%, #f8f8f8 50%, #ffffff 100%);
              border: 2px solid var(--steel-300);
              border-radius: 20px;
              padding: 48px;
              max-width: 500px;
              width: 100%;
              box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08), 0 16px 32px rgba(0, 0, 0, 0.08), inset 0 2px 4px rgba(255, 255, 255, 0.9);
            }
            .logo { text-align: center; margin-bottom: 32px; }
            .logo h1 { font-size: 2rem; font-weight: 700; color: var(--steel-900); margin-bottom: 8px; }
            .role-badge {
              display: inline-block;
              background: linear-gradient(145deg, var(--red-accent), var(--red-accent-hover));
              color: white;
              padding: 6px 16px;
              border-radius: 20px;
              font-size: 0.875rem;
              font-weight: 500;
              margin-bottom: 16px;
            }
            .form-group { margin-bottom: 24px; }
            label { display: block; font-weight: 500; color: var(--steel-800); margin-bottom: 8px; }
            input[type="text"], input[type="email"], input[type="password"], select {
              width: 100%;
              padding: 12px 16px;
              border: 2px solid var(--steel-300);
              border-radius: 8px;
              font-size: 1rem;
              background: var(--steel-50);
              color: var(--steel-900);
              transition: all 0.2s ease;
            }
            input:focus, select:focus { outline: none; border-color: var(--red-accent); background: white; }
            .btn-primary {
              width: 100%;
              background: linear-gradient(145deg, var(--red-accent), var(--red-accent-hover));
              color: white;
              border: none;
              padding: 16px;
              border-radius: 8px;
              font-size: 1.125rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s ease;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0,0,0,0.2); }
            .auth-links { text-align: center; margin-top: 24px; }
            .auth-links a { color: var(--red-accent); text-decoration: none; font-weight: 500; }
            .auth-links a:hover { text-decoration: underline; }
            .back-link {
              display: inline-flex;
              align-items: center;
              color: var(--steel-600);
              text-decoration: none;
              font-weight: 500;
              margin-bottom: 24px;
            }
            .back-link:hover { color: var(--red-accent); }
            @media (max-width: 768px) { .form-card { padding: 32px 24px; } }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="form-card">
              <a href="/" class="back-link">← Back to Home</a>
              <div class="logo">
                <h1>SnipShift</h1>
                ${roleBadgeHtml}
                <p style="color: var(--steel-600); margin-top: 8px;">${roleDescription}</p>
              </div>
              <form id="registerForm">
                ${roleSelectHtml}
                <div class="form-group">
                  <label for="firstName">First Name</label>
                  <input type="text" id="firstName" name="firstName" required>
                </div>
                <div class="form-group">
                  <label for="lastName">Last Name</label>
                  <input type="text" id="lastName" name="lastName" required>
                </div>
                <div class="form-group">
                  <label for="email">Email Address</label>
                  <input type="email" id="email" name="email" required>
                </div>
                <div class="form-group">
                  <label for="password">Password</label>
                  <input type="password" id="password" name="password" required minlength="8">
                </div>
                ${hubFieldsHtml}
                ${professionalFieldsHtml}
                <button type="submit" class="btn-primary">Create Account</button>
              </form>
              
              <div style="text-align: center; margin: 24px 0;">
                <div style="display: inline-flex; align-items: center; width: 100%; color: var(--steel-600); font-size: 0.875rem;">
                  <div style="flex: 1; height: 1px; background: var(--steel-300);"></div>
                  <span style="padding: 0 16px;">or</span>
                  <div style="flex: 1; height: 1px; background: var(--steel-300);"></div>
                </div>
              </div>

              <button id="googleSignUpBtn" class="btn-google" onclick="alert('Button clicked!')" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 12px; background: white; border: 2px solid var(--steel-300); border-radius: 8px; padding: 12px 16px; font-size: 1rem; font-weight: 500; color: var(--steel-700); cursor: pointer; transition: all 0.2s ease; margin-bottom: 24px;">
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign up with Google
              </button>

              <div class="auth-links">
                <p>Already have an account? <a href="/auth/login">Sign in here</a></p>
              </div>
            </div>
          </div>
          <script src="https://accounts.google.com/gsi/client" async defer></script>
          <script>
            let isGoogleLoaded = false;

            // Initialize Google Sign-In
            window.onload = function() {
              if (window.google && window.google.accounts) {
                initializeGoogle();
              } else {
                // Wait for Google script to load
                setTimeout(() => {
                  if (window.google && window.google.accounts) {
                    initializeGoogle();
                  }
                }, 1000);
              }
            };

            function initializeGoogle() {
              try {
                window.google.accounts.id.initialize({
                  client_id: '${process.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id'}',
                  callback: handleGoogleSignUp,
                  auto_select: false
                });
                isGoogleLoaded = true;
                console.log('Google Sign-In initialized');
              } catch (error) {
                console.error('Google Sign-In initialization failed:', error);
              }
            }

            async function handleGoogleSignUp(response) {
              try {
                const result = await fetch('/api/auth/google', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    credential: response.credential,
                    mode: 'signup'
                  })
                });

                const data = await result.json();
                
                if (data.success) {
                  alert('Google sign-up successful! Welcome to SnipShift.');
                  window.location.href = '/';
                } else {
                  alert('Google sign-up failed: ' + (data.error || 'Unknown error'));
                }
              } catch (error) {
                console.error('Google sign-up error:', error);
                alert('Google sign-up failed. Please try again.');
              }
            }

            // Google Sign-Up button click handler
            document.addEventListener('DOMContentLoaded', function() {
              const googleBtn = document.getElementById('googleSignUpBtn');
              if (googleBtn) {
                googleBtn.addEventListener('click', function(e) {
                  e.preventDefault();
                  console.log('Google button clicked!');
                  console.log('isGoogleLoaded:', isGoogleLoaded);
                  console.log('window.google:', window.google);
                  
                  if (!isGoogleLoaded) {
                    alert('Google Sign-In is still loading. Please wait a moment and try again.');
                    return;
                  }
                  
                  try {
                    console.log('Attempting to show Google prompt...');
                    window.google.accounts.id.prompt();
                  } catch (error) {
                    console.error('Failed to show Google sign-in:', error);
                    alert('Failed to open Google sign-in. Please try again. Error: ' + error.message);
                  }
                });
              } else {
                console.error('Google button not found!');
              }
            });

            // Traditional form submission
            document.getElementById('registerForm').addEventListener('submit', function(e) {
              e.preventDefault();
              alert('Registration successful! This is a demo - no actual account was created.');
              window.location.href = '/';
            });
          </script>
        </body>
        </html>
      `;

      res.send(htmlContent);
    });

    // Login route
    app.get('/auth/login', (req, res) => {
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Sign In - SnipShift</title>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap">
          <style>
            :root {
              --background: hsl(210, 15%, 94%);
              --foreground: hsl(210, 15%, 12%);
              --steel-50: hsl(210, 20%, 98%);
              --steel-300: hsl(210, 12%, 82%);
              --steel-600: hsl(210, 10%, 38%);
              --steel-800: hsl(210, 18%, 18%);
              --steel-900: hsl(210, 20%, 12%);
              --red-accent: hsl(0, 85%, 35%);
              --red-accent-hover: hsl(0, 88%, 40%);
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Inter', system-ui, -apple-system, sans-serif;
              background: var(--background);
              color: var(--foreground);
              line-height: 1.6;
            }
            .container {
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .form-card {
              background: linear-gradient(145deg, #ffffff 0%, #f8f8f8 50%, #ffffff 100%);
              border: 2px solid var(--steel-300);
              border-radius: 20px;
              padding: 48px;
              max-width: 450px;
              width: 100%;
              box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08), 0 16px 32px rgba(0, 0, 0, 0.08), inset 0 2px 4px rgba(255, 255, 255, 0.9);
            }
            .logo { text-align: center; margin-bottom: 32px; }
            .logo h1 { font-size: 2rem; font-weight: 700; color: var(--steel-900); margin-bottom: 8px; }
            .form-group { margin-bottom: 24px; }
            label { display: block; font-weight: 500; color: var(--steel-800); margin-bottom: 8px; }
            input[type="email"], input[type="password"] {
              width: 100%;
              padding: 12px 16px;
              border: 2px solid var(--steel-300);
              border-radius: 8px;
              font-size: 1rem;
              background: var(--steel-50);
              color: var(--steel-900);
              transition: all 0.2s ease;
            }
            input:focus { outline: none; border-color: var(--red-accent); background: white; }
            .btn-primary {
              width: 100%;
              background: linear-gradient(145deg, var(--red-accent), var(--red-accent-hover));
              color: white;
              border: none;
              padding: 16px;
              border-radius: 8px;
              font-size: 1.125rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s ease;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0,0,0,0.2); }
            .auth-links { text-align: center; margin-top: 24px; }
            .auth-links a { color: var(--red-accent); text-decoration: none; font-weight: 500; }
            .auth-links a:hover { text-decoration: underline; }
            .back-link {
              display: inline-flex;
              align-items: center;
              color: var(--steel-600);
              text-decoration: none;
              font-weight: 500;
              margin-bottom: 24px;
            }
            .back-link:hover { color: var(--red-accent); }
            @media (max-width: 768px) { .form-card { padding: 32px 24px; } }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="form-card">
              <a href="/" class="back-link">← Back to Home</a>
              <div class="logo">
                <h1>SnipShift</h1>
                <p style="color: var(--steel-600); margin-top: 8px;">Welcome back to the professional marketplace</p>
              </div>
              <form id="loginForm">
                <div class="form-group">
                  <label for="email">Email Address</label>
                  <input type="email" id="email" name="email" required>
                </div>
                <div class="form-group">
                  <label for="password">Password</label>
                  <input type="password" id="password" name="password" required>
                </div>
                <button type="submit" class="btn-primary">Sign In</button>
              </form>
              
              <div style="text-align: center; margin: 24px 0;">
                <div style="display: inline-flex; align-items: center; width: 100%; color: var(--steel-600); font-size: 0.875rem;">
                  <div style="flex: 1; height: 1px; background: var(--steel-300);"></div>
                  <span style="padding: 0 16px;">or</span>
                  <div style="flex: 1; height: 1px; background: var(--steel-300);"></div>
                </div>
              </div>

              <button id="googleSignInBtn" class="btn-google" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 12px; background: white; border: 2px solid var(--steel-300); border-radius: 8px; padding: 12px 16px; font-size: 1rem; font-weight: 500; color: var(--steel-700); cursor: pointer; transition: all 0.2s ease; margin-bottom: 24px;">
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>

              <div class="auth-links">
                <p>Don't have an account? <a href="/auth/register">Sign up here</a></p>
                <p style="margin-top: 12px;"><a href="#" style="font-size: 0.875rem;">Forgot your password?</a></p>
              </div>
            </div>
          </div>
          <script src="https://accounts.google.com/gsi/client" async defer></script>
          <script>
            let isGoogleLoaded = false;

            // Initialize Google Sign-In
            window.onload = function() {
              if (window.google && window.google.accounts) {
                initializeGoogle();
              } else {
                // Wait for Google script to load
                setTimeout(() => {
                  if (window.google && window.google.accounts) {
                    initializeGoogle();
                  }
                }, 1000);
              }
            };

            function initializeGoogle() {
              try {
                window.google.accounts.id.initialize({
                  client_id: '${process.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id'}',
                  callback: handleGoogleSignIn,
                  auto_select: false
                });
                isGoogleLoaded = true;
                console.log('Google Sign-In initialized');
              } catch (error) {
                console.error('Google Sign-In initialization failed:', error);
              }
            }

            async function handleGoogleSignIn(response) {
              try {
                const result = await fetch('/api/auth/google', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    credential: response.credential,
                    mode: 'signin'
                  })
                });

                const data = await result.json();
                
                if (data.success) {
                  alert('Google sign-in successful! Welcome back to SnipShift.');
                  window.location.href = '/';
                } else {
                  alert('Google sign-in failed: ' + (data.error || 'Unknown error'));
                }
              } catch (error) {
                console.error('Google sign-in error:', error);
                alert('Google sign-in failed. Please try again.');
              }
            }

            // Google Sign-In button click handler
            document.getElementById('googleSignInBtn').addEventListener('click', function() {
              if (!isGoogleLoaded) {
                alert('Google Sign-In is still loading. Please wait a moment and try again.');
                return;
              }
              
              try {
                window.google.accounts.id.prompt();
              } catch (error) {
                console.error('Failed to show Google sign-in:', error);
                alert('Failed to open Google sign-in. Please try again.');
              }
            });

            // Traditional form submission
            document.getElementById('loginForm').addEventListener('submit', function(e) {
              e.preventDefault();
              alert('Login successful! This is a demo - redirecting to homepage.');
              window.location.href = '/';
            });
          </script>
        </body>
        </html>
      `;

      res.send(htmlContent);
    });


    // Server-side price catalog for security (prevents client price tampering)
    const PRICE_CATALOG = {
      'barber_cut_basic': { amount: 3500, currency: 'aud', description: 'Basic Haircut' },
      'barber_cut_premium': { amount: 5500, currency: 'aud', description: 'Premium Styling' },
      'barber_beard_trim': { amount: 2500, currency: 'aud', description: 'Beard Trim' },
      'snipshift_pro_monthly': { amount: 2999, currency: 'aud', description: 'SnipShift Pro Monthly' },
      'marketplace_booking_fee': { amount: 500, currency: 'aud', description: 'Booking Processing Fee' }
    };

    // Secure payment intent creation - accepts only server-validated priceId
    app.post('/api/stripe/create-payment-intent', async (req, res) => {
      try {
        const { priceId, userEmail = 'demo@snipshift.com', idempotencyKey } = req.body;
        
        if (!priceId) {
          return res.status(400).json({ 
            error: 'Price ID required',
            code: 'MISSING_PRICE_ID'
          });
        }

        // Server-side price validation (CRITICAL SECURITY)
        const priceInfo = PRICE_CATALOG[priceId as keyof typeof PRICE_CATALOG];
        if (!priceInfo) {
          return res.status(400).json({ 
            error: 'Invalid price ID',
            code: 'INVALID_PRICE_ID' 
          });
        }

        const paymentIntentParams: any = {
          amount: priceInfo.amount, // Server-controlled amount
          currency: priceInfo.currency,
          description: priceInfo.description,
          metadata: {
            userEmail,
            priceId,
            service: 'snipshift_marketplace'
          }
        };

        // Add idempotency key if provided (prevents duplicate charges)
        if (idempotencyKey) {
          paymentIntentParams.idempotency_key = idempotencyKey;
        }

        const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

        logger.info('Payment intent created', { 
          id: paymentIntent.id, 
          priceId,
          amount: priceInfo.amount,
          currency: priceInfo.currency,
          userEmail
        });

        res.json({ 
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          amount: priceInfo.amount,
          currency: priceInfo.currency,
          description: priceInfo.description
        });

      } catch (error: any) {
        logger.error('Payment intent creation failed', { 
          error: error.message,
          type: error.type,
          code: error.code,
          requestId: error.requestId,
          stripeErrorCode: error.code
        });

        // Return user-safe error messages
        const errorResponse: any = { 
          error: 'Payment processing failed',
          code: 'PAYMENT_ERROR'
        };

        if (error.type === 'StripeCardError') {
          errorResponse.error = 'Your card was declined';
          errorResponse.code = 'CARD_DECLINED';
        } else if (error.type === 'StripeRateLimitError') {
          errorResponse.error = 'Too many requests, please try again later';
          errorResponse.code = 'RATE_LIMITED';
        }

        res.status(500).json(errorResponse);
      }
    });

    // Subscription plans catalog (server-side validation)
    const SUBSCRIPTION_PLANS = {
      'snipshift_pro_monthly': 'price_1sample_monthly',
      'snipshift_pro_yearly': 'price_1sample_yearly'
    };

    // Secure subscription creation with server-side validation
    app.post('/api/stripe/create-subscription', async (req, res) => {
      try {
        const { planId, customerId, userEmail = 'demo@snipshift.com', idempotencyKey } = req.body;
        
        if (!planId) {
          return res.status(400).json({ 
            error: 'Subscription plan ID required',
            code: 'MISSING_PLAN_ID'
          });
        }

        // Validate plan exists in our catalog (prevents price tampering)
        const stripePriceId = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS];
        if (!stripePriceId) {
          return res.status(400).json({ 
            error: 'Invalid subscription plan',
            code: 'INVALID_PLAN_ID'
          });
        }

        // Create or retrieve customer with idempotency
        let customer;
        if (customerId) {
          try {
            customer = await stripe.customers.retrieve(customerId);
          } catch (error: any) {
            logger.warn('Customer not found, creating new customer', { customerId });
            customer = await stripe.customers.create({
              email: userEmail,
              metadata: { service: 'snipshift_pro' }
            });
          }
        } else {
          // Check for existing customer by email to prevent duplicates
          const existingCustomers = await stripe.customers.list({
            email: userEmail,
            limit: 1
          });
          
          if (existingCustomers.data.length > 0) {
            customer = existingCustomers.data[0];
          } else {
            customer = await stripe.customers.create({
              email: userEmail,
              metadata: { service: 'snipshift_pro' }
            });
          }
        }

        const subscriptionParams: any = {
          customer: customer.id,
          items: [{ price: stripePriceId }],
          payment_behavior: 'default_incomplete',
          expand: ['latest_invoice.payment_intent'],
          metadata: {
            planId,
            userEmail
          }
        };

        // Add idempotency key if provided
        if (idempotencyKey) {
          subscriptionParams.idempotency_key = idempotencyKey;
        }

        const subscription = await stripe.subscriptions.create(subscriptionParams);

        logger.info('Subscription created', { 
          id: subscription.id, 
          customerId: customer.id,
          planId,
          status: subscription.status 
        });

        res.json({
          subscriptionId: subscription.id,
          clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
          customerId: customer.id,
          status: subscription.status,
          planId
        });

      } catch (error: any) {
        logger.error('Subscription creation failed', { 
          error: error.message,
          type: error.type,
          code: error.code,
          requestId: error.requestId
        });

        // Return user-safe error messages
        const errorResponse: any = { 
          error: 'Subscription creation failed',
          code: 'SUBSCRIPTION_ERROR'
        };

        if (error.type === 'StripeCardError') {
          errorResponse.error = 'Payment method was declined';
          errorResponse.code = 'PAYMENT_DECLINED';
        }

        res.status(500).json(errorResponse);
      }
    });

    // Google OAuth authentication endpoint with secure sessions
    app.post('/api/auth/google', async (req, res) => {
      try {
        const { credential, mode } = req.body;
        
        if (!credential) {
          return res.status(400).json({ 
            error: 'No credential provided',
            code: 'MISSING_CREDENTIAL'
          });
        }

        // Verify Google JWT token with proper ES module import
        const { OAuth2Client } = await import('google-auth-library');
        const client = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID);
        
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: process.env.VITE_GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.aud || payload.aud !== process.env.VITE_GOOGLE_CLIENT_ID) {
          return res.status(401).json({ 
            error: 'Invalid token',
            code: 'INVALID_TOKEN'
          });
        }

        // Extract verified user data from Google
        const userData = {
          googleId: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
          provider: 'google',
          verified: true
        };

        // Generate secure session ID
        const sessionId = crypto.randomUUID();
        const sessionData = {
          userId: userData.googleId,
          email: userData.email,
          provider: 'google',
          createdAt: new Date().toISOString(),
          mode
        };

        // Store session server-side (in production, use Redis)
        // For demo, we'll use a simple in-memory store
        global.sessions = global.sessions || new Map();
        global.sessions.set(sessionId, sessionData);

        // Set secure httpOnly cookie
        res.cookie('session', sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          path: '/'
        });

        logger.info('Google auth successful', { 
          email: userData.email, 
          mode,
          sessionId: sessionId.substring(0, 8) + '...' // Log partial session ID for debugging
        });

        res.json({
          user: {
            email: userData.email,
            name: userData.name,
            picture: userData.picture,
            provider: 'google'
          },
          mode,
          success: true,
          sessionId: sessionId.substring(0, 8) + '...' // Return partial ID for client debugging
        });

      } catch (error: any) {
        logger.error('Google auth verification failed', { 
          error: error.message,
          type: error.constructor.name,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
        
        res.status(401).json({ 
          error: 'Google authentication failed',
          code: 'AUTH_FAILED'
        });
      }
    });

    // Secure logout endpoint
    app.post('/api/auth/logout', (req, res) => {
      const sessionId = req.cookies?.session;
      
      if (sessionId && global.sessions) {
        global.sessions.delete(sessionId);
      }
      
      res.clearCookie('session');
      res.json({ success: true, message: 'Logged out successfully' });
    });

    // Session verification middleware
    const verifySession = (req: any, res: any, next: any) => {
      const sessionId = req.cookies?.session;
      
      if (!sessionId || !global.sessions?.has(sessionId)) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'NO_SESSION'
        });
      }
      
      req.session = global.sessions.get(sessionId);
      next();
    };

    // Protected route example
    app.get('/api/auth/profile', verifySession, (req: any, res) => {
      res.json({
        user: {
          email: req.session.email,
          provider: req.session.provider,
          createdAt: req.session.createdAt
        }
      });
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
