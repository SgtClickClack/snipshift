# SnipShift Architecture Documentation

## Overview

SnipShift is a comprehensive platform connecting beauty professionals with salons, barbershops, and spas for flexible work opportunities. The application is built with a modern, scalable architecture supporting both web and mobile interfaces.

## System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (React/Next)  │◄──►│   (Express.js)  │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CDN/Static    │    │   File Storage  │    │   Redis Cache   │
│   Assets        │    │   (Firebase)    │    │   (Optional)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

#### Frontend
- **Framework**: React 18 with Next.js 13
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React Context API + React Query
- **UI Components**: Custom component library based on Radix UI
- **Build Tool**: Vite for development, Next.js for production
- **Testing**: Jest + React Testing Library + Playwright

#### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Authentication**: Custom JWT + Session-based auth
- **Database ORM**: Drizzle ORM
- **Validation**: Zod schemas
- **Logging**: Winston with structured logging
- **Testing**: Jest + Supertest

#### Database
- **Primary**: PostgreSQL (Neon)
- **Caching**: Redis (optional)
- **File Storage**: Firebase Storage
- **Search**: PostgreSQL full-text search

## Directory Structure

```
snipshift/
├── server/                 # Backend API server
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # Main API routes
│   ├── middleware/         # Express middleware
│   ├── utils/             # Utility functions
│   ├── types/             # Server-specific types
│   └── storage/           # Data access layer
├── snipshift-next/        # Frontend application
│   └── web/src/
│       ├── components/    # React components
│       ├── pages/         # Page components
│       ├── contexts/      # React contexts
│       ├── hooks/         # Custom hooks
│       ├── lib/           # Utility libraries
│       └── types/         # TypeScript types
├── shared/                # Shared code between frontend/backend
│   ├── types/             # Shared TypeScript types
│   ├── schemas/           # Zod validation schemas
│   └── firebase-schema/   # Firebase type definitions
├── cypress/               # E2E tests
└── tests/                 # Unit and integration tests
```

## Core Components

### 1. Authentication System

**Location**: `server/utils/auth.ts`, `contexts/AuthContext.tsx`

**Features**:
- Email/password authentication
- Google OAuth integration
- Role-based access control (Professional, Business, Admin)
- Session management with secure cookies
- Password hashing with bcrypt

**Key Functions**:
- `hashPassword()` - Securely hash passwords
- `verifyPassword()` - Verify password against hash
- `validatePasswordStrength()` - Enforce password requirements
- `sanitizeForLogging()` - Remove sensitive data from logs

### 2. Data Access Layer

**Location**: `server/hybrid-storage.ts`, `server/database-storage.ts`

**Architecture**:
- Hybrid storage system supporting both database and in-memory storage
- Automatic fallback to in-memory storage for development
- Type-safe database operations with Drizzle ORM
- Connection pooling and error handling

**Key Classes**:
- `HybridStorage` - Main storage interface
- `DatabaseStorage` - PostgreSQL implementation
- `MemStorage` - In-memory storage for development

### 3. API Layer

**Location**: `server/routes.ts`, `server/firebase-routes.ts`

**Features**:
- RESTful API design
- Comprehensive error handling with standardized responses
- Rate limiting and security middleware
- Request validation with Zod schemas
- Structured logging for all operations

**Key Endpoints**:
- `/api/auth/*` - Authentication endpoints
- `/api/users/*` - User management
- `/api/jobs/*` - Job/shift management
- `/api/applications/*` - Application handling
- `/api/social-feed/*` - Social features

### 4. Frontend Architecture

**Location**: `snipshift-next/web/src/`

**Key Components**:
- **Pages**: `pages/` - Route-level components
- **Components**: `components/` - Reusable UI components
- **Contexts**: `contexts/` - Global state management
- **Hooks**: `hooks/` - Custom React hooks
- **Lib**: `lib/` - Utility functions and services

**State Management**:
- React Context for global state (auth, notifications)
- React Query for server state management
- Local state with useState/useReducer

### 5. Design System

**Location**: `components/ui/`, `lib/design-tokens.ts`

**Components**:
- `StandardButton` - Consistent button variants
- `LoadingButton` - Buttons with loading states
- `SkeletonLoaders` - Loading placeholders
- Design tokens for spacing, colors, typography

## Security Features

### 1. Authentication Security
- Password hashing with bcrypt (12 salt rounds)
- Secure session management
- CSRF protection
- Rate limiting on auth endpoints

### 2. API Security
- Input validation with Zod schemas
- SQL injection prevention with parameterized queries
- XSS protection with content sanitization
- CORS configuration
- Security headers with Helmet.js

### 3. Data Protection
- Sensitive data sanitization in logs
- Environment variable protection
- Secure cookie configuration
- HTTPS enforcement in production

## Performance Optimizations

### 1. Frontend Performance
- Code splitting with React.lazy()
- Image optimization with Next.js Image component
- Bundle size optimization
- Skeleton loaders for better perceived performance
- React Query caching for API responses

### 2. Backend Performance
- Database connection pooling
- Query optimization with proper indexing
- Response caching for read-heavy endpoints
- Compression middleware
- Efficient error handling

### 3. Database Performance
- Proper indexing on frequently queried columns
- Query optimization
- Connection pooling
- Prepared statements for security and performance

## Testing Strategy

### 1. Unit Tests
- **Location**: `tests/unit/`
- **Framework**: Jest + React Testing Library
- **Coverage**: Utils, components, hooks
- **Target**: 80%+ code coverage

### 2. Integration Tests
- **Location**: `tests/integration/`
- **Framework**: Jest + Supertest
- **Coverage**: API endpoints, database operations
- **Focus**: Critical business logic paths

### 3. End-to-End Tests
- **Location**: `cypress/e2e/`
- **Framework**: Cypress
- **Coverage**: Complete user journeys
- **Focus**: Authentication, job application flow

### 4. Visual Testing
- **Framework**: Playwright
- **Coverage**: Cross-browser compatibility
- **Focus**: UI consistency across devices

## Deployment Architecture

### 1. Development Environment
- Local development with hot reload
- In-memory storage for rapid iteration
- Comprehensive logging and debugging

### 2. Production Environment
- Containerized deployment with Docker
- Database connection pooling
- CDN for static assets
- Monitoring and alerting
- Automated backups

### 3. CI/CD Pipeline
- Automated testing on pull requests
- Code quality checks with ESLint
- Security scanning
- Automated deployment to staging/production

## Monitoring and Logging

### 1. Application Logging
- Structured logging with Winston
- Log levels: debug, info, warn, error
- Contextual information in all logs
- Sensitive data sanitization

### 2. Error Tracking
- Comprehensive error boundaries
- Stack trace capture
- User-friendly error messages
- Error reporting to monitoring service

### 3. Performance Monitoring
- API response time tracking
- Database query performance
- Frontend performance metrics
- User experience monitoring

## Future Enhancements

### 1. Scalability Improvements
- Microservices architecture
- Horizontal scaling with load balancers
- Database sharding
- Caching layer with Redis

### 2. Feature Enhancements
- Real-time messaging with WebSockets
- Advanced search with Elasticsearch
- Mobile app with React Native
- AI-powered job matching

### 3. Developer Experience
- Enhanced development tools
- Automated code generation
- Improved testing infrastructure
- Better documentation and onboarding

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Development Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Start development server: `npm run dev`
5. Run tests: `npm test`

### Production Deployment
1. Build the application: `npm run build`
2. Set up production environment variables
3. Deploy to your hosting platform
4. Configure monitoring and logging

## Contributing

### Code Standards
- TypeScript strict mode enabled
- ESLint configuration enforced
- Prettier for code formatting
- Conventional commit messages

### Development Workflow
1. Create feature branch
2. Write tests for new functionality
3. Implement feature
4. Run test suite
5. Submit pull request
6. Code review and merge

This architecture provides a solid foundation for the SnipShift platform, ensuring scalability, maintainability, and security while supporting rapid development and deployment.
