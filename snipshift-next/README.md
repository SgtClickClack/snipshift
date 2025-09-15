# SnipShift 2.0 - Modernized Architecture

## 🚀 Quick Start with Docker

SnipShift is now fully containerized! Get the entire stack running locally in minutes:

```bash
# Clone the repository
git clone <repository-url>
cd snipshift-next

# Copy environment configuration
cp env.example .env

# Start all services
make setup

# Or manually:
docker-compose up -d
```

**Access Points:**
- 🌐 **Web App**: http://localhost:3000
- 📊 **GraphQL API**: http://localhost:4000/graphql
- 🐘 **Database**: localhost:5432 (user: snipshift)
- 🔴 **Redis**: localhost:6379
- 🗄️ **pgAdmin**: http://localhost:5050

## 📋 Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- Git

## 🔧 Development Setup

### Option 1: Docker Compose (Recommended)

```bash
# Start all services
make docker-up

# View logs
make docker-logs

# Stop services
make docker-down
```

### Option 2: Local Development

```bash
# Install dependencies
make install

# Start individual services
make api-dev    # Terminal 1
make web-dev    # Terminal 2
# Mobile: cd mobile && npm start  # Terminal 3
```

## 🏗️ Architecture Overview

### Tech Stack
- **Backend**: Node.js + TypeScript + Apollo GraphQL + PostgreSQL + Redis
- **Frontend**: Next.js + Material-UI + Apollo Client
- **Mobile**: React Native + Expo + React Native Paper
- **Infrastructure**: Docker + Docker Compose + GitHub Actions
- **Database**: PostgreSQL with Drizzle ORM
- **Caching**: Redis for sessions and data caching

### Services
- **API**: GraphQL API server (Port 4000)
- **Web**: Next.js web application (Port 3000)
- **PostgreSQL**: Primary database (Port 5432)
- **Redis**: Cache and session store (Port 6379)
- **pgAdmin**: Database management (Port 5050)

## 🚀 Development Workflow

### Daily Development

```bash
# Start development environment
make dev

# Run tests
make test

# Format code
make format

# Type checking
make typecheck
```

### Database Operations

```bash
# Generate database client
make db-generate

# Run migrations
make db-migrate

# Open database studio
make db-studio
```

### Docker Operations

```bash
# View service logs
make logs-api
make logs-web

# Access service shells
make shell-api
make shell-db

# Restart services
make docker-restart

# Clean up
make docker-clean
```

## 🔧 Configuration

### Environment Variables

Copy `env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL=postgresql://snipshift:snipshift_password@localhost:5432/snipshift

# JWT & Authentication
JWT_SECRET=your-super-secret-jwt-key
SESSION_SECRET=your-session-secret

# API Configuration
PORT=4000
NODE_ENV=development

# External Services (Optional)
GOOGLE_CLIENT_ID=your-google-oauth-client-id
STRIPE_SECRET_KEY=your-stripe-secret-key
```

### Service Configuration

Each service can be configured independently:

- **API**: `api/src/config/` - Database, Redis, JWT settings
- **Web**: `web/` - API endpoints, environment variables
- **Mobile**: `mobile/` - API URLs, authentication settings

## 🧪 Testing

### Running Tests

```bash
# Test all services
make test

# Test individual services
make test-api
make test-web

# With coverage
npm run test:coverage
```

### Test Structure

- **API Tests**: `api/tests/` - Unit and integration tests
- **Web Tests**: `web/` - Component and integration tests
- **Mobile Tests**: `mobile/` - Component and integration tests

## 🚀 Deployment

### Local Deployment

```bash
# Build all services
make build

# Deploy locally
make docker-up
```

### CI/CD Pipeline

GitHub Actions automatically:

1. **CI Pipeline** (`ci.yml`):
   - Installs dependencies
   - Runs linters and type checks
   - Executes test suites
   - Builds Docker images

2. **CD Pipeline** (`cd.yml`):
   - Pushes images to GitHub Container Registry
   - Deploys to staging/production
   - Runs database migrations
   - Health checks

### Production Deployment

The CD pipeline supports:

- **Staging**: Automatic deployment on `main` branch pushes
- **Production**: Manual deployment with approval
- **Rollback**: Automatic rollback on deployment failures

## 🔍 Monitoring & Debugging

### Health Checks

```bash
# Check all services
make health

# Individual service checks
curl http://localhost:4000/health
curl http://localhost:3000/api/health
```

### Logs

```bash
# View all logs
make docker-logs

# Service-specific logs
make logs-api
make logs-web

# Database logs
docker-compose logs postgres
```

### Database Access

```bash
# Access PostgreSQL shell
make shell-db

# Open pgAdmin
# Visit: http://localhost:5050
# Email: admin@snipshift.com
# Password: admin123
```

## 🐛 Troubleshooting

### Common Issues

#### Services Won't Start
```bash
# Check Docker status
docker ps

# View service logs
make docker-logs

# Restart services
make docker-restart
```

#### Database Connection Issues
```bash
# Check database health
docker-compose exec postgres pg_isready -U snipshift

# Reset database
make docker-clean
make docker-up
```

#### Port Conflicts
```bash
# Check what's using ports
lsof -i :4000
lsof -i :3000

# Change ports in docker-compose.yml or .env
```

#### Permission Issues
```bash
# Fix Docker permissions on Linux
sudo chown -R $USER:$USER ~/.docker
```

### Development Tips

- Use `make dev` for hot-reloading development
- Check logs with `make docker-logs` for debugging
- Use `make shell-api` to access running containers
- Database changes require `make db-migrate`

## 📊 Current Architecture Analysis

### Issues Identified

1. **Architecture Inconsistency**: Dual schema systems (PostgreSQL + Firebase) without clear separation
2. **Mobile Readiness**: Web-first design, not optimized for mobile-first approach
3. **Data Management**: In-memory storage implementations instead of proper database integration
4. **API Structure**: Mixed REST and Firebase-style endpoints without unified API layer
5. **Scalability**: No proper caching, background job processing, or microservices consideration
6. **State Management**: Frontend state management could be better optimized for mobile

### Business Goals
- Multi-role marketplace for barbering/creative industries
- Job marketplace, social networking, training content monetization
- Mobile app development for iOS/Android
- International expansion and industry diversification

---

## 🏗️ New Architecture Overview

### Core Principles
- **Mobile-First Design**: All features designed for mobile experience first
- **API-First Approach**: GraphQL API as single source of truth
- **Microservices Architecture**: Modular, independently deployable services
- **Real-Time Capabilities**: WebSocket subscriptions for live updates
- **Offline-First**: Progressive Web App capabilities

### Technology Stack

#### Backend (GraphQL API)
- **Framework**: Node.js + TypeScript + Apollo Server
- **Database**: PostgreSQL + Drizzle ORM (primary) + Redis (caching)
- **Authentication**: JWT + Firebase Auth (Google OAuth)
- **File Storage**: Google Cloud Storage
- **Real-Time**: WebSocket + Apollo Subscriptions
- **Payments**: Stripe Connect

#### Mobile Application
- **Framework**: React Native + Expo
- **Navigation**: React Navigation v6
- **State Management**: Apollo Client + React Query
- **UI Components**: React Native Paper
- **Maps**: React Native Maps
- **Notifications**: Expo Notifications

#### Web Application
- **Framework**: Next.js 13+ (App Router)
- **Styling**: Material-UI v5
- **State Management**: Apollo Client + React Query
- **Real-Time**: WebSocket subscriptions
- **PWA**: Service Worker + Offline support

#### Infrastructure
- **Containerization**: Docker + Kubernetes
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana
- **Logging**: Winston + ELK Stack
- **Caching**: Redis Cluster

---

## 📁 Project Structure

```
snipshift-next/
├── api/                          # GraphQL API Backend
│   ├── src/
│   │   ├── config/              # Database, Redis, Firebase config
│   │   ├── database/            # Drizzle schema & migrations
│   │   ├── graphql/             # GraphQL schema, resolvers, context
│   │   ├── middleware/          # Auth, rate limiting, validation
│   │   ├── services/            # Business logic services
│   │   ├── models/              # Data access layer
│   │   └── utils/               # Helpers & utilities
│   ├── tests/                   # API tests
│   └── package.json
│
├── mobile/                       # React Native App
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── screens/             # Screen components
│   │   ├── navigation/          # Navigation configuration
│   │   ├── contexts/            # React contexts (Auth, Theme, etc.)
│   │   ├── services/            # API client, storage, etc.
│   │   ├── config/              # App configuration
│   │   └── utils/               # Helpers & utilities
│   ├── assets/                  # Images, fonts, etc.
│   ├── app.json                 # Expo configuration
│   └── package.json
│
├── web/                          # Next.js Web App
│   ├── app/                     # Next.js app directory
│   │   ├── (auth)/              # Authentication routes
│   │   ├── (dashboard)/         # Protected dashboard routes
│   │   └── api/                 # API routes (proxies to GraphQL API)
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── contexts/            # React contexts
│   │   ├── services/            # API client, utilities
│   │   ├── config/              # App configuration
│   │   └── styles/              # Global styles
│   └── package.json
│
├── shared/                       # Shared TypeScript types
│   ├── types/                   # TypeScript interfaces
│   ├── utils/                   # Shared utilities
│   └── constants/               # Shared constants
│
├── infrastructure/               # Infrastructure as Code
│   ├── docker/                  # Docker configurations
│   ├── k8s/                     # Kubernetes manifests
│   └── monitoring/              # Monitoring configurations
│
└── docs/                        # Documentation
    ├── api/                     # API documentation
    ├── mobile/                  # Mobile app guides
    └── deployment/              # Deployment guides
```

---

## 🔄 Migration Strategy

### Phase 1: Foundation (Weeks 1-4)

#### Week 1: API Foundation
- [ ] Set up GraphQL API with Apollo Server
- [ ] Implement authentication (JWT + Google OAuth)
- [ ] Create database schema with Drizzle ORM
- [ ] Set up Redis for caching and sessions
- [ ] Basic user registration and login

#### Week 2: Core Data Models
- [ ] Implement user management with multi-role support
- [ ] Create job posting and application system
- [ ] Set up social post functionality
- [ ] Implement training content management
- [ ] Add chat/messaging system

#### Week 3: Business Logic
- [ ] Implement job matching algorithms
- [ ] Create application workflow
- [ ] Set up training content monetization
- [ ] Add social features (likes, comments)
- [ ] Implement real-time subscriptions

#### Week 4: API Completion
- [ ] Add file upload functionality
- [ ] Implement Stripe payment integration
- [ ] Set up push notifications
- [ ] Add comprehensive error handling
- [ ] Write API documentation

### Phase 2: Mobile App Development (Weeks 5-12)

#### Week 5-6: Mobile Foundation
- [ ] Set up React Native + Expo project
- [ ] Implement navigation structure
- [ ] Create authentication flow
- [ ] Set up Apollo Client for mobile
- [ ] Design mobile-first UI components

#### Week 7-8: Core Features
- [ ] Implement user onboarding
- [ ] Create role selection and profile setup
- [ ] Build job browsing and application
- [ ] Add social feed functionality
- [ ] Implement messaging system

#### Week 9-10: Advanced Features
- [ ] Add location-based job search
- [ ] Implement payment processing
- [ ] Create training content consumption
- [ ] Add push notifications
- [ ] Implement offline functionality

#### Week 11-12: Mobile Optimization
- [ ] Performance optimization
- [ ] Offline-first capabilities
- [ ] Push notification setup
- [ ] App store preparation
- [ ] Beta testing and iteration

### Phase 3: Web App Modernization (Weeks 13-16)

#### Week 13-14: Next.js Setup
- [ ] Migrate to Next.js 13+ with App Router
- [ ] Implement Material-UI design system
- [ ] Create responsive layouts
- [ ] Set up Apollo Client integration
- [ ] Migrate authentication flow

#### Week 15-16: Feature Migration
- [ ] Port dashboard components
- [ ] Implement real-time features
- [ ] Add PWA capabilities
- [ ] Performance optimization
- [ ] Cross-browser testing

### Phase 4: Infrastructure & Deployment (Weeks 17-20)

#### Week 17-18: Infrastructure Setup
- [ ] Docker containerization
- [ ] Kubernetes orchestration
- [ ] CI/CD pipeline setup
- [ ] Database migration scripts
- [ ] Monitoring and logging

#### Week 19-20: Production Deployment
- [ ] Environment configuration
- [ ] Security hardening
- [ ] Performance monitoring
- [ ] Mobile app store submission
- [ ] Production launch

---

## 📱 Mobile App Architecture

### Navigation Structure
```
├── Public Screens
│   ├── Landing/Welcome
│   ├── Authentication
│   │   ├── Login
│   │   ├── Register
│   │   └── Role Selection
│   └── Terms & Privacy
│
├── Protected Screens
│   ├── Home/Dashboard
│   ├── Jobs
│   │   ├── Browse Jobs
│   │   ├── Job Details
│   │   ├── Apply to Job
│   │   └── My Applications
│   ├── Social Feed
│   │   ├── Feed
│   │   ├── Post Details
│   │   └── Create Post
│   ├── Training Hub
│   │   ├── Browse Content
│   │   ├── Content Details
│   │   └── My Purchases
│   ├── Messages
│   │   ├── Chat List
│   │   └── Chat Screen
│   └── Profile
│       ├── View Profile
│       ├── Edit Profile
│       └── Settings
```

### Key Mobile Features
- **Offline-First**: Core functionality works offline
- **Push Notifications**: Real-time job alerts and messages
- **Location Services**: GPS-based job search and location sharing
- **Camera Integration**: Profile pictures and work samples
- **Biometric Authentication**: Face ID/Touch ID support
- **Deep Linking**: Direct links to specific content

---

## 🔧 API Architecture

### GraphQL Schema Design

#### Core Types
```graphql
type User {
  id: ID!
  email: String!
  displayName: String
  profileImage: String
  roles: [UserRole!]!
  currentRole: UserRole
  isVerified: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Job {
  id: ID!
  title: String!
  description: String!
  skillsRequired: [String!]!
  payRate: Float!
  payType: String!
  location: Location!
  date: DateTime!
  startTime: String!
  endTime: String!
  status: JobStatus!
  hub: User!
  applicants: [Application!]!
  selectedProfessional: User
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

#### Key Endpoints
- **User Management**: Registration, authentication, profile management
- **Job Marketplace**: Job posting, browsing, applications
- **Social Features**: Posts, comments, likes, following
- **Training Content**: Content creation, consumption, purchases
- **Messaging**: Real-time chat and notifications
- **Payments**: Stripe integration for training content and services

### Real-Time Features
- **Job Updates**: New jobs, status changes
- **Messages**: Real-time chat
- **Notifications**: Push notifications for important events
- **Social Feed**: Live updates for new posts and interactions

---

## 🚀 Deployment Strategy

### Environment Setup
1. **Development**: Local development with hot reload
2. **Staging**: Pre-production testing environment
3. **Production**: Live production environment

### Infrastructure Components
- **API Server**: Node.js application in Docker container
- **Database**: PostgreSQL with connection pooling
- **Cache**: Redis cluster for session and data caching
- **File Storage**: Google Cloud Storage for media files
- **CDN**: CloudFlare for static asset delivery
- **Monitoring**: Prometheus + Grafana for metrics

### Scaling Strategy
- **Horizontal Scaling**: Kubernetes pods for API servers
- **Database Scaling**: Read replicas and connection pooling
- **Caching**: Redis cluster for high availability
- **CDN**: Global content delivery for media assets

---

## 📈 Success Metrics

### Technical Metrics
- **API Response Time**: <200ms for 95% of requests
- **Mobile App Performance**: <2s cold start time
- **Uptime**: 99.9% availability
- **Error Rate**: <0.1% of total requests

### Business Metrics
- **User Acquisition**: 500+ new users per month
- **Engagement**: 70% monthly active user retention
- **Revenue**: $10K+ monthly recurring revenue
- **Mobile Usage**: 60%+ of sessions from mobile devices

### User Experience Metrics
- **App Store Rating**: 4.5+ stars
- **User Satisfaction**: 85%+ positive feedback
- **Task Completion**: 90%+ success rate for key workflows

---

## 🎯 Implementation Roadmap

### Month 1-2: Foundation
- ✅ Complete API architecture and database design
- ✅ Implement core authentication and user management
- ✅ Set up mobile app foundation with Expo
- ✅ Create basic GraphQL schema and resolvers

### Month 3-4: Core Features
- ✅ Implement job marketplace functionality
- ✅ Build social features and messaging
- ✅ Create training content system
- ✅ Develop mobile app UI and navigation

### Month 5-6: Advanced Features
- ✅ Add real-time capabilities
- ✅ Implement payment processing
- ✅ Create push notifications
- ✅ Add offline functionality

### Month 7-8: Optimization & Launch
- ✅ Performance optimization
- ✅ Security hardening
- ✅ Production deployment
- ✅ Mobile app store submission

---

## 🔐 Security Considerations

### API Security
- **Authentication**: JWT tokens with refresh mechanism
- **Authorization**: Role-based access control (RBAC)
- **Rate Limiting**: API rate limiting by endpoint and user
- **Input Validation**: Comprehensive input sanitization
- **CORS**: Properly configured CORS policies

### Data Security
- **Encryption**: Data at rest and in transit encryption
- **PII Protection**: Secure handling of personal information
- **GDPR Compliance**: Data portability and deletion capabilities
- **Audit Logging**: Comprehensive security event logging

### Mobile Security
- **Code Obfuscation**: App code protection
- **Certificate Pinning**: API communication security
- **Biometric Authentication**: Device-level security
- **Data Encryption**: Local data encryption

---

## 📚 Documentation & Training

### Developer Documentation
- **API Documentation**: GraphQL schema documentation with examples
- **Mobile Guides**: React Native development best practices
- **Deployment Guides**: Infrastructure setup and maintenance
- **Testing Strategy**: Unit, integration, and E2E testing guides

### User Documentation
- **User Guides**: Feature documentation for each user role
- **Video Tutorials**: Onboarding and feature walkthroughs
- **FAQ**: Common questions and troubleshooting
- **Support Portal**: Self-service help center

---

## 💡 Innovation Opportunities

### Emerging Features
- **AI-Powered Matching**: Machine learning for job-professional matching
- **AR/VR Training**: Immersive learning experiences
- **Blockchain Credentials**: Verifiable skill certifications
- **IoT Integration**: Smart salon equipment connectivity

### Industry Expansion
- **Multi-Industry Support**: Beauty, wellness, home services
- **Global Localization**: Multi-language and regional compliance
- **Enterprise Solutions**: Large organization management tools

---

## 🎉 Conclusion

This modernization plan transforms SnipShift from a web-first application into a **mobile-first, scalable platform** that can support rapid growth and international expansion. The new architecture provides:

- **Unified API**: Single source of truth for all platforms
- **Mobile Excellence**: Native mobile experience with offline capabilities
- **Scalable Infrastructure**: Microservices architecture ready for growth
- **Real-Time Features**: Live updates and instant communication
- **Modern Tech Stack**: Latest technologies for long-term maintainability

The implementation roadmap provides a clear path to launch within 8 months, with measurable milestones and success criteria to ensure the modernization delivers the expected business value.

---

*This architecture document serves as the blueprint for SnipShift 2.0. Regular reviews and updates will ensure the implementation stays aligned with business objectives and technological advancements.*
