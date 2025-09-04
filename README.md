# Snipshift - B2B2C Marketplace Platform

A comprehensive marketplace platform connecting the barbering and creative industries through advanced geospatial networking and job discovery features.

## 🚀 Overview

Snipshift is a production-ready B2B2C marketplace that connects four user types:
- **Hub Owners** (barbershops) - Post jobs and manage teams
- **Professionals** (barbers/stylists) - Find opportunities and showcase skills
- **Brands** (product companies) - Promote products to professional community
- **Trainers** (educators) - Monetize training content and expertise

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling and development server
- **Tailwind CSS** with shadcn/ui components
- **TanStack Query** for server state management
- **Wouter** for client-side routing
- **React Hook Form** with Zod validation

### Backend
- **Node.js** with Express.js
- **TypeScript** with ES modules
- **Firebase Authentication** (Google OAuth + Email/Password)
- **Drizzle ORM** with PostgreSQL schema
- **Express Rate Limit** for API protection

### Development & Deployment
- **Vite** development server with HMR
- **esbuild** for server bundling
- **Playwright** & **Cypress** for E2E testing
- **GitHub Actions** CI/CD pipeline
- **VentraIP hosting** with Node.js support

## 🔧 Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project with Authentication enabled
- Google Maps API key

### Environment Variables
Create a `.env` file in the root directory (do not commit it):

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_FIREBASE_PROJECT_ID=your_project_id

# Google Services
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_GOOGLE_REDIRECT_URI=https://www.snipshift.com.au/oauth/callback
VITE_GOOGLE_MAPS_API_KEY=your_maps_api_key

# Production Settings
NODE_ENV=production
PORT=3000
SESSION_SECRET=replace_with_strong_secret
DATABASE_URL=postgres://user:pass@host:5432/dbname
```

### Development Setup

1. **Install Dependencies**
```bash
npm install
```

2. **Start Development Server**
```bash
npm run dev
```

3. **Access Application**
- Development: http://localhost:5000
- API endpoints: http://localhost:5000/api/*

### Production Build

1. **Create Production Build**
```bash
npm run build
```

2. **Preview Production Build**
```bash
npm run start
```

3. **Deploy Production Package**
```bash
# Production files will be in dist/ directory
# Upload dist/ contents to your hosting provider
```

## 📁 Project Structure

```
snipshift/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Route-level components
│   │   ├── lib/           # Utilities and services
│   │   └── hooks/         # Custom React hooks
│   └── index.html         # Entry HTML file
├── server/                # Backend Express application
│   ├── middleware/        # Security and validation middleware
│   ├── firebase-routes.ts # API route handlers
│   └── index.ts          # Server entry point
├── shared/               # Shared TypeScript types
├── tests/               # E2E test suites
├── cypress/            # Cypress test configuration
└── dist/              # Production build output
```

## 🚀 Available Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Create production build
npm run preview      # Preview production build locally
```

### Testing
```bash
npm run test:e2e     # Run Cypress E2E tests
npm run test:playwright # Run Playwright tests
npm run test:ci      # Run tests in CI environment
```

### Deployment
```bash
npm run build        # Build for production
npm run start        # Start production server
```

## 🔐 Security Features

### Production Security
- **Rate Limiting**: 100 API requests per 15 minutes
- **Authentication Rate Limiting**: 5 login attempts per 15 minutes  
- **Input Sanitization**: XSS protection with HTML tag stripping
- **Security Headers**: CSP, XSS protection, clickjacking prevention
- **Role-Based Access Control**: Hub, Professional, Brand, Trainer permissions

### Performance Optimizations
- **Code Splitting**: 36% bundle size reduction (625KB → 399KB)
- **Lazy Loading**: 35+ components load on-demand
- **Compression**: Gzip compression for all responses
- **Caching**: Browser caching for static assets

## 🎯 Key Features

### Core Functionality
- **Multi-Role Authentication**: Firebase Google OAuth + Email/Password
- **Job Marketplace**: Advanced posting, search, and application system
- **Social Networking**: Community feeds and professional connections
- **Real-Time Messaging**: In-app communication system
- **Training Hub**: Content monetization and educational marketplace
- **Analytics Dashboards**: Business insights for all user roles

### User Experience
- **Interactive Tutorials**: Role-specific onboarding flows
- **Feedback System**: Real-time user feedback collection
- **Mobile Responsive**: Optimized for all device sizes
- **Professional Design**: Black & Chrome design system

## 🧩 Multi-Role User Model

Snipshift supports multiple roles per user, enabling seamless switching between role-specific dashboards and features.

- Stored as: `roles: ("hub" | "professional" | "brand" | "trainer" | "client")[]`
- Active context: `currentRole: "hub" | "professional" | "brand" | "trainer" | "client" | null`

### Role Management Endpoints

- `PATCH /api/users/:id/roles` — Add/remove roles
  - Body: `{ action: "add" | "remove", role: "hub" | "professional" | "brand" | "trainer" | "client" }`
- `PATCH /api/users/:id/current-role` — Set the active role
  - Body: `{ role: "hub" | "professional" | "brand" | "trainer" | "client" }`

### Client APIs

- Auth Context exposes:
  - `setCurrentRole(role)` — updates local state and can be paired with the API call
  - `hasRole(role)` — convenience checker

### UI

- Role Selection: multi-select onboarding at `role-selection`
- Role Switcher: navbar dropdown to switch `currentRole` at any time

## 🌐 Deployment

### VentraIP Hosting Setup
1. Upload production build to cPanel File Manager
2. Configure Node.js app to point to `dist/index.js`
3. Set environment variables in cPanel
4. Configure DNS records for www.snipshift.com.au

### CI/CD Pipeline
- **GitHub Actions** workflows for automated testing and deployment
- **Multi-environment support** (staging, production)
- **Security scanning** and vulnerability detection
- **Parallel job execution** for optimized build times

## 📊 Analytics & Monitoring

### Business Analytics
- **Hub Analytics**: Job performance, team metrics, application rates
- **Brand Analytics**: Post engagement, reach, conversion tracking
- **Trainer Analytics**: Content views, student enrollment, revenue
- **Performance Metrics**: Loading times, user engagement, feature usage

### Security Monitoring
- **Rate Limit Tracking**: Monitor API abuse attempts
- **Security Logs**: Track authentication and access attempts
- **Role Permission Audits**: Ensure access control integrity

## 🔄 Development Workflow

### Code Standards
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code quality and consistency
- **Prettier**: Automated code formatting
- **Component Testing**: Data-testid attributes for E2E testing

### Git Workflow
- **Main Branch**: Production-ready code
- **Feature Branches**: Development and testing
- **Pull Requests**: Code review and CI checks
- **Automated Testing**: E2E tests run on all PRs

## 📞 Support & Documentation

### Additional Documentation
- `DEPLOYMENT_STEPS.md` - Detailed deployment instructions
- `PERFORMANCE_OPTIMIZATION.md` - Code splitting and optimization guide
- `LAUNCH_ENHANCEMENTS.md` - Security and UX enhancement details
- `roadmap.md` - 24-month strategic development plan

### API Documentation
- Authentication endpoints: `/api/auth/*`
- User management: `/api/users/*`
- Job marketplace: `/api/jobs/*`
- Messaging system: `/api/chats/*`
- Social features: `/api/posts/*`

---

## 📈 Current Status

**Production Ready** - Deployed at www.snipshift.com.au  
**Version**: 1.0.0  
**Launch**: September 2025  
**Status**: ✅ MVP Complete, ✅ E2E Tested, ✅ Security Hardened, ✅ Performance Optimized

Built with ❤️ for the barbering and creative industries.