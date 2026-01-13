# HospoGo

> The Gig Economy Platform for Hospitality Professionals

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/hospogo/hospogo)
[![License](https://img.shields.io/badge/license-Private-red.svg)](LICENSE)

HospoGo is a marketplace platform that connects hospitality venues with talented professionals seeking flexible work opportunities. Built for the gig economy, HospoGo empowers bartenders, waitstaff, baristas, and other hospitality professionals to work on their own terms while helping venues find qualified talent quickly and efficiently.

## ✨ Features

### 🎯 Core Capabilities

- **Job Marketplace** - Post, browse, and apply for flexible work opportunities
- **Real-time Messaging** - Built-in chat system for seamless communication
- **Payment Processing** - Secure Stripe integration for transactions
- **Review System** - Rate and review completed work
- **Multi-Role Support** - Dashboards for Professionals, Business Owners, Hubs, Brands, and Trainers
- **User Onboarding** - Streamlined 4-step wizard for new users
- **PWA Support** - Installable progressive web app experience

### 🛠️ Technical Features

- **Real-time Updates** - Firebase-powered live notifications and messaging
- **Image Upload** - Firebase Storage integration for profile photos and job images
- **Email Notifications** - Resend integration for transactional emails
- **SEO Optimized** - React Helmet with Open Graph tags
- **Analytics** - Vercel Analytics and Speed Insights
- **Mobile Responsive** - Fully optimized for all device sizes

## 📚 Documentation

- [API Reference](docs/API_REFERENCE.md) - Complete API endpoint documentation
- [Go-Live Checklist](docs/GO_LIVE_CHECKLIST.md) - Production launch verification checklist
- [Docker Deployment Guide](docs/DOCKER_DEPLOYMENT.md) - Production deployment with Docker
- [Email Setup Guide](docs/EMAIL_SETUP.md) - Configure Resend for transactional emails
- [Data Seeding](api/scripts/README.md) - Pre-fill calendars with sample data

## 🏗️ Tech Stack

### Frontend
- **React 18** - Modern UI library
- **Vite** - Fast build tool and dev server
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **React Router** - Client-side routing
- **TanStack Query** - Data fetching and caching

### Backend
- **Express.js** - RESTful API server (Node.js)
- **PostgreSQL** - Relational database
- **Drizzle ORM** - Type-safe database queries
- **Firebase Auth** - Authentication and user management
- **Firebase Storage** - File storage

### Services
- **Stripe Connect** - Payment processing and marketplace payments
- **Resend** - Transactional emails
- **Vercel** - Hosting and deployment
- **Playwright** - End-to-end testing

## 🏛️ Architecture

```
┌─────────────┐
│   Frontend  │  React/Vite (Port 5173)
│  (Client)   │
└──────┬──────┘
       │ HTTP/REST
       │ Authorization: Bearer <token>
       ▼
┌─────────────┐
│     API     │  Express/Node.js (Port 5000)
│  (Backend)  │
└──────┬──────┘
       │ SQL Queries
       │ Drizzle ORM
       ▼
┌─────────────┐
│  PostgreSQL │  Database
│  (Database) │
└─────────────┘
```

**External Services:**
- **Firebase** - Authentication & File Storage
- **Stripe** - Payment Processing
- **Resend** - Email Delivery

## 🚀 Getting Started

### Prerequisites

- Node.js 22.x and npm
- PostgreSQL database
- Firebase project (for authentication and storage)
- Stripe account (for payments)
- Resend account (for emails)

## 🗂️ Project Structure

- **`src/pages/`**: Route-level pages (each file is a top-level view mounted by React Router).
- **`src/components/`**: Reusable UI + domain components organized by feature area (e.g. `layout/`, `landing/`, `theme/`, `shifts/`, `payments/`, and `ui/` for shadcn/ui primitives).
- **`api/`**: Express backend (routes, services, repositories, DB schema/migrations) and supporting scripts.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/hospogo/hospogo.git
   cd hospogo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_URL=postgresql://user:password@localhost:5432/hospogo

   # Firebase
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id

   # Stripe
   VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_SECRET_KEY=your_stripe_secret_key

   # Resend
   RESEND_API_KEY=your_resend_api_key

   # API
   PORT=5000
   NODE_ENV=development
   ```

4. **Run database migrations**
   ```bash
   cd api
   npm run migrate:onboarding
   ```

5. **Seed subscription plans (optional)**
   ```bash
   cd api
   npm run seed:plans
   ```

6. **Start the development server**
   
   Frontend only:
   ```bash
   npm run dev
   ```

   To run both frontend and backend together:
   ```bash
   npm run dev:all
   ```
   
   Or run them separately:
   ```bash
   # Terminal 1: Frontend
   npm run dev
   
   # Terminal 2: Backend
   cd api && npm start
   ```

   The app will be available at:
   - Frontend: `http://localhost:5173`
   - API: `http://localhost:5000`

## 📜 Available Scripts

### Frontend Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Testing Scripts
- `npm run test:e2e` - Run Playwright E2E tests
- `npm run test:e2e:ui` - Run tests with UI mode
- `npm run test:e2e:headed` - Run tests in headed browser
- `npm run test:e2e:debug` - Debug tests

### Backend Scripts (in `api/` directory)
- `npm run start` - Start API server
- `npm run migrate:onboarding` - Run database migration
- `npm run seed:plans` - Seed subscription plans

## 📁 Project Structure

```
hospogo/
├── api/                    # Backend API server
│   ├── _src/
│   │   ├── db/            # Database schema and migrations
│   │   ├── routes/        # API routes
│   │   ├── repositories/  # Data access layer
│   │   ├── services/      # Business logic
│   │   └── middleware/    # Express middleware
│   └── package.json
├── src/                    # Frontend React application
│   ├── components/        # React components
│   │   ├── ui/           # Reusable UI components
│   │   ├── auth/         # Authentication components
│   │   ├── layout/       # Layout components
│   │   └── ...
│   ├── pages/            # Page components
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities and helpers
│   └── App.tsx           # Main app component
├── tests/                 # E2E tests
├── e2e/                   # Additional E2E tests
├── package.json
└── README.md
```

## 🔐 Environment Variables

See the [Getting Started](#getting-started) section for required environment variables. Make sure to set up all services before running the application.

## 🧪 Testing

Run end-to-end tests with Playwright:

```bash
npm run test:e2e
```

For interactive testing:

```bash
npm run test:e2e:ui
```

## 🚢 Deployment

For production deployment instructions, see [Docker Deployment Guide](docs/DOCKER_DEPLOYMENT.md).

### Quick Deployment Options

**Docker (Recommended for Production)**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

**Vercel Deployment**
1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to `main` branch

The `vercel-build` script is configured for Vercel's build process.

### Database Migrations

Run migrations before deploying:

```bash
cd api
npm run migrate
```

**Note:** In production, ensure the `pgcrypto` extension is enabled in PostgreSQL for UUID generation.

## 📄 License

This project is private and proprietary. All rights reserved.

## 🤝 Contributing

This is a private project. For questions or support, please contact the development team.

## 📞 Support

- **Email:** support@hospogo.com
- **Documentation:** See `/docs` directory (if available)
- **Issues:** Contact the development team

## 🎉 Acknowledgments

Built with modern web technologies and best practices. Special thanks to the open-source community for the amazing tools and libraries that made this project possible.

---

**HospoGo v1.0.0** - Ready for production 🚀

