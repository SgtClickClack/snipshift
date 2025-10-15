# ⚡ Quick Testing Reference Card

## 🚀 Instant Commands

### Run Tests Fast
```bash
npm run cypress:open          # Interactive runner
npm run test:fast             # Ultra-fast smoke tests  
npm run test:watch            # Auto-reload mode
npm run test:single "path"    # Single test file
```

### Component Testing
```bash
npm run cypress:component:open  # Component test runner
npm run cypress:component:run   # Run all component tests
```

## 🛡️ API Mocking Patterns

### Mock Login
```typescript
cy.mockLoginSuccess('professional')
cy.instantLogin('professional')
```

### Mock Any API
```typescript
cy.mockApiResponse('GET', '/api/shifts', {
  shifts: [{ id: '1', title: 'Test Shift' }]
})
```

### Mock User Data
```typescript
cy.mockUserProfile('professional')
```

## 🎯 Focus Testing

### Run Single Test
```typescript
it.only('should do something', () => {
  // Only this test runs
})
```

### Run Single File
```bash
npm run test:single "cypress/e2e/auth.cy.ts"
```

## 🧩 Component Testing

### Mount Component
```typescript
cy.mount(<MyComponent prop="value" />)
```

### Setup Component Mocks
```typescript
beforeEach(() => {
  cy.setupComponentMocks()
})
```

## ⚡ Speed Optimizations

| What | Slow Way | Fast Way |
|------|----------|----------|
| **Login** | UI interaction | `cy.instantLogin()` |
| **API Calls** | Real requests | `cy.mockApiResponse()` |
| **Component Test** | Full E2E | `cy.mount()` |
| **Single Test** | Full suite | `.only` or `--spec` |

## 🎯 Development Workflow

1. **Start**: `npm run cypress:open`
2. **Focus**: Click one test file
3. **Debug**: Add `.only` to specific test
4. **Speed**: Use mocks and programmatic login
5. **Components**: Use component testing for UI

## 📊 Expected Times

- **Full E2E Suite**: 5-10 minutes
- **Single E2E Test**: 30-60 seconds  
- **Mocked E2E Test**: 5-15 seconds
- **Component Test**: 2-5 seconds

**Goal: Get from minutes to seconds! 🎉**
