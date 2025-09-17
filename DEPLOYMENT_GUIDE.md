# 🚀 Snipshift Production Deployment Guide

## Quick Deployment Steps

### 1. Access VentraIP cPanel
- Go to `https://vip.ventraip.com.au/dashboard`
- Log in to your account
- Navigate to your `snipshift.com.au` hosting service
- Click "cPanel"

### 2. Upload Deployment Package
- In cPanel, go to **"File Manager"**
- Navigate to `/public_html/` (or your web root directory)
- Upload `snipshift-production-build.zip`
- Right-click the file → **"Extract"**

### 3. Install Dependencies
- In cPanel, go to **"Terminal"**
- Navigate to your web directory:
  ```bash
  cd public_html
  ```
- Install dependencies:
  ```bash
  npm install --production
  ```

### 4. Start the Application
- In cPanel, go to **"Setup Node.js App"**
- Click **"Start App"** on your application
- Or run manually:
  ```bash
  node production-server.js
  ```

### 5. Clear Cache (Important!)
- Clear browser cache and cookies
- If using CDN, purge the cache
- Test in incognito/private browsing mode

## What's Updated

✅ **Role Selection Page**: Now shows 3 roles instead of 4
- **Barber** (formerly Professional)
- **Shop** (formerly Hub Owner)  
- **Brand / Coach** (combined Brand + Trainer)

✅ **Layout**: Changed from 2x2 grid to 3-column layout
✅ **Routing**: Updated to handle new role structure
✅ **Tests**: All tests updated to match new structure

## Troubleshooting

### If the old page still shows:
1. **Clear browser cache completely**
2. **Check if CDN cache needs purging**
3. **Verify the new files were uploaded correctly**
4. **Restart the Node.js application**

### If deployment fails:
1. **Check file permissions** (should be 755 for directories, 644 for files)
2. **Verify Node.js version** (should be 18.x or 20.x)
3. **Check environment variables** are set correctly
4. **Review server logs** for any errors

## Expected Result

After successful deployment, visiting `snipshift.com.au/auth/role-selection` should show:
- 3 role cards in a horizontal row
- "Barber", "Shop", "Brand / Coach" options
- Clean, modern layout matching your V2 plan

---

**Deployment Package**: `snipshift-production-build.zip`  
**Target URL**: `https://snipshift.com.au/auth/role-selection`  
**Status**: Ready for deployment ✅
