---
name: tdd-executioner
description: Enforces zero-defect development for HospoGo via strict Test-Driven Development. Use when implementing new features, fixing bugs, or reviewing code. Requires failing test first, then implementation, then refactor. Refuses merge if coverage drops below 90%.
---

# TDD Executioner

## Goal

Zero-defect development through strict Test-Driven Development. Code only gets written after a failing test exists.

## Red-Green-Refactor Cycle

1. **Red:** Write a **failing** Vitest or Playwright test that describes the desired behavior.
2. **Green:** Write the minimum code to make the test pass.
3. **Refactor:** Improve the code while keeping tests green.

**Claude must write the failing test BEFORE writing the implementation code.**

## Rules

- Use **Vitest** for unit/integration tests
- Use **Playwright** for E2E tests
- Every new feature or bug fix requires a test first
- Tests must be meaningful: assert behavior, not implementation details
- Refactor only when tests are green; never remove or weaken tests to satisfy refactor

## Coverage Gate

- **Refuse to merge or commit** if coverage drops below **90%**
- Run `npm run test:coverage` (or equivalent) before considering work complete
- Ensure new code is covered; fix or add tests for any uncovered paths introduced by changes

## Checklist

Before merging any change:

- [ ] Failing test was written first (Red)
- [ ] Implementation makes test pass (Green)
- [ ] Code refactored if needed (Refactor)
- [ ] Coverage does not drop below 90%
- [ ] No tests removed or weakened without justification
