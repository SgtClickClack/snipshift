# SnipShift V2 Deployment Guide

## Hard Reset Deployment Steps

### 1. Delete Old Deployment
- Go to Replit → Deployments/Publishing tab
- Find the current deployment
- Click settings (gear icon) → Delete/Archive
- Confirm deletion

### 2. Create New Deployment
- Click "New Deployment" or "Deploy from scratch"
- Ensure it uses `main` branch
- Configuration will auto-detect from `.replit` file

### 3. Expected Build Process
The deployment should execute these commands:
```bash
npm --prefix snipshift-next/api install
npm --prefix snipshift-next/api run build
npm --prefix snipshift-next/api run start
```

### 4. Verification
Once deployed, test these endpoints:
- `https://snipshift.com.au/` - Main site
- `https://snipshift.com.au/health` - Health check
- `https://snipshift.com.au/graphql` - GraphQL endpoint

### 5. Expected Results
- ✅ V2 3-role page loads correctly
- ✅ New logo displays
- ✅ All V2 features working
- ✅ No more 500 Internal Server Error

## Configuration Files Status
- ✅ `.replit` - Perfect deployment configuration
- ✅ `package.json` - All scripts ready
- ✅ `tsconfig.json` - Node16 module resolution
- ✅ `src/index.ts` - Port 4000, error handling
- ✅ All fixes committed and pushed

## Troubleshooting
If deployment still fails:
1. Check build logs for specific errors
2. Verify all files are committed to `main` branch
3. Ensure no deployment overrides in Replit UI
4. Try creating deployment with different name

The hard reset should resolve all cached deployment issues.