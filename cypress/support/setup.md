# Cypress Setup Instructions for Replit

## System Dependencies Required

For Cypress to run properly in the Replit environment, the following system dependencies need to be installed:

```bash
# Core dependencies
apt-get install -y libgtk-3-0 libgbm-dev libnotify-dev libgconf-2-4 libnss3 libxss1 libasound2 libxtst6 xauth xvfb

# Additional X11 dependencies  
apt-get install -y libx11-6 libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 libxfixes3 libxi6 libxrandr2 libxrender1 libxtst6 libgtk-3-0

# Graphics and multimedia
apt-get install -y libdrm2 libxkbcommon0 libatspi2.0-0 libatk-bridge2.0-0
```

## Environment Configuration

Create a `.env` file for Cypress environment variables:

```bash
# Cypress Configuration
CYPRESS_baseUrl=http://localhost:5000
CYPRESS_defaultCommandTimeout=10000
CYPRESS_requestTimeout=10000
CYPRESS_responseTimeout=10000
CYPRESS_video=false
CYPRESS_screenshotOnRunFailure=true
```

## Running Tests in Replit

### Option 1: Headless Mode (Recommended for Replit)
```bash
# Install dependencies
npm install cypress --save-dev

# Run tests headless
npx cypress run --headless --browser chrome
```

### Option 2: Docker Alternative (if system deps fail)
```bash
# Use official Cypress Docker image
docker run -it --rm -v $PWD:/e2e -w /e2e cypress/included:latest
```

### Option 3: Alternative Testing Framework
If Cypress continues to have dependency issues, consider using:

```bash
# Playwright (often more stable in containerized environments)
npm install @playwright/test
npx playwright test

# Or Jest with jsdom for component testing
npm install jest @testing-library/react @testing-library/jest-dom
npm test
```

## Troubleshooting Common Issues

### Missing Graphics Libraries
```bash
export DISPLAY=:99
Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &
```

### Permission Issues
```bash
chmod +x node_modules/.bin/cypress
```

### Memory Issues
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
```

## Verification Commands

Test if Cypress can start:
```bash
npx cypress verify
npx cypress info
```

Check system capabilities:
```bash
npx cypress run --spec "cypress/e2e/06-design-system.cy.ts" --headless --no-exit
```

## Manual Testing Checklist

If E2E tests cannot run, perform manual verification:

1. **User Registration**: Create accounts for all 4 user types
2. **Job Flow**: Post job as Hub, apply as Professional  
3. **Social Posts**: Create brand post, moderate as admin, view in feed
4. **Training**: Upload content as Trainer, purchase as Professional
5. **Messaging**: Send messages between Hub and Professional
6. **Design System**: Visit `/design-showcase` and verify all components

## Production Deployment Testing

Before deploying to production:

1. Run full test suite in staging environment
2. Verify all critical user paths manually
3. Check responsive design on multiple devices
4. Test with real data and user accounts
5. Performance testing under load

The test infrastructure is complete and ready for execution once the environment is properly configured.