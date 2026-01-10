# Docker Production Deployment Guide

This guide explains how to deploy HospoGo using Docker for production environments.

## Architecture

HospoGo consists of two main services:
- **Frontend (web)**: Vite + React application served as static files
- **Backend (api)**: Express + TypeScript API server with PostgreSQL database

## Prerequisites

- Docker Engine 20.10+ and Docker Compose 2.0+
- Node.js 22.x (for local development)
- PostgreSQL database (can be external or containerized)

## Quick Start

### 1. Environment Variables

Create a `.env.production` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database
POSTGRES_URL=postgresql://user:password@host:port/database

# Frontend Build Variables
VITE_API_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Backend Environment Variables
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
RESEND_API_KEY=your_resend_api_key

# Optional: PostgreSQL (if using containerized database)
POSTGRES_USER=snipshift
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=snipshift
```

### 2. Build and Run with Docker Compose

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down

# Rebuild after code changes
docker-compose -f docker-compose.prod.yml up -d --build
```

### 3. Individual Service Deployment

#### Frontend Only

```bash
# Build
docker build -t snipshift-web .

# Run
docker run -p 3000:3000 \
  -e VITE_API_URL=http://your-api-url:5000 \
  snipshift-web
```

#### Backend Only

```bash
# Build
cd api
docker build -t snipshift-api .

# Run
docker run -p 5000:5000 \
  -e DATABASE_URL=postgresql://user:password@host:port/database \
  -e FIREBASE_PROJECT_ID=your_project_id \
  snipshift-api
```

## Database Migrations

Migrations are automatically applied when the API container starts via the `entrypoint.sh` script. The script:

1. Waits for the database to be ready
2. Applies all SQL migrations from the `api/drizzle/` directory in order
3. Starts the API server

### Manual Migration

If you need to run migrations manually:

```bash
# Inside the API container
docker exec -it snipshift-api sh
npm run db:migrate

# Or using docker-compose
docker-compose -f docker-compose.prod.yml exec api npm run db:migrate
```

## Multi-Stage Build Optimization

Both Dockerfiles use multi-stage builds to minimize image size:

1. **Deps Stage**: Installs all dependencies
2. **Builder Stage**: Compiles/builds the application
3. **Runner Stage**: Contains only runtime dependencies and built artifacts

This results in smaller production images (~100-200MB vs 1GB+).

## Health Checks

Both services include health checks:

- **Frontend**: `http://localhost:3000/` (returns 200)
- **Backend**: `http://localhost:5000/health` (must return 200)

Health checks run every 30 seconds and containers are automatically restarted if unhealthy.

## Production Considerations

### 1. External Database

For production, use a managed PostgreSQL database (AWS RDS, Google Cloud SQL, etc.):

```yaml
# In docker-compose.prod.yml, remove or comment out the db service
# and update DATABASE_URL to point to your external database
```

### 2. Reverse Proxy

Use nginx or Traefik as a reverse proxy:

```nginx
# nginx.conf example
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
    }

    location /api {
        proxy_pass http://localhost:5000;
    }
}
```

### 3. Environment Variables

Never commit `.env.production` to version control. Use:
- Docker secrets
- Environment variable injection in your hosting platform
- Secret management services (AWS Secrets Manager, HashiCorp Vault)

### 4. SSL/TLS

Configure SSL certificates using:
- Let's Encrypt with certbot
- Cloud provider SSL (AWS Certificate Manager, etc.)
- Reverse proxy with SSL termination

### 5. Monitoring

Add monitoring and logging:
- **Logging**: Configure log aggregation (ELK, Loki, etc.)
- **Metrics**: Add Prometheus metrics endpoint
- **APM**: Use services like Datadog, New Relic, or Sentry

## Render.com Deployment

If deploying to Render.com, use the provided `render.yaml`:

1. Connect your Git repository to Render
2. Render will automatically detect `render.yaml` and create services
3. Set environment variables in the Render dashboard
4. Deployments happen automatically on git push

## Troubleshooting

### Database Connection Issues

```bash
# Check if database is accessible
docker-compose -f docker-compose.prod.yml exec api sh
nc -zv db-host 5432
```

### Migration Failures

```bash
# Check migration logs
docker-compose -f docker-compose.prod.yml logs api | grep -i migration

# Manually apply a specific migration
docker-compose -f docker-compose.prod.yml exec api \
  npx tsx _src/scripts/apply-migration.ts 0001_migration_name.sql
```

### Build Failures

```bash
# Clear Docker cache and rebuild
docker-compose -f docker-compose.prod.yml build --no-cache

# Check build logs
docker-compose -f docker-compose.prod.yml build 2>&1 | tee build.log
```

## Performance Optimization

1. **Use BuildKit**: Enable Docker BuildKit for faster builds
   ```bash
   export DOCKER_BUILDKIT=1
   docker-compose -f docker-compose.prod.yml build
   ```

2. **Layer Caching**: Dependencies are cached in separate layers for faster rebuilds

3. **Image Size**: Images are optimized using Alpine Linux base images

## Security Best Practices

1. **Non-root User**: Consider running containers as non-root users
2. **Secrets Management**: Never hardcode secrets in Dockerfiles
3. **Image Scanning**: Regularly scan images for vulnerabilities
4. **Network Isolation**: Use Docker networks to isolate services
5. **Resource Limits**: Set CPU and memory limits in production

## Support

For issues or questions:
- Check the main README.md
- Review API documentation
- Open an issue on GitHub
