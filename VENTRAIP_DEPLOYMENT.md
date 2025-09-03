# Snipshift Deployment to VentraIP Australia

## Domain Configuration: www.snipshift.com.au

### VentraIP Hosting Options

Based on your VentraIP dashboard access, here are the deployment approaches:

## Option 1: VentraIP Web Hosting (Recommended)

### Prerequisites
- Node.js hosting capability on VentraIP
- cPanel access for domain management
- File upload capability for production build

### Deployment Steps

#### 1. Prepare Production Build
```bash
# Create optimized production build
npm run build

# This creates:
# - dist/public/ (React frontend)
# - dist/index.js (Node.js backend)
```

#### 2. VentraIP cPanel Configuration
1. **Access cPanel**: Log into vip.ventraip.com.au dashboard
2. **File Manager**: Navigate to public_html for www.snipshift.com.au
3. **Upload Files**: Upload entire dist/ folder contents
4. **Node.js Setup**: Configure Node.js application in cPanel
5. **Environment Variables**: Set production environment variables

#### 3. Domain DNS Configuration
```dns
# A Record Configuration
Type: A
Name: www
Value: [VentraIP server IP]
TTL: 3600

# Root domain redirect
Type: CNAME
Name: @
Value: www.snipshift.com.au
```

## Option 2: External Hosting + VentraIP DNS

### Frontend: Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd client
vercel --prod
```

### Backend: Railway Deployment
```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy backend
railway login
railway init
railway up
```

### VentraIP DNS Configuration
```dns
# Point to external hosting
Type: CNAME
Name: www
Value: your-vercel-deployment.vercel.app

Type: CNAME  
Name: api
Value: your-railway-app.railway.app
```

## Option 3: Subdomain Configuration

### Setup Process
1. **Create Subdomain**: Add subdomain in VentraIP cPanel
2. **Deploy Application**: Upload to subdomain directory
3. **SSL Certificate**: Enable SSL through VentraIP
4. **Domain Forwarding**: Configure root domain to forward to subdomain

### Implementation Commands
```bash
# Build for production
npm run build

# Create deployment package
tar -czf snipshift-production.tar.gz dist/

# Upload via cPanel File Manager or FTP
```

## Environment Variables Configuration

### Required Variables for Production
```env
NODE_ENV=production
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
PORT=3000
```

### VentraIP Environment Setup
1. **cPanel Environment Variables**: Set through Node.js app configuration
2. **Package.json Modifications**: Ensure production scripts are correct
3. **Start Command**: Configure startup command for Node.js hosting

## SSL Certificate Configuration

### Automatic SSL (Recommended)
- Enable Let's Encrypt SSL in VentraIP cPanel
- Configure auto-renewal for certificate
- Verify HTTPS redirect is working

### Manual SSL Setup
- Upload custom SSL certificate if needed
- Configure certificate binding in cPanel
- Test SSL configuration with online tools

## Performance Optimization

### CDN Configuration
- Enable CloudFlare through VentraIP if available
- Configure caching rules for static assets
- Set up gzip compression

### Database Preparation
- Prepare for PostgreSQL migration from memory storage
- Configure database connection strings
- Set up database backup procedures

## Monitoring and Maintenance

### Health Checks
- Set up uptime monitoring
- Configure error logging
- Implement performance tracking

### Backup Strategy
- Regular file system backups
- Database backup procedures
- Version control integration

## Next Steps

1. **Verify VentraIP Hosting Type**: Check if your plan supports Node.js hosting
2. **Access cPanel**: Log into hosting management interface
3. **Upload Production Build**: Deploy the built application files
4. **Configure Domain**: Set up DNS records for www.snipshift.com.au
5. **Test Deployment**: Verify all features work on live domain

Would you like me to help you with any specific step in this process?