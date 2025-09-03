# OAuth Domain Troubleshooting - Still Getting Error 401

## Current Status
- ✅ Client ID is correct: 399353553154-63hnrqcqpf5m2mqzdu6oq28glhz7.apps.googleusercontent.com
- ❌ Still getting "Error 401: invalid_client"

## Most Likely Cause: Domain Mismatch
The Client ID is working, but Google can't verify the domain. This means the domain in Google Cloud Console doesn't exactly match the current Replit domain.

## Current Replit Domain
```
https://b9c30b6a-0bb9-491f-8312-4ea2996a1e40-00-1z5x1ywkgc76h.picard.replit.dev
```

## Things to Check in Google Cloud Console

### 1. Exact Domain Match
Go to your OAuth client in Google Cloud Console and verify the "Authorized JavaScript origins" contains EXACTLY:
```
https://b9c30b6a-0bb9-491f-8312-4ea2996a1e40-00-1z5x1ywkgc76h.picard.replit.dev
```

### 2. Common Mistakes
- ❌ Missing `https://`
- ❌ Extra trailing slash: `https://domain.com/`
- ❌ Extra spaces before or after
- ❌ Wrong subdomain or typo
- ❌ Using HTTP instead of HTTPS

### 3. Propagation Delay
Even with correct domain, changes can take 5-15 minutes to propagate.

## Quick Test Solution
Add `http://localhost:5000` to authorized origins for immediate local testing.

## Next Steps
1. Double-check domain in Google Cloud Console
2. Wait 10-15 minutes if you just made changes
3. Try localhost testing if needed
4. Clear browser cache and retry