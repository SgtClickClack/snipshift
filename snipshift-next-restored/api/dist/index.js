"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Global error handlers must be first to catch schema parse errors
process.on('uncaughtException', (error) => {
    console.error('🚨 UNCAUGHT EXCEPTION:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 UNHANDLED REJECTION at:', promise, 'reason:', reason);
    process.exit(1);
});
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const server_1 = require("@apollo/server");
const express5_1 = require("@as-integrations/express5");
// Body parser middleware available directly from Express
const http_1 = require("http");
// WebSocket imports moved to dynamic imports to prevent startup crashes
const schema_1 = require("@graphql-tools/schema");
const graphql_subscriptions_1 = require("graphql-subscriptions");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
const schema_2 = require("./graphql/schema");
const resolvers_1 = require("./graphql/resolvers");
const context_1 = require("./graphql/context");
const auth_1 = require("./middleware/auth");
const rateLimit_1 = require("./middleware/rateLimit");
const errorHandler_1 = require("./middleware/errorHandler");
const logger_1 = require("./utils/logger");
const connection_1 = require("./database/connection");
const redis_1 = require("./config/redis");
const stripe_1 = __importDefault(require("stripe"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
// Initialize PubSub for real-time subscriptions
const pubsub = new graphql_subscriptions_1.PubSub();
// Wrap schema creation to catch SDL parse errors
let schema;
try {
    schema = (0, schema_1.makeExecutableSchema)({
        typeDefs: schema_2.typeDefs,
        resolvers: resolvers_1.resolvers,
    });
    console.log('✅ GraphQL schema created successfully');
}
catch (error) {
    console.error('🚨 GraphQL SDL parse error:', error);
    console.error('Check schema.ts for malformed SDL:', error.message);
    process.exit(1);
}
// Global error handlers moved to top of file
async function startServer() {
    try {
        console.log('[DEBUG] Starting server initialization...');
        // Connect to database (optional in development)
        if (!process.env.SKIP_DB) {
            console.log('[DEBUG] Attempting to connect to database...');
            try {
                await (0, connection_1.connectDatabase)();
                console.log('[DEBUG] Database connection successful');
                logger_1.logger.info('Database connected successfully');
            }
            catch (error) {
                console.log('[DEBUG] Database connection failed, continuing without database');
                if (process.env.NODE_ENV === 'production') {
                    logger_1.logger.error('Database connection failed in production, continuing without database', { error: error.message });
                }
                else {
                    logger_1.logger.warn('Database connection failed, continuing in dev mode', { error: error.message });
                }
            }
        }
        else {
            console.log('[DEBUG] Skipping database connection (SKIP_DB=1)');
            logger_1.logger.info('Skipping database connection (SKIP_DB=1)');
        }
        // Initialize Redis for caching and sessions (optional in development)
        if (!process.env.SKIP_REDIS) {
            console.log('[DEBUG] Attempting to connect to Redis...');
            try {
                await (0, redis_1.initializeRedis)();
                console.log('[DEBUG] Redis connection successful');
                logger_1.logger.info('Redis connected successfully');
            }
            catch (error) {
                // If REDIS_URL is missing in production, fail fast
                if (process.env.NODE_ENV === 'production' && error.message && error.message.includes('REDIS_URL environment variable is required')) {
                    console.error('[FATAL] Redis configuration error in production:', error.message);
                    logger_1.logger.error('FATAL: Redis configuration error in production', { error: error.message });
                    throw error; // Fail fast - don't continue without Redis in production
                }
                // Otherwise, allow graceful degradation
                console.log('[DEBUG] Redis connection failed, continuing without Redis');
                if (process.env.NODE_ENV === 'production') {
                    logger_1.logger.error('Redis connection failed in production, continuing without Redis', { error: error.message });
                }
                else {
                    logger_1.logger.warn('Redis connection failed, continuing in dev mode', { error: error.message });
                }
            }
        }
        else {
            console.log('[DEBUG] Skipping Redis connection (SKIP_REDIS=1)');
            logger_1.logger.info('Skipping Redis connection (SKIP_REDIS=1)');
        }
        // Initialize Stripe client (optional in development)
        console.log('[DEBUG] Checking Stripe configuration...');
        let stripe = null;
        if (!process.env.SKIP_STRIPE && process.env.STRIPE_SECRET_KEY) {
            console.log('[DEBUG] Attempting to initialize Stripe client...');
            try {
                stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY);
                console.log('[DEBUG] Stripe client initialized successfully');
                logger_1.logger.info('Stripe client initialized');
            }
            catch (error) {
                console.log('[DEBUG] Stripe initialization failed, continuing without Stripe');
                if (process.env.NODE_ENV === 'production') {
                    logger_1.logger.error('Stripe initialization failed in production, continuing without Stripe', { error: error.message });
                }
                else {
                    logger_1.logger.warn('Stripe initialization failed, continuing in dev mode', { error: error.message });
                }
                stripe = null;
            }
        }
        else if (process.env.SKIP_STRIPE) {
            console.log('[DEBUG] Skipping Stripe initialization (SKIP_STRIPE=1)');
            logger_1.logger.info('Skipping Stripe initialization (SKIP_STRIPE=1)');
        }
        else {
            console.log('[DEBUG] STRIPE_SECRET_KEY not provided, continuing without payment processing');
            logger_1.logger.warn('STRIPE_SECRET_KEY not provided, continuing in dev mode without payment processing');
        }
        console.log('[DEBUG] Creating Express application and HTTP server...');
        const app = (0, express_1.default)();
        const httpServer = (0, http_1.createServer)(app);
        console.log('[DEBUG] Express app and HTTP server created successfully');
        // Trust proxy for Cloud Run (1 proxy layer)
        console.log('[DEBUG] Configuring Express middleware...');
        app.set('trust proxy', 1);
        // Security middleware with Google CSP permissions
        console.log('[DEBUG] Setting up Helmet security middleware...');
        app.use((0, helmet_1.default)({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'", 'https://www.gstatic.com'],
                    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://accounts.google.com'],
                    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://www.gstatic.com', 'https://apis.google.com', 'https://accounts.google.com'],
                    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
                    imgSrc: ["'self'", 'data:', 'https:'],
                    connectSrc: ["'self'", 'https://www.gstatic.com', 'https://apis.google.com', 'https://accounts.google.com'],
                    frameSrc: ["'self'", 'https://accounts.google.com'],
                    childSrc: ["'self'", 'https://accounts.google.com'],
                },
            },
        }));
        console.log('[DEBUG] Helmet middleware configured');
        // CORS configuration
        console.log('[DEBUG] Setting up CORS middleware...');
        app.use((0, cors_1.default)({
            origin: process.env.NODE_ENV === 'production'
                ? ['https://www.snipshift.com.au', 'https://app.snipshift.com.au']
                : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8081'],
            credentials: true,
        }));
        console.log('[DEBUG] CORS middleware configured');
        // Rate limiting
        console.log('[DEBUG] Setting up rate limiting middleware...');
        app.use(rateLimit_1.rateLimitMiddleware);
        console.log('[DEBUG] Rate limiting middleware configured');
        // CRITICAL: Stripe webhook endpoint MUST come before express.json() to use raw body
        app.post('/webhook/stripe', express_1.default.raw({ type: 'application/json' }), async (req, res) => {
            const sig = req.headers['stripe-signature'];
            try {
                if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) {
                    logger_1.logger.error('Stripe configuration missing', {
                        hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
                        hasSecretKey: !!process.env.STRIPE_SECRET_KEY
                    });
                    return res.status(500).send('Stripe not configured');
                }
                if (!stripe) {
                    return res.status(500).send('Stripe not initialized');
                }
                const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
                logger_1.logger.info('Webhook event received', {
                    type: event.type,
                    id: event.id,
                    requestId: req.headers['stripe-request-id']
                });
                // Handle webhook events with idempotency
                switch (event.type) {
                    case 'payment_intent.succeeded':
                        const paymentIntent = event.data.object;
                        logger_1.logger.info('Payment succeeded', {
                            id: paymentIntent.id,
                            amount: paymentIntent.amount,
                            currency: paymentIntent.currency,
                            metadata: paymentIntent.metadata
                        });
                        break;
                    case 'payment_intent.payment_failed':
                        const failedPayment = event.data.object;
                        logger_1.logger.warn('Payment failed', {
                            id: failedPayment.id,
                            lastPaymentError: failedPayment.last_payment_error?.message
                        });
                        break;
                    case 'customer.subscription.created':
                    case 'customer.subscription.updated':
                    case 'customer.subscription.deleted':
                        const subscription = event.data.object;
                        logger_1.logger.info('Subscription event', {
                            type: event.type,
                            id: subscription.id,
                            status: subscription.status,
                            customerId: subscription.customer
                        });
                        break;
                    default:
                        logger_1.logger.info('Unhandled webhook event', { type: event.type, id: event.id });
                }
                res.json({ received: true, eventId: event.id });
            }
            catch (err) {
                logger_1.logger.error('Webhook signature verification failed', {
                    error: err.message,
                    stripeSignature: sig ? 'present' : 'missing',
                    requestId: req.headers['stripe-request-id']
                });
                return res.status(400).send(`Webhook Error: ${err.message}`);
            }
        });
        // Body parsing (AFTER webhook route)
        app.use(express_1.default.json({ limit: '10mb' }));
        app.use((0, cookie_parser_1.default)());
        // Serve static files (for hero background image)
        app.use('/public', express_1.default.static(path_1.default.join(__dirname, '../public')));
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
              /* Modern SnipShift Color Palette */
              --brand-primary: #FF6B6B;
              --brand-primary-dark: #E55A5A;
              --brand-primary-light: #FF8A8A;
              --brand-secondary: #4ECDC4;
              --brand-secondary-dark: #3BB5AC;
              --brand-secondary-light: #6ED5CE;
              --brand-accent: #45B7D1;
              --brand-accent-dark: #3A9BC1;
              --brand-accent-light: #5BC3D6;
              
              --neutral-50: #FAFAFA;
              --neutral-100: #F5F5F5;
              --neutral-200: #E5E5E5;
              --neutral-300: #D4D4D4;
              --neutral-400: #A3A3A3;
              --neutral-500: #737373;
              --neutral-600: #525252;
              --neutral-700: #404040;
              --neutral-800: #262626;
              --neutral-900: #171717;
              
              --success: #10B981;
              --warning: #F59E0B;
              --error: #EF4444;
              --info: #3B82F6;
              
              --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
              --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
              --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
              --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
              
              --radius-sm: 0.125rem;
              --radius-md: 0.375rem;
              --radius-lg: 0.5rem;
              --radius-xl: 0.75rem;
              --radius-2xl: 1rem;
              
              --transition-fast: 150ms ease;
              --transition-base: 200ms ease;
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
              background: linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark));
              color: white;
              border: none;
              padding: 16px 48px;
              border-radius: var(--radius-xl);
              font-size: 1.125rem;
              font-weight: 600;
              text-decoration: none;
              display: inline-block;
              transition: all var(--transition-base);
              box-shadow: var(--shadow-lg);
              cursor: pointer;
            }
            
            .btn-primary:hover {
              background: linear-gradient(135deg, var(--brand-primary-dark), var(--brand-primary));
              transform: translateY(-2px);
              box-shadow: var(--shadow-xl);
              text-decoration: none;
              color: white;
            }
            
            .btn-secondary {
              background: rgba(255,255,255,0.1);
              color: white;
              border: 2px solid rgba(255,255,255,0.3);
              padding: 14px 32px;
              border-radius: var(--radius-xl);
              font-size: 1rem;
              font-weight: 500;
              text-decoration: none;
              display: inline-block;
              transition: all var(--transition-base);
              -webkit-backdrop-filter: blur(8px);
              backdrop-filter: blur(8px);
              cursor: pointer;
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
              border: 2px solid var(--neutral-200);
              border-radius: var(--radius-2xl); 
              padding: 48px 32px; 
              text-align: center; 
              transition: all var(--transition-base); 
              position: relative;
              overflow: hidden;
              box-shadow: var(--shadow-lg);
              cursor: pointer;
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
              border-color: var(--brand-primary);
              box-shadow: var(--shadow-xl);
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
              background: linear-gradient(145deg, var(--brand-primary), var(--brand-primary-dark));
              box-shadow: var(--shadow-lg);
              transition: all var(--transition-base);
            }
            
            .role-icon:hover {
              transform: scale(1.1);
              box-shadow: var(--shadow-xl);
            }
            
            .role-icon.hub { background: linear-gradient(145deg, var(--brand-accent), var(--brand-accent-dark)); }
            .role-icon.professional { background: linear-gradient(145deg, var(--brand-secondary), var(--brand-secondary-dark)); }
            .role-icon.brand { background: linear-gradient(145deg, var(--brand-primary), var(--brand-primary-dark)); }
            .role-icon.trainer { background: linear-gradient(145deg, var(--brand-accent-light), var(--brand-accent)); }
            
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
              background: linear-gradient(145deg, var(--brand-primary), var(--brand-primary-dark));
              color: white; 
              border: none; 
              padding: 12px 32px; 
              border-radius: var(--radius-lg); 
              font-size: 1rem; 
              font-weight: 500;
              cursor: pointer; 
              transition: all var(--transition-base); 
              text-decoration: none; 
              display: inline-block;
              box-shadow: var(--shadow-md);
            }
            
            .role-button:hover { 
              background: linear-gradient(145deg, var(--brand-primary-dark), var(--brand-primary));
              transform: translateY(-2px);
              box-shadow: var(--shadow-lg);
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
                <img src="/public/logo.jpg" alt="SnipShift Logo" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover;" />
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
        // General dashboard route
        app.get('/dashboard', (req, res) => {
            res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Dashboard - SnipShift</title>
          <style>
            :root {
              --steel-50: hsl(210, 40%, 98%);
              --steel-100: hsl(210, 40%, 96%);
              --steel-200: hsl(214, 32%, 91%);
              --steel-300: hsl(213, 27%, 84%);
              --steel-400: hsl(215, 20%, 65%);
              --steel-500: hsl(215, 16%, 47%);
              --steel-600: hsl(215, 19%, 35%);
              --steel-700: hsl(215, 25%, 27%);
              --steel-800: hsl(217, 33%, 17%);
              --steel-900: hsl(222, 84%, 5%);
              --red-accent: hsl(0, 84%, 60%);
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
              background: linear-gradient(135deg, var(--steel-100) 0%, var(--steel-200) 100%);
              min-height: 100vh;
              color: var(--steel-900);
            }
            .container { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
            .dashboard-card {
              background: linear-gradient(145deg, #ffffff 0%, #f8f8f8 50%, #ffffff 100%);
              border: 2px solid var(--steel-300);
              border-radius: 20px;
              padding: 48px;
              max-width: 600px;
              width: 100%;
              text-align: center;
              box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08), 0 16px 32px rgba(0, 0, 0, 0.08);
            }
            .welcome-icon { font-size: 4rem; margin-bottom: 24px; }
            h1 { font-size: 2.5rem; font-weight: 700; color: var(--steel-900); margin-bottom: 16px; }
            p { color: var(--steel-600); font-size: 1.125rem; line-height: 1.6; margin-bottom: 32px; }
            .btn { 
              background: linear-gradient(145deg, var(--red-accent), var(--red-accent-hover));
              color: white;
              border: none;
              padding: 16px 32px;
              border-radius: 12px;
              font-size: 1.125rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s ease;
              text-decoration: none;
              display: inline-block;
              margin: 0 8px;
            }
            .btn:hover { transform: translateY(-1px); }
            .btn-secondary {
              background: linear-gradient(145deg, var(--steel-200), var(--steel-300));
              color: var(--steel-800);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="dashboard-card">
              <div class="welcome-icon">🎉</div>
              <h1>Welcome to SnipShift!</h1>
              <p>Your professional marketplace dashboard is ready. Connect with opportunities, manage your profile, and grow your business in the barbering and creative industries.</p>
              
              <div style="margin-top: 32px;">
                <a href="/auth/role-selection" class="btn btn-secondary">Choose Different Role</a>
                <a href="/" class="btn">Explore Platform</a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `);
        });
        // Registration routes  
        app.get('/auth/register', (req, res) => {
            const role = req.query.role || '';
            // Return JSON response instead of HTML
            res.json({
                success: true,
                message: 'Registration endpoint available',
                role: role || 'any',
                redirectUrl: '/role-selection',
                availableRoles: ['professional', 'business']
            });
        });
        // Role selection route
        app.get('/auth/role-selection', (req, res) => {
            // Return JSON response instead of HTML
            res.json({
                success: true,
                message: 'Role selection endpoint available',
                availableRoles: [
                    {
                        id: 'professional',
                        title: 'I want to find shifts',
                        subtitle: 'Professional',
                        description: 'Barbers, stylists, and technicians looking for flexible work opportunities.',
                        icon: '👤'
                    },
                    {
                        id: 'business',
                        title: 'I want to offer shifts',
                        subtitle: 'Business',
                        description: 'Barbershops, salons, and businesses posting shifts and managing staff.',
                        icon: '🏪'
                    }
                ],
                redirectUrl: '/dashboard'
            });
        });
        // Login route
        app.get('/auth/login', (req, res) => {
            // Return JSON response instead of HTML
            res.json({
                success: true,
                message: 'Login endpoint available',
                redirectUrl: '/role-selection',
                supportedMethods: ['email', 'google'],
                endpoints: {
                    google: '/api/auth/google',
                    logout: '/api/auth/logout'
                }
            });
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
                const priceInfo = PRICE_CATALOG[priceId];
                if (!priceInfo) {
                    return res.status(400).json({
                        error: 'Invalid price ID',
                        code: 'INVALID_PRICE_ID'
                    });
                }
                const paymentIntentParams = {
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
                if (!stripe) {
                    return res.status(500).json({ error: 'Stripe not initialized' });
                }
                const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
                logger_1.logger.info('Payment intent created', {
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
            }
            catch (error) {
                logger_1.logger.error('Payment intent creation failed', {
                    error: error.message,
                    type: error.type,
                    code: error.code,
                    requestId: error.requestId,
                    stripeErrorCode: error.code
                });
                // Return user-safe error messages
                const errorResponse = {
                    error: 'Payment processing failed',
                    code: 'PAYMENT_ERROR'
                };
                if (error.type === 'StripeCardError') {
                    errorResponse.error = 'Your card was declined';
                    errorResponse.code = 'CARD_DECLINED';
                }
                else if (error.type === 'StripeRateLimitError') {
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
                const stripePriceId = SUBSCRIPTION_PLANS[planId];
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
                        if (!stripe) {
                            return res.status(500).json({ error: 'Stripe not initialized' });
                        }
                        customer = await stripe.customers.retrieve(customerId);
                    }
                    catch (error) {
                        logger_1.logger.warn('Customer not found, creating new customer', { customerId });
                        if (!stripe) {
                            return res.status(500).json({ error: 'Stripe not initialized' });
                        }
                        customer = await stripe.customers.create({
                            email: userEmail,
                            metadata: { service: 'snipshift_pro' }
                        });
                    }
                }
                else {
                    // Check for existing customer by email to prevent duplicates
                    if (!stripe) {
                        return res.status(500).json({ error: 'Stripe not initialized' });
                    }
                    const existingCustomers = await stripe.customers.list({
                        email: userEmail,
                        limit: 1
                    });
                    if (existingCustomers.data.length > 0) {
                        customer = existingCustomers.data[0];
                    }
                    else {
                        if (!stripe) {
                            return res.status(500).json({ error: 'Stripe not initialized' });
                        }
                        customer = await stripe.customers.create({
                            email: userEmail,
                            metadata: { service: 'snipshift_pro' }
                        });
                    }
                }
                const subscriptionParams = {
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
                if (!stripe) {
                    return res.status(500).json({ error: 'Stripe not initialized' });
                }
                const subscription = await stripe.subscriptions.create(subscriptionParams);
                logger_1.logger.info('Subscription created', {
                    id: subscription.id,
                    customerId: customer.id,
                    planId,
                    status: subscription.status
                });
                // Handle expanded latest_invoice properly
                const latestInvoice = subscription.latest_invoice;
                const clientSecret = latestInvoice?.payment_intent?.client_secret || undefined;
                res.json({
                    subscriptionId: subscription.id,
                    clientSecret,
                    customerId: customer.id,
                    status: subscription.status,
                    planId
                });
            }
            catch (error) {
                logger_1.logger.error('Subscription creation failed', {
                    error: error.message,
                    type: error.type,
                    code: error.code,
                    requestId: error.requestId
                });
                // Return user-safe error messages
                const errorResponse = {
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
                const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
                const ticket = await client.verifyIdToken({
                    idToken: credential,
                    audience: process.env.GOOGLE_CLIENT_ID,
                });
                const payload = ticket.getPayload();
                if (!payload || !payload.aud || payload.aud !== process.env.GOOGLE_CLIENT_ID) {
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
                logger_1.logger.info('Google auth successful', {
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
            }
            catch (error) {
                logger_1.logger.error('Google auth verification failed', {
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
        const verifySession = (req, res, next) => {
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
        app.get('/api/auth/profile', verifySession, (req, res) => {
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
        app.get('/', (_req, res) => {
            res.json({ status: 'ok', service: 'snipshift-api', uptime: process.uptime() });
        });
        // WebSocket server for subscriptions (dynamic import)
        let wsServer = null;
        if (process.env.ENABLE_WS !== 'false') {
            try {
                const { WebSocketServer } = await import('ws');
                const { useServer } = await import('graphql-ws/use/ws');
                wsServer = new WebSocketServer({
                    server: httpServer,
                    path: '/graphql',
                });
                useServer({
                    schema,
                    context: (ctx) => (0, context_1.context)({ req: ctx.extra.request }),
                    onConnect: () => { logger_1.logger.info('WebSocket client connected'); },
                    onDisconnect: () => { logger_1.logger.info('WebSocket client disconnected'); },
                }, wsServer);
                console.log('✅ WebSocket server initialized for GraphQL subscriptions');
            }
            catch (error) {
                console.log('⚠️ WebSocket server disabled (ws/graphql-ws not available)');
                wsServer = null;
            }
        }
        // Apollo Server setup
        console.log('[DEBUG] Creating Apollo Server...');
        const server = new server_1.ApolloServer({
            schema,
            // Security: Disable introspection and playground in production
            introspection: process.env.NODE_ENV !== 'production',
            plugins: [
                {
                    async serverWillStart() {
                        return {
                            async drainServer() {
                                if (wsServer) {
                                    wsServer.close();
                                }
                            },
                        };
                    },
                },
            ],
        });
        console.log('[DEBUG] Apollo Server created successfully');
        console.log('[DEBUG] Starting Apollo Server...');
        await server.start();
        console.log('[DEBUG] Apollo Server started successfully');
        // Apply Apollo middleware
        console.log('[DEBUG] Applying Apollo middleware to Express app...');
        app.use('/graphql', auth_1.authMiddleware, (0, express5_1.expressMiddleware)(server, {
            context: context_1.context,
        }));
        console.log('[DEBUG] Apollo middleware applied successfully');
        // Health check endpoints for Cloud Run deployment
        app.get('/health', (req, res) => {
            try {
                res.status(200).json({
                    status: 'ok',
                    timestamp: new Date().toISOString(),
                    service: 'snipshift-api'
                });
            }
            catch (error) {
                console.error('[ERROR] Health endpoint error:', error);
                res.status(500).json({
                    error: 'Internal Server Error',
                    message: 'Health check failed',
                    timestamp: new Date().toISOString()
                });
            }
        });
        // Root endpoint for Cloud Run health checks (some systems check /)
        app.get('/', (req, res) => {
            try {
                res.status(200).json({
                    status: 'ok',
                    message: 'SnipShift API is running',
                    timestamp: new Date().toISOString(),
                    service: 'snipshift-api',
                    port: PORT,
                    endpoints: {
                        graphql: '/graphql',
                        health: '/health'
                    }
                });
            }
            catch (error) {
                console.error('[ERROR] Root endpoint error:', error);
                res.status(500).json({
                    error: 'Internal Server Error',
                    message: 'Failed to process root request',
                    timestamp: new Date().toISOString()
                });
            }
        });
        // Error handling middleware
        console.log('[DEBUG] Setting up error handling middleware...');
        // Catch-all error handler
        app.use((err, req, res, next) => {
            console.error('[ERROR] Unhandled error:', err);
            console.error('[ERROR] Stack trace:', err.stack);
            logger_1.logger.error('Unhandled error in request', {
                error: err.message,
                stack: err.stack,
                url: req.url,
                method: req.method
            });
            if (!res.headersSent) {
                res.status(500).json({
                    error: 'Internal Server Error',
                    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
                    timestamp: new Date().toISOString()
                });
            }
        });
        app.use(errorHandler_1.errorHandler);
        console.log('[DEBUG] Error handling middleware configured');
        // 404 handler for any unmatched routes
        app.use((req, res) => {
            console.log(`[404] Route not found: ${req.method} ${req.originalUrl}`);
            res.status(404).json({
                error: 'Not Found',
                message: `Route ${req.method} ${req.originalUrl} not found`,
                timestamp: new Date().toISOString()
            });
        });
        // Cloud Run deployment: bind to process.env.PORT on 0.0.0.0
        // For Replit deployment, use port 4000 as configured in .replit
        const PORT = Number(process.env.PORT) || 4000;
        const HOST = '0.0.0.0'; // Always bind to all interfaces for containers
        console.log(`[DEBUG] Environment PORT: ${process.env.PORT}`);
        console.log(`[DEBUG] Final PORT: ${PORT}`);
        console.log(`[DEBUG] FINAL STEP: Attempting to start HTTP listener on ${HOST}:${PORT}...`);
        // Add error handling for the server listen
        httpServer.on('error', (error) => {
            console.error(`[SERVER ERROR] Failed to start server on ${HOST}:${PORT}:`, error);
            logger_1.logger.error('Server failed to start:', error);
            process.exit(1);
        });
        // Set a timeout for server startup
        const startupTimeout = setTimeout(() => {
            console.error(`[TIMEOUT] Server failed to start within 10 seconds on port ${PORT}`);
            process.exit(1);
        }, 10000);
        httpServer.listen(PORT, HOST, () => {
            clearTimeout(startupTimeout);
            console.log(`[SUCCESS] Server is running and listening on http://${HOST}:${PORT}`);
            console.log(`[SUCCESS] Server bound to port ${PORT} successfully`);
            console.log(`[SUCCESS] Server ready for requests on port ${PORT}`);
            logger_1.logger.info(`🚀 Server running on ${HOST}:${PORT}`);
            logger_1.logger.info(`📊 GraphQL endpoint: http://${HOST}:${PORT}/graphql`);
            logger_1.logger.info(`🔍 GraphQL Playground: http://${HOST}:${PORT}/graphql`);
            // Signal that the server is ready
            process.stdout.write(`\n[SERVER_READY] Port ${PORT} is now accepting connections\n`);
        });
        console.log('[DEBUG] HTTP server listen() call completed - server should be starting...');
    }
    catch (error) {
        console.error('[FATAL STARTUP ERROR] The application failed to start:', error);
        logger_1.logger.error('Failed to start server:', error);
        process.exit(1);
    }
}
// Main startup function with top-level error handling
async function main() {
    try {
        console.log('[DEBUG] Main startup function called');
        await startServer();
    }
    catch (error) {
        console.error('[FATAL MAIN ERROR] Unhandled error in main startup:', error);
        console.error('Error details:', error);
        process.exit(1);
    }
}
// Start the server
console.log('[DEBUG] Starting SnipShift API server...');
main();
