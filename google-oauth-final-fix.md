# Google OAuth Final Fix - Add Missing Redirect URIs

## CONFIRMED: Root Cause Identified
Screenshot shows "Error 401: invalid_client" when accessing from:
`/signup?role=professional`

## IMMEDIATE ACTION REQUIRED

Add these 6 URLs to **Authorized redirect URIs** in Google Cloud Console:

```
https://b9c30b6a-0bb9-491f-8312-4ea2996a1e40-00-1z5x1ywkgc76h.picard.replit.dev/login
https://b9c30b6a-0bb9-491f-8312-4ea2996a1e40-00-1z5x1ywkgc76h.picard.replit.dev/signup  
https://b9c30b6a-0bb9-491f-8312-4ea2996a1e40-00-1z5x1ywkgc76h.picard.replit.dev/signup?role=professional
https://b9c30b6a-0bb9-491f-8312-4ea2996a1e40-00-1z5x1ywkgc76h.picard.replit.dev/signup?role=hub
https://b9c30b6a-0bb9-491f-8312-4ea2996a1e40-00-1z5x1ywkgc76h.picard.replit.dev/signup?role=brand
https://b9c30b6a-0bb9-491f-8312-4ea2996a1e40-00-1z5x1ywkgc76h.picard.replit.dev/signup?role=trainer
```

## STEPS:
1. Google Cloud Console → OAuth Client ID
2. Scroll to "Authorized redirect URIs" 
3. Click "+ ADD URI" for each URL above
4. Click "SAVE"
5. Test immediately from `/signup?role=professional`

This will resolve the OAuth error in 2-5 minutes after saving.