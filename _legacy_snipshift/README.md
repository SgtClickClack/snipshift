# Legacy Snipshift - Quarantined Files

This folder contains unused or legacy scripts moved during the Knip audit cleanup.

**Contents:**
- `run-migration.ts` - One-off migration runner (bypasses psql)
- `list-users.ts` - List users script
- `verify-test-user.ts` - Test user verification script

**Usage:** Run from project root, e.g.:
```bash
npx tsx _legacy_snipshift/run-migration.ts
npx tsx _legacy_snipshift/list-users.ts
npx tsx _legacy_snipshift/verify-test-user.ts <email>
```
