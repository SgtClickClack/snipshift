---
name: performance-budget-enforcer
description: Enforces a "lightweight first" policy for HospoGo. Use when adding dependencies, building new routes, or reviewing bundle size. Rejects heavy dependencies, forces code-splitting and lazy-loading for venue dashboard sub-routes.
---

# Performance Budget Enforcer

## Goal

Keep the app lightweight and fast. Reject bloat. Enforce strict code-splitting for the venue dashboard.

## Rules

### Lightweight First

- **Reject any heavy dependencies** — prefer small, focused libraries over monolithic ones
- Before adding a dependency: check bundle size, tree-shakeability, and alternatives
- If a heavy dep is proposed, demand justification and a lighter alternative

### Code-Splitting / Lazy-Loading

- **Force code-splitting and lazy-loading for all venue dashboard sub-routes**
- Each sub-route of the venue dashboard must be lazy-loaded (e.g., `React.lazy` + `Suspense`)
- Ensure route chunks align with Vite manual chunks (app-venue, app-professional, app-admin)
- No eager-loading of dashboard-only code on the landing or onboarding flows

### Review Checklist

- [ ] New dependencies are lightweight and justified
- [ ] Venue dashboard sub-routes use lazy-loading
- [ ] No monolithic imports that pull in unused code
