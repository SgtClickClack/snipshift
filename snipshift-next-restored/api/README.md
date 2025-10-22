# SnipShift GraphQL API

A modern GraphQL API for the SnipShift platform, built with Node.js, Apollo Server, and PostgreSQL.

## Features

- **Authentication & Authorization**: JWT-based auth with multiple user roles
- **Job Management**: Create, apply, and manage job postings
- **Social Features**: Posts, comments, and community interactions
- **Training Content**: Course creation and purchase system
- **Real-time Messaging**: Chat system with subscriptions
- **File Uploads**: Cloud storage integration
- **Rate Limiting**: Protection against abuse
- **Security**: Helmet, CORS, input sanitization

## Tech Stack

- **Runtime**: Node.js 18+
- **GraphQL Server**: Apollo Server 4
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT with jose
- **Real-time**: GraphQL Subscriptions with WebSocket
- **Caching**: Redis
- **Testing**: Jest with Apollo Server Testing
- **TypeScript**: Full type safety

## Project Structure

```
src/
├── database/           # Database connection and schema
├── graphql/           # GraphQL schema and resolvers
├── middleware/        # Express middleware
├── utils/            # Utility functions
├── config/           # Configuration files
└── index.ts          # Server entry point

tests/
├── utils/            # Test utilities
├── auth.test.ts      # Authentication tests
├── user.test.ts      # User management tests
├── job.test.ts       # Job system tests
└── integration.test.ts # Integration tests
```

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis (optional, for caching)

### Installation

1. **Clone and navigate to the API directory:**
   ```bash
   cd snipshift-next/api
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:
   ```env
   DATABASE_URL="postgresql://localhost:5432/snipshift"
   JWT_SECRET="your-super-secret-jwt-key"
   REDIS_URL="redis://localhost:6379"
   NODE_ENV="development"
   PORT=4000
   ```

4. **Set up the database:**
   ```bash
   # Generate and run migrations
   npm run db:generate
   npm run db:migrate
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:4000/graphql`

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run db:generate` - Generate database migrations
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Drizzle Studio

### Testing

The API includes comprehensive tests covering:

- **Unit Tests**: Individual resolver functions
- **Integration Tests**: Full GraphQL schema validation
- **Authentication Tests**: Login, registration, token refresh
- **Authorization Tests**: Role-based access control

Run tests with:
```bash
npm test
```

### Database Schema

The API uses Drizzle ORM with PostgreSQL. Key entities:

- **Users**: Multi-role user system (Client, Hub, Professional, Brand, Trainer)
- **Jobs**: Job postings with applications
- **Social Posts**: Community content with comments and likes
- **Training Content**: Courses and educational materials
- **Chats & Messages**: Real-time messaging system
- **Purchases**: Payment and access management

### GraphQL Schema

#### Core Types
- `User` - User accounts with role profiles
- `Job` - Job postings and applications
- `SocialPost` - Community content
- `TrainingContent` - Educational materials
- `Chat` & `Message` - Messaging system

#### Authentication
```graphql
type Mutation {
  register(input: CreateUserInput!): AuthPayload!
  login(email: String!, password: String): AuthPayload!
  googleAuth(idToken: String!): AuthPayload!
  refreshToken(refreshToken: String!): AuthPayload!
  logout: Boolean!
}
```

#### Job Management
```graphql
type Mutation {
  createJob(input: CreateJobInput!): Job!
  applyToJob(input: CreateApplicationInput!): Application!
  updateApplicationStatus(applicationId: ID!, status: String!): Application!
}
```

#### Real-time Features
```graphql
type Subscription {
  jobCreated(hubId: ID): Job!
  applicationReceived(jobId: ID): Application!
  messageReceived(userId: ID!): Message!
  socialPostCreated: SocialPost!
}
```

## API Documentation

Once the server is running, visit `http://localhost:4000/graphql` to:

- **GraphQL Playground**: Interactive API documentation
- **Schema Explorer**: Browse all types, queries, and mutations
- **Query Testing**: Test queries and mutations in real-time

## Deployment

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | Secret key for JWT signing | Required |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `4000` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Optional |
| `STRIPE_SECRET_KEY` | Stripe secret key | Optional |

### Production Checklist

- [ ] Set strong `JWT_SECRET`
- [ ] Configure production database
- [ ] Set up Redis for caching
- [ ] Configure CORS origins
- [ ] Set up monitoring and logging
- [ ] Configure rate limiting
- [ ] Set up SSL certificates
- [ ] Configure file upload storage

## Contributing

1. Follow the existing code style and patterns
2. Write tests for new features
3. Update documentation as needed
4. Ensure all tests pass before submitting PR

## License

This project is part of the SnipShift platform.
