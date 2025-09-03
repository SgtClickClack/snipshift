# Snipshift CI/CD Pipeline Setup

## Overview

This document outlines the comprehensive CI/CD pipeline implementation for Snipshift, providing automated testing, building, and deployment processes for the production-ready B2B2C marketplace platform.

## Pipeline Architecture

### 1. Main CI/CD Pipeline (`.github/workflows/main.yml`)

**Triggers:**
- Push to `main` branch (production deployment)
- Push to `develop` branch (staging deployment)
- Pull requests to `main` branch

**Jobs:**

#### Build and Test Job
- **Node.js Matrix**: Tests on Node.js 18.x and 20.x
- **Type Checking**: Validates TypeScript compilation
- **Production Build**: Creates optimized build artifacts
- **E2E Testing**: Runs both Playwright and Cypress test suites
- **Artifact Upload**: Saves test reports and screenshots on failure

#### Security Scan Job
- **Dependency Audit**: Checks for known vulnerabilities
- **Security Assessment**: Uses audit-ci for automated security validation
- **Parallel Execution**: Runs alongside build/test for efficiency

#### Deployment Jobs
- **Staging Deployment**: Triggered on `develop` branch pushes
- **Production Deployment**: Triggered on `main` branch pushes
- **Mock Deployment**: Simulates deployment process with validation
- **Environment-specific**: Uses appropriate environment variables

### 2. Pull Request Validation (`.github/workflows/pr-validation.yml`)

**Purpose:** Lightweight validation for pull requests

**Checks:**
- TypeScript compilation validation
- Build verification with test environment variables
- Breaking change analysis
- PR size assessment and recommendations

### 3. Dependency Management (`.github/workflows/dependency-update.yml`)

**Schedule:** Weekly on Mondays at 9 AM UTC

**Functions:**
- Outdated package detection
- Security vulnerability scanning
- Dependency health reporting
- Manual trigger capability

## Environment Variables

### Required Secrets

Configure these in your GitHub repository settings under `Settings > Secrets and variables > Actions`:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_APP_ID=your_firebase_app_id  
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id

# Google Services
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### Environment-Specific Variables

The pipeline uses different configurations for:
- **Development**: Local development with hot reload
- **Staging**: Pre-production testing environment
- **Production**: Live production deployment

## Testing Integration

### Playwright E2E Tests
- **Cross-browser Testing**: Chrome, Firefox, Safari
- **Responsive Design**: Multiple viewport sizes
- **Accessibility**: ARIA compliance validation
- **Performance**: Load time and interaction metrics

### Cypress E2E Tests
- **User Flow Testing**: Complete onboarding to dashboard workflows
- **Feature Testing**: Job posting, social feeds, messaging
- **Design System**: UI component and styling validation
- **Data Integrity**: Real API interactions and data validation

### Test Coverage Areas
1. **User Onboarding**: All four user role signup flows
2. **Job Marketplace**: Posting, searching, and application workflows  
3. **Social Features**: Feed interactions and content moderation
4. **Training Hub**: Content creation and marketplace transactions
5. **Messaging System**: Real-time communication features
6. **Design System**: Black & Chrome styling consistency

## Deployment Strategy

### Branch Strategy
- `main`: Production-ready code, triggers production deployment
- `develop`: Integration branch, triggers staging deployment
- `feature/*`: Feature development, triggers PR validation
- `hotfix/*`: Emergency fixes, fast-track to production

### Deployment Environments

#### Staging Environment
- **URL**: `https://staging.snipshift.com.au` (configured in hosting provider)
- **Purpose**: Pre-production testing and validation
- **Triggers**: Push to `develop` branch
- **Features**: Full feature set with test data

#### Production Environment  
- **URL**: `https://snipshift.com.au`
- **Purpose**: Live marketplace for users
- **Triggers**: Push to `main` branch
- **Features**: Complete platform with production data

## Quality Gates

### Automated Checks
1. **TypeScript Compilation**: Zero compilation errors
2. **Build Success**: Production build must complete
3. **E2E Test Pass**: All Playwright and Cypress tests must pass
4. **Security Scan**: No moderate or high severity vulnerabilities
5. **Performance**: Build size and load time validation

### Manual Review Requirements
- All pull requests require code review
- Breaking changes need additional approval
- Production deployments require successful staging validation

## Monitoring and Notifications

### Success Notifications
- ✅ Successful production deployments
- ✅ Successful staging deployments  
- ✅ Successful test suite completion

### Failure Notifications
- ❌ Build failures with detailed logs
- ❌ Test failures with screenshots and videos
- ❌ Security vulnerabilities with remediation guidance
- ❌ Deployment failures with rollback procedures

## Performance Optimizations

### Build Optimizations
- **Parallel Jobs**: Build, test, and security scans run concurrently
- **Caching Strategy**: npm dependencies cached between runs
- **Matrix Strategy**: Multiple Node.js versions tested simultaneously
- **Selective Deployment**: Only deploy when tests pass

### Resource Efficiency
- **Conditional Execution**: Jobs only run when needed
- **Artifact Management**: Automatic cleanup of old test reports
- **Browser Dependencies**: Cached between test runs
- **Environment Isolation**: Clean slate for each pipeline run

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check TypeScript compilation
npm run check

# Verify environment variables
echo $VITE_FIREBASE_API_KEY

# Test production build locally
npm run build
```

#### Test Failures
```bash
# Run Playwright tests locally
npx playwright test --headed

# Run Cypress tests locally  
npx cypress run --headless

# Check test artifacts
ls -la playwright-report/
ls -la cypress/screenshots/
```

#### Deployment Issues
```bash
# Validate build artifacts
ls -la dist/
cat dist/index.html

# Check environment configuration
npm run build:production
```

### Support Contacts
- **Pipeline Issues**: Create GitHub issue with `ci/cd` label
- **Deployment Problems**: Check GitHub Actions logs and artifacts
- **Test Failures**: Review test reports and screenshots in pipeline artifacts

## Future Enhancements

### Planned Improvements
1. **Performance Testing**: Lighthouse CI integration
2. **Visual Regression**: Screenshot comparison testing
3. **Database Migrations**: Automated schema updates
4. **Rollback Automation**: Automatic rollback on deployment failures
5. **Notification Integration**: Slack/Discord notifications for team updates

### Scaling Considerations
- **Multi-environment**: Add QA and preview environments
- **Feature Flags**: Gradual feature rollouts
- **Blue-Green Deployment**: Zero-downtime deployments
- **Health Checks**: Automated post-deployment validation

This CI/CD pipeline ensures Snipshift maintains the highest quality standards while enabling rapid, reliable deployment of new features to serve the creative industry professional community.