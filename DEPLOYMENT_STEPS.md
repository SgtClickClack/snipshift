# Deploy Snipshift to www.snipshift.com.au

## Step-by-Step VentraIP Deployment Guide

### 1. Access Your VentraIP cPanel
1. Go to `https://vip.ventraip.com.au/dashboard`
2. Log in with your credentials
3. Navigate to your hosting service for snipshift.com.au
4. Click "cPanel" to access the control panel

### 2. Prepare Your Domain
1. In cPanel, go to **"Subdomains"** (under Domains section)
2. Create subdomain: 
   - **Subdomain**: `www`
   - **Domain**: `snipshift.com.au` 
   - **Document Root**: `/public_html/www` (will auto-fill)
3. Click **"Create"**

### 3. Set Up Node.js Application
1. In cPanel, find **"Setup Node.js App"** (under Software)
2. Click **"Create Application"**
3. Configure:
   - **Node.js version**: Latest available (18.x or 20.x)
   - **Application mode**: Production
   - **Application root**: `/public_html/www`
   - **Application URL**: `/` (root)
   - **Application startup file**: `production-server.js`

### 4. Upload Production Files
1. Use **cPanel File Manager** or FTP client
2. Navigate to `/public_html/www/`
3. Upload the `snipshift-production.tar.gz` file
4. Extract: Right-click → "Extract"
5. Upload `production-server.js` to the root directory

### 5. Install Dependencies
1. In cPanel, go to **"Terminal"** (under Advanced)
2. Navigate to your app directory:
   ```bash
   cd public_html/www
   ```
3. Enter Node.js environment (copy command from Node.js app page):
   ```bash
   source /home/your-username/nodevenv/public_html/www/18/bin/activate
   ```
4. Install dependencies:
   ```bash
   npm install
   ```

### 6. Configure Environment Variables
1. In Node.js App setup, click **"Edit"** on your application
2. Add environment variables:
   ```
   NODE_ENV=production
   VITE_FIREBASE_API_KEY=your_actual_key
   VITE_FIREBASE_APP_ID=your_actual_app_id
   VITE_FIREBASE_PROJECT_ID=your_actual_project_id
   VITE_GOOGLE_CLIENT_ID=your_actual_client_id
   VITE_GOOGLE_MAPS_API_KEY=your_actual_maps_key
   PORT=3000
   ```

### 7. Start the Application
1. In Node.js App interface, click **"Start App"**
2. Monitor the startup process
3. Check for any error messages

### 8. Configure DNS (If Needed)
1. In cPanel, go to **"Zone Editor"** (under Domains)
2. Ensure these records exist:
   ```
   Type: A
   Name: www
   Value: [Your server IP - auto-configured]
   
   Type: CNAME  
   Name: @
   Value: www.snipshift.com.au
   ```

### 9. Enable SSL Certificate
1. In cPanel, find **"SSL/TLS"**
2. Go to **"Let's Encrypt SSL"**
3. Select your domain: `www.snipshift.com.au`
4. Click **"Issue"** to generate free SSL certificate

### 10. Test Your Deployment
1. Wait 5-10 minutes for DNS propagation
2. Visit: `https://www.snipshift.com.au`
3. Test key features:
   - User signup/login
   - Job posting
   - Social feeds
   - Maps functionality

## Production Files Ready:
- `snipshift-production.tar.gz` - Complete application bundle
- `production-server.js` - VentraIP-optimized server configuration

## Support Information:
- **VentraIP Support**: (03) 9013 8464
- **cPanel Documentation**: Available in VentraIP support center
- **24/7 Support**: Via eTicket system in VIP dashboard

## Troubleshooting:
- **App won't start**: Check startup file path and Node.js version
- **SSL issues**: Verify domain ownership and certificate installation
- **DNS problems**: Allow up to 24 hours for full propagation
- **Performance issues**: Monitor resource usage in cPanel metrics

Your Snipshift platform will be live at `https://www.snipshift.com.au` once deployment is complete!