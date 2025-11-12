# Secret Management with Doppler

This document describes how to use Doppler for centralized secret management across Vercel, Railway, and local development environments.

## Overview

Doppler provides a single source of truth for all environment variables, eliminating the need to manually copy secrets between platforms. Secrets are automatically synced to Vercel and Railway, and can be injected locally via the Doppler CLI.

## Benefits

- **Single Source of Truth**: Manage all secrets in one place
- **Automatic Syncing**: Secrets automatically sync to Vercel and Railway
- **Type Safety**: TypeScript type definitions provide IntelliSense and compile-time checking
- **Security**: Secrets never stored in `.env` files or committed to git
- **Environment Separation**: Separate secrets for dev, staging, and production

## Prerequisites

1. **Doppler Account**: Sign up at [https://doppler.com](https://doppler.com)
2. **Doppler CLI**: Install the Doppler CLI on your machine

### Installing Doppler CLI

**Windows (PowerShell):**
```powershell
# Install via winget
winget install Doppler.Doppler

# Or via Chocolatey
choco install doppler

# Or via Scoop
scoop install doppler
```

**macOS:**
```bash
# Install via Homebrew
brew install dopplerhq/cli/doppler

# Or via install script
curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh | sh
```

**Linux:**
```bash
# Install via install script
curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh | sh

# Or via package manager (Ubuntu/Debian)
sudo apt-get update && sudo apt-get install -y doppler
```

Verify installation:
```bash
doppler --version
```

## Initial Setup

### 1. Login to Doppler

```bash
doppler login
```

This will open your browser to authenticate. After authentication, you'll be logged in.

### 2. Create Doppler Project

```bash
# Create a new project (if not already created)
doppler projects create snipshift

# Or link to existing project
doppler setup
```

### 3. Configure Environments

Doppler uses "configs" to represent different environments. Create configs for each environment:

```bash
# Set up development config
doppler setup --project snipshift --config dev

# Set up staging config (optional)
doppler setup --project snipshift --config staging

# Set up production config
doppler setup --project snipshift --config prod
```

### 4. Upload Secrets

You can upload secrets via the Doppler dashboard or CLI:

**Via Dashboard:**
1. Go to [https://dashboard.doppler.com](https://dashboard.doppler.com)
2. Select your project and config (e.g., `snipshift` / `dev`)
3. Click "Add Secret" for each environment variable
4. Enter the secret name and value

**Via CLI:**
```bash
# Set a single secret
doppler secrets set SESSION_SECRET="your-secret-value" --project snipshift --config dev

# Set multiple secrets from a file
doppler secrets set --project snipshift --config dev < .env.local

# Set secrets interactively
doppler secrets set --project snipshift --config dev
```

### 5. List All Required Secrets

Based on your environment templates, you'll need to set these secrets in Doppler:

**Core Application:**
- `NODE_ENV`
- `PORT`
- `API_PORT`
- `VITE_PORT`

**Database:**
- `DATABASE_URL`
- `DB_POOL_MIN`
- `DB_POOL_MAX`
- `DB_POOL_IDLE_TIMEOUT`
- `DB_POOL_CONNECTION_TIMEOUT`

**Redis:**
- `REDIS_URL` (REQUIRED in production - application will fail to start if not set)
- `SKIP_REDIS` (set to '1' to skip Redis initialization)
- `REDIS_MAX_RETRIES`
- `REDIS_RETRY_DELAY`
- `REDIS_CONNECT_TIMEOUT`
- `REDIS_COMMAND_TIMEOUT`

**Note**: `REDIS_URL` is required in production environments. In development, if not set, the application will fall back to `redis://localhost:6379`. For Railway deployments, ensure the Redis service is linked to your API service so `REDIS_URL` is automatically provided.

**Authentication & Security:**
- `SESSION_SECRET` (REQUIRED in production)
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `BCRYPT_ROUNDS`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX_REQUESTS`
- `CORS_ORIGIN`
- `CORS_CREDENTIALS`
- `DISABLE_CSRF`

**Google OAuth:**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_GOOGLE_CLIENT_SECRET`
- `VITE_GOOGLE_REDIRECT_URI`

**Google Maps:**
- `VITE_GOOGLE_MAPS_API_KEY`

**Firebase:**
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_PROJECT_ID`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_CLIENT_EMAIL`

**Stripe:**
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CURRENCY`
- `SKIP_STRIPE`

**PayPal:**
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_MODE`
- `PAYPAL_CURRENCY`

**Email:**
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`

**Other Services:**
- `LOG_LEVEL`
- `SENTRY_DSN`
- `SENTRY_ENVIRONMENT`
- `ENABLE_PERFORMANCE_MONITORING`
- `PERFORMANCE_SAMPLE_RATE`

See `env.template` and `env-template.txt` for the complete list of environment variables.

## Local Development

### Using Doppler CLI

Instead of using `.env` files, use Doppler to inject secrets:

```bash
# Run development server with secrets
npm run dev:server:doppler

# Run client with secrets
npm run dev:client:doppler

# Run both with secrets
npm run dev:start:doppler

# Or use Doppler directly
doppler run -- npm run dev:server
doppler run -- npm run dev:client
```

### Fallback to .env Files

If you prefer to use `.env` files locally (or for team members who don't have Doppler access), you can still use the regular scripts:

```bash
# These will use .env.local or .env files if present
npm run dev:server
npm run dev:client
```

**Note:** `.env` files are gitignored and should never be committed. They're only for local development convenience.

### Switching Between Configs

```bash
# Switch to development config
doppler setup --project snipshift --config dev

# Switch to staging config
doppler setup --project snipshift --config staging

# Switch to production config (use with caution)
doppler setup --project snipshift --config prod
```

## Vercel Integration

### 1. Install Doppler Vercel Integration

1. Go to [Vercel Integrations](https://vercel.com/integrations)
2. Search for "Doppler" and install the integration
3. Authorize Doppler to access your Vercel account

### 2. Connect Vercel Project to Doppler

1. In Vercel dashboard, go to your project settings
2. Navigate to "Integrations" → "Doppler"
3. Click "Configure Integration"
4. Select your Doppler project and config:
   - **Project**: `snipshift`
   - **Config**: `prod` (for production) or `staging` (for preview deployments)
5. Click "Save"

### 3. Sync Secrets

Secrets will automatically sync from Doppler to Vercel. You can also manually trigger a sync:

1. In Vercel project settings → Environment Variables
2. Click "Sync from Doppler" (if available)
3. Or use Doppler CLI:
   ```bash
   doppler secrets download --project snipshift --config prod --format env-no-quotes | vercel env add
   ```

### 4. Verify Sync

After syncing, verify that secrets appear in Vercel:
1. Go to Vercel project → Settings → Environment Variables
2. Confirm all secrets from Doppler are present

## Railway Integration

### 1. Install Doppler Railway Integration

Railway doesn't have a direct integration like Vercel, but you can sync secrets via CLI or API.

### 2. Sync Secrets via CLI

**Option A: Using Railway CLI**
```bash
# Install Railway CLI if not already installed
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your Railway project
railway link

# Sync secrets from Doppler
doppler secrets download --project snipshift --config prod --format env-no-quotes | railway variables --set
```

**Option B: Manual Sync Script**
Create a script to sync secrets:

```bash
#!/bin/bash
# sync-railway-secrets.sh

# Download secrets from Doppler
doppler secrets download --project snipshift --config prod --format env-no-quotes > /tmp/railway-secrets.env

# Set each secret in Railway
while IFS='=' read -r key value; do
  if [ ! -z "$key" ] && [ ! -z "$value" ]; then
    railway variables --set "$key=$value"
  fi
done < /tmp/railway-secrets.env

# Clean up
rm /tmp/railway-secrets.env
```

### 3. Automated Sync (CI/CD)

Add a step to your CI/CD pipeline to sync secrets before deployment:

```yaml
# .github/workflows/deploy.yml (example)
- name: Sync Railway Secrets
  run: |
    doppler secrets download --project snipshift --config prod --format env-no-quotes | railway variables --set
  env:
    DOPPLER_TOKEN: ${{ secrets.DOPPLER_TOKEN }}
    RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

## Type Safety

All environment variables are typed in `shared/types/environment.d.ts`. This provides:

- **IntelliSense**: Auto-completion when accessing `process.env.VARIABLE_NAME`
- **Type Checking**: TypeScript will catch typos and incorrect variable names
- **Documentation**: Hover over variables to see their descriptions

Example:
```typescript
// TypeScript knows this variable exists and is optional
const apiKey = process.env.VITE_FIREBASE_API_KEY;

// TypeScript will error if you typo the variable name
const wrongKey = process.env.VITE_FIREBASE_API_KE; // Error!
```

## Best Practices

### 1. Never Commit Secrets

- ✅ Use Doppler for all secrets
- ✅ Keep `.env*` files in `.gitignore`
- ❌ Never commit `.env` files
- ❌ Never hardcode secrets in code

### 2. Use Different Configs for Different Environments

- `dev`: Local development secrets
- `staging`: Staging environment secrets
- `prod`: Production secrets

### 3. Rotate Secrets Regularly

- Update secrets in Doppler dashboard
- Secrets automatically sync to Vercel/Railway
- No need to update multiple places

### 4. Limit Access

- Only grant Doppler access to team members who need it
- Use Doppler's access controls to restrict who can view/edit secrets
- Use different tokens for CI/CD vs. local development

### 5. Monitor Secret Usage

- Use Doppler's audit logs to track who accessed what secrets
- Set up alerts for unusual access patterns

## Troubleshooting

### Doppler CLI Not Found

```bash
# Verify installation
doppler --version

# If not found, reinstall using the appropriate method for your OS
```

### Authentication Issues

```bash
# Re-authenticate
doppler login

# Check current authentication
doppler me
```

### Secrets Not Syncing to Vercel

1. Verify Doppler integration is installed in Vercel
2. Check that project and config names match
3. Manually trigger sync from Vercel dashboard
4. Check Doppler logs for errors

### Secrets Not Syncing to Railway

1. Verify Railway CLI is installed and authenticated
2. Check that you're linked to the correct Railway project
3. Verify Doppler token has access to the correct project/config
4. Run sync command manually to see errors

### TypeScript Errors

If TypeScript doesn't recognize environment variables:

1. Ensure `shared/types/environment.d.ts` is included in `tsconfig.json`
2. Restart TypeScript server in your IDE
3. Run `npm run typecheck` to verify types

## Migration Guide

### Migrating from .env Files

1. **Export existing secrets:**
   ```bash
   # If you have a .env.local file
   cat .env.local
   ```

2. **Upload to Doppler:**
   ```bash
   # Set each secret (replace with your actual values)
   doppler secrets set SESSION_SECRET="your-value" --project snipshift --config dev
   doppler secrets set DATABASE_URL="your-value" --project snipshift --config dev
   # ... repeat for all secrets
   ```

3. **Verify secrets are set:**
   ```bash
   doppler secrets --project snipshift --config dev
   ```

4. **Test locally:**
   ```bash
   doppler run -- npm run dev:server
   ```

5. **Sync to Vercel/Railway:**
   - Follow the integration steps above

6. **Remove .env files (optional):**
   ```bash
   # Backup first!
   cp .env.local .env.local.backup
   
   # Remove (secrets are now in Doppler)
   rm .env.local
   ```

## Additional Resources

- [Doppler Documentation](https://docs.doppler.com)
- [Doppler CLI Reference](https://docs.doppler.com/docs/cli)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Railway Environment Variables](https://docs.railway.app/develop/variables)

## Support

If you encounter issues:

1. Check Doppler status: [https://status.doppler.com](https://status.doppler.com)
2. Review Doppler logs: `doppler logs`
3. Contact team lead or DevOps for assistance

