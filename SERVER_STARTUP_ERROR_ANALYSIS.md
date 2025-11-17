# Server Startup Error Analysis

## Error Summary

**Error Message:**
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Users\USER\Snipshift\snipshift\snipshift-next-restored\api\src\index.ts'
```

## Root Cause

The `package.json` script `dev:server` is configured to run:
```json
"dev:server": "tsx watch snipshift-next-restored/api/src/index.ts"
```

However, the directory `snipshift-next-restored` **does not exist** in the codebase.

## Current Directory Structure

- ✅ `snipshift-next/` exists (contains `web/` subdirectory)
- ❌ `snipshift-next-restored/` does NOT exist
- ❌ `snipshift-next-restored/api/src/index.ts` does NOT exist

## Impact

1. **Server cannot start** - The `dev:server` command fails immediately
2. **E2E tests cannot run** - `test:e2e:ci` depends on `start:ci:servers` which runs `dev:server`
3. **Development workflow blocked** - Cannot start development servers

## Affected Scripts

All scripts that reference `snipshift-next-restored`:
- `dev:server` (line 10)
- `dev:server:doppler` (line 11)
- `build:server` (line 17)
- `start:dev` (line 20)
- `start:dev:doppler` (line 21)

## Next Steps

1. **Identify correct server entry point** - Find where the actual API server code is located
2. **Update package.json scripts** - Fix all references to use the correct path
3. **Verify server can start** - Test that the corrected scripts work
4. **Re-run E2E tests** - Verify the job posting flow test can execute

## Files to Investigate

- Check if server code exists in `snipshift-next/api/`
- Check if there's a `server/` directory with entry point
- Look for alternative server startup scripts
- Check for `test-server.js` or similar files

