# HospoGo (Snipshift) - Claude Code Guidance

## Project Context
- **Project Name:** HospoGo (formerly Snipshift)
- **Product:** Hospitality staffing + scheduling marketplace
- **Repo:** `C:\Users\USER\Snipshift`
- **Primary UI:** `src/` (React/TS), API: `api/` (Node.js)

## Tech Stack
- **Runtime:** Node.js (>=24.4.1)
- **Build:** Vite
- **Frontend:** React, React Router
- **Auth:** Firebase Auth
- **Database:** PostgreSQL with Drizzle ORM

## Architecture
The codebase is modularized into three application domains (Vite manual chunks):
- **app-professional** — Professional/worker-facing features (shifts, applications, earnings)
- **app-venue** — Venue-facing features (job posting, roster, calendar)
- **app-admin** — Admin tools (CTO dashboard, health, leads, marketplace liquidity)

Keep concerns separated; avoid cross-chunk circular dependencies.

## Strict Standards
- **Date/Time:** Use UTC ISO 8601 for all date/time logic. Store and compute in UTC; localize only at display.
- **Currency:** Use ISO 4217 for all currency handling (e.g. `AUD`, `USD`). Reference `src/lib/currency.ts` for existing utilities.
- **TDD:** Follow Test-Driven Development—always check for or create tests before implementing logic.

## Behavioral Rules
- **Never ask for permission** for file edits or terminal commands (unless destructive: `rm -rf`, hard resets, etc.).
- **Always check for existing utility functions** before writing new ones to keep the codebase DRY.
- **Do not ask the user "what to do next"**—if a task is defined, execute it to completion.

## Workflow Rules
- Always read `HOSPOGO_LAUNCH_ROADMAP.md` and tracking files before starting work.
- After finishing a task, update `DEVELOPMENT_TRACKING_PART_02.md` and adjust the roadmap if needed.
- Never update the legacy consolidated tracking file.
- Do not touch unrelated code; keep changes tightly scoped.

## Code Standards
- Components in `src/components/` (PascalCase), utilities in `src/utils/` (camelCase).
- Maintain separation of concerns; avoid duplication by reusing existing code.
- Keep files under 300 lines when possible; refactor large files.
- Add JSDoc/TSDoc for public functions and complex logic.
- Respect dev/test/prod environments; do not hardcode env-specific behavior.
- Never overwrite `.env` files without explicit user request.

## Testing
- Maintain >= 80% coverage for unit, integration, and performance tests.
- Use mocks only in tests, never in dev/prod code.
- Add/adjust tests for any major change.

## Documentation
- Keep README and docs in sync with code.
- Include tracking entry sections: Core Components, Key Features, Integration Points, File Paths, Next Priority Task, Code Organization & Quality.

## Safety
- Avoid destructive commands (`rm -rf`, hard resets) unless explicitly asked.
- Prefer reversible actions and git status checks before/after changes.
