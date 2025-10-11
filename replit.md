# Overview

Snipshift is a production-ready B2B2C marketplace platform for the barbering, hairdressing, and creative industries. It connects Hub Owners (barbershops), Professionals (barbers/stylists), Brands (product companies), and Trainers (educators). The platform offers social networking, professional training monetization, a comprehensive job marketplace, real-time messaging, and content moderation.

The project maintains two implementations:
1.  **Original Architecture**: Production-ready web application launched at snipshift.com.au.
2.  **SnipShift 2.0**: Mobile-first modernized architecture with a unified GraphQL API, currently in development for scalability and international expansion.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Original Architecture (`client/`, `server/`, `shared/`)

### Frontend
-   **Framework**: React with TypeScript, Vite.
-   **Styling**: Tailwind CSS with shadcn/ui.
-   **State Management**: TanStack Query.
-   **Routing**: Wouter.
-   **Authentication**: Firebase Google OAuth and email/password.
-   **UI/UX**: Professional design, responsive, interactive map-based job search, multi-step forms, role-specific dashboards.

### Backend
-   **Runtime**: Node.js with Express.js.
-   **Language**: TypeScript.
-   **Storage**: In-memory for development, designed for future database integration.
-   **API Design**: RESTful with Zod for validation.

### Data Layer
-   **Database Schema**: Drizzle ORM with PostgreSQL definitions.
-   **Current Implementation**: Memory-based storage.
-   **Data Models**: Users (with roles), shifts/jobs, messages, social posts.
-   **Type Safety**: Shared TypeScript types.

## SnipShift 2.0 Architecture (`snipshift-next/`)

### Design Philosophy
-   **Primary Platform**: React Native mobile app.
-   **Web App**: Next.js (mobile-optimized).
-   **Unified API**: Single GraphQL endpoint.
-   **Offline-First**: Apollo Client.
-   **Real-Time**: WebSocket subscriptions.

### GraphQL API Backend (`api/`)
-   **Runtime**: Node.js 18+ with TypeScript.
-   **GraphQL Server**: Apollo Server 4.
-   **Database**: PostgreSQL with Drizzle ORM.
-   **Caching**: Redis.
-   **Authentication**: JWT-based with role-based permissions.
-   **File Storage**: Cloud storage integration.

### Mobile Application (`mobile/`)
-   **Framework**: React Native with Expo.
-   **Navigation**: React Navigation v6.
-   **State Management**: Apollo Client + React Context.
-   **UI Components**: React Native Paper.
-   **Authentication**: Secure token storage.

### Web Application (`web/`)
-   **Framework**: Next.js 14 with App Router.
-   **Styling**: Tailwind CSS with Material-UI.
-   **Data Fetching**: Apollo Client with SSR.
-   **Authentication**: NextAuth.js.

### Infrastructure & DevOps
-   **Containerization**: Docker, Docker Compose.
-   **CI/CD**: GitHub Actions.
-   **Database**: PostgreSQL (primary), Redis (caching).

### Data Layer
-   **Primary Database**: PostgreSQL with Drizzle ORM.
-   **Caching**: Redis.
-   **Schema**: Multi-role user system, job marketplace, social features, training content.
-   **File Storage**: Cloud storage integration.

## Technical Implementations & Features (Across Architectures)
-   **Job Posting System**: Comprehensive job creation for Hub owners.
-   **Trainer Dashboard & Content Hub**: For uploading and monetizing training content.
-   **Brand Dashboard & Social Marketing**: Brand management, social post creation, discount codes.
-   **Social Feed System**: Community feed with approved content.
-   **Training Hub Marketplace**: Video-based learning platform.
-   **Content Moderation System**: Admin panel for content review.
-   **Messaging System**: Real-time in-app messaging.
-   **Dashboards**: Role-specific dashboards.
-   **Job Feed**: Advanced job search.
-   **User Profiles**: Role-specific profiles with portfolio management.
-   **Notifications**: Real-time system.
-   **Design System**: Black & Chrome with charcoal grays, steel tones, and red accents.
-   **Testing**: Comprehensive E2E testing with Cypress.
-   **Deployment**: Production deployment at snipshift.com.au.
-   **CI/CD Pipeline**: GitHub Actions for automation.

# External Dependencies

## Core Framework Dependencies
-   **React Ecosystem**: React 18.
-   **Build Tools**: Vite, esbuild, TypeScript.
-   **Styling**: Tailwind CSS, PostCSS, Autoprefixer.

## UI Component Library
-   **shadcn/ui**: Built on Radix UI.
-   **Radix UI**: Headless UI components.
-   **Lucide React**: Icon library.

## Backend Services
-   **Express.js**: Web server framework.
-   **Nodemailer**: Email service.
-   **Zod**: Schema validation.

## Database & ORM
-   **Drizzle ORM**: Type-safe SQL query builder.
-   **Neon Database**: Serverless PostgreSQL (for future use).
-   **@neondatabase/serverless**: Database connection driver.

## Development Tools
-   **TanStack Query**: Server state management.
-   **date-fns**: Date manipulation.
-   **Class Variance Authority**: CSS class variant utility.
-   **clsx & tailwind-merge**: Conditional className utilities.