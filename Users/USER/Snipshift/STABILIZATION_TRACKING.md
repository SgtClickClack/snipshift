### Snipshift Stabilization Tracking - Code Audit Fixes
---
This file tracks progress on the critical issues identified by the holistic code audit.
#### Critical Priority 1: Authentication & Session Stability (Completed: 90%)
- [x] Migrate in-memory session (global.sessions) to Redis.
- [x] Implement Google ID token verification (GraphQL/REST).

#### Critical Priority 2: Architectural Integrity (In Progress)
- [x] Restore TypeScript source files for API backend.
  - Completed 2025-11-12: ported all GraphQL resolvers, session services, and the server bootstrap (`src/index.ts`) to TypeScript with successful recompilation and tests.
- [x] Fix root scripts targeting missing 'server/index.ts'.
  - Updated 2025-11-12: Root scripts now target `snipshift-next-restored/api/src/index.ts` for local dev, Doppler, and build workflows.
- [ ] Break up overly complex 'mobile-api.ts' file.

#### Critical Priority 3: Frontend Module Health
- [ ] Restore or implement missing shared/UI components (e.g., '@shared/types', '@/components/ui/button').
  - [x] Recreated `Job` and `User` interfaces within `@shared/types` to unblock marketplace modules (2025-11-12).

---
Tracking file created and pre-populated with initial status.
