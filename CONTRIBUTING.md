# Contributing to Snipshift

Thank you for your interest in contributing to Snipshift! This document provides guidelines and information for contributors.

## Development Workflow

### Prerequisites
- Node.js 18.x or 20.x
- npm (latest version)
- Git

### Setting Up Development Environment

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/snipshift.git
   cd snipshift
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Add your API keys and configuration

4. **Start development server**
   ```bash
   npm run dev
   ```

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - Feature development branches
- `hotfix/*` - Emergency fixes for production

### Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the coding standards below
   - Add tests for new functionality
   - Update documentation if needed

3. **Test your changes**
   ```bash
   npm run check          # TypeScript compilation check
   npm run build         # Production build test
   npx playwright test   # E2E tests
   npx cypress run       # Additional E2E tests
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Convention

We use conventional commits for clear and structured commit messages:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add job filtering by location
fix: resolve authentication redirect issue
docs: update API documentation
test: add E2E tests for signup flow
```

## Coding Standards

### TypeScript/JavaScript
- Use TypeScript for all new code
- Follow existing code patterns and conventions
- Use meaningful variable and function names
- Add JSDoc comments for complex functions

### React Components
- Use functional components with hooks
- Follow the existing component structure
- Add `data-testid` attributes for testing
- Use proper TypeScript types

### Styling
- Use Tailwind CSS classes
- Follow the Black & Chrome design system
- Ensure responsive design for all components
- Test on different screen sizes

### Testing
- Write E2E tests for new user flows
- Use descriptive test names
- Test both success and error scenarios
- Ensure tests are reliable and not flaky

## CI/CD Pipeline

Our GitHub Actions pipeline automatically:

1. **Build Validation** - Ensures code compiles successfully
2. **Type Checking** - Validates TypeScript types
3. **E2E Testing** - Runs Playwright and Cypress tests
4. **Security Scanning** - Checks for vulnerabilities
5. **Deployment** - Deploys to staging/production

### Pipeline Triggers

- **Pull Requests** - Runs validation checks
- **Push to develop** - Deploys to staging
- **Push to main** - Deploys to production
- **Scheduled** - Weekly dependency updates

## Testing Guidelines

### E2E Testing with Playwright
```typescript
test('should complete user signup flow', async ({ page }) => {
  await page.goto('/signup');
  await page.getByTestId('input-email').fill('test@example.com');
  await page.getByTestId('input-password').fill('password123');
  await page.getByTestId('option-professional').click();
  await page.getByTestId('button-signup').click();
  await expect(page).toHaveURL('/professional-dashboard');
});
```

### E2E Testing with Cypress
```javascript
it('should display job feed with filters', () => {
  cy.quickLogin('professional');
  cy.visit('/job-feed');
  cy.get('[data-testid="input-job-search"]').type('barber');
  cy.get('[data-testid="filter-location"]').select('Sydney');
  cy.get('[data-testid="job-card"]').should('be.visible');
});
```

## Design System

### Colors
- **Primary Red**: `hsl(0, 84%, 35%)` - Used for CTAs and highlights
- **Neutral Grays**: `hsl(20, 14.3%, 4.1%)` to `hsl(20, 5.9%, 90%)`
- **Chrome Effects**: CSS gradients for metallic appearance

### Typography
- **Headers**: Inter font family, font-semibold
- **Body**: Inter font family, regular weight
- **Code**: Monospace for technical content

### Components
- Use shadcn/ui components as base
- Extend with custom styling for Black & Chrome theme
- Ensure proper contrast ratios for accessibility

## Environment Variables

Required environment variables for development:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## Architecture Overview

### Frontend (React/TypeScript)
- **Components**: Modular, reusable UI components
- **Pages**: Route-specific page components
- **Hooks**: Custom React hooks for shared logic
- **Services**: API communication and business logic

### Backend (Node.js/Express)
- **Routes**: RESTful API endpoints
- **Storage**: Memory-based storage (development)
- **Schema**: Shared TypeScript types and validation

### Database (Future)
- **PostgreSQL**: Production database
- **Drizzle ORM**: Type-safe database queries
- **Migrations**: Database schema versioning

## Getting Help

- **Issues**: Create GitHub issues for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check existing documentation first
- **Code Review**: All PRs require review before merging

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help newcomers get started
- Maintain professional communication

Thank you for contributing to Snipshift! 🚀