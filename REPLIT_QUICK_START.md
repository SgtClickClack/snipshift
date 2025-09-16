# SnipShift 2.0 - Quick Replit Setup Guide

## 🚀 Getting Started in 3 Steps

### Step 1: Set Environment Variables
1. Go to the **"Secrets"** tab in your Replit workspace
2. Add the following required variables (copy from `snipshift-next/env.example`):

```
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://snipshift:snipshift_password@postgres:5432/snipshift
REDIS_URL=redis://redis:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
SESSION_SECRET=your-session-secret-change-in-production
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:8081
LOG_LEVEL=info
```

**Optional but Recommended:**
```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### Step 2: Run the Application
1. Click the green **"Run"** button
2. Wait for all services to start (database, API, web app)
3. The web application will automatically open in the preview window

### Step 3: Access Your Services
- **Web App**: Automatically opens at `http://localhost:3000`
- **API GraphQL**: Available at `http://localhost:4000/graphql`
- **Database**: PostgreSQL running on port 5432
- **Cache**: Redis running on port 6379

## 🔧 Development Workflow

### Making Changes
- **API Changes**: Edit files in `snipshift-next/api/src/` - hot reloading enabled
- **Web Changes**: Edit files in `snipshift-next/web/src/` - hot reloading enabled
- **Database Changes**: Use `npm run db:generate` and `npm run db:migrate` in API directory

### Testing
- **API Tests**: `cd snipshift-next/api && npm test`
- **Web Tests**: `cd snipshift-next/web && npm test`

### Building for Production
- **API**: `cd snipshift-next/api && npm run build`
- **Web**: `cd snipshift-next/web && npm run build`

## 🚀 Production Deployment

### Deploy API Service
1. Go to **"Deployments"** tab
2. Select **"snipshift-api"** release
3. Click **"Deploy"**
4. Set production environment variables

### Deploy Web Service
1. Go to **"Deployments"** tab
2. Select **"snipshift-web"** release
3. Click **"Deploy"**
4. Set production environment variables

## 🆘 Troubleshooting

### Services Won't Start
- Check that all required environment variables are set in Secrets
- Ensure Docker Compose is installed (included in `.replit` configuration)
- Check the console for error messages

### Database Connection Issues
- Verify `DATABASE_URL` is set correctly
- Ensure PostgreSQL service is healthy (check health checks)
- Database data persists between restarts via Docker volumes

### API Not Responding
- Check that API service is healthy
- Verify CORS_ORIGIN includes your web app URL
- Check JWT_SECRET is set

### Web App Not Loading
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check that API service is running on port 4000
- Ensure web service is healthy

## 📚 Additional Resources

- **Full Documentation**: See `REPLIT_COMPATIBILITY_REPORT.md`
- **Environment Variables**: See `snipshift-next/env.example`
- **API Documentation**: Visit `http://localhost:4000/graphql` when running
- **Database Management**: pgAdmin available at `http://localhost:5050` (optional)

## 🎯 Success Indicators

You'll know everything is working when:
- ✅ Green "Run" button starts all services without errors
- ✅ Web preview shows the SnipShift application
- ✅ GraphQL playground loads at `/graphql` endpoint
- ✅ Database connections are established
- ✅ Hot reloading works when you edit code

**Happy coding! 🚀**
