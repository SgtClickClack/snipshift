---
name: pwa-offline-guardian
description: Ensures HospoGo works reliably in spotty hospitality Wi-Fi. Use when adding data fetches, images, or assets, or when implementing UI that depends on network. Enforces retry logic, Service Worker precache, and optimistic UI updates.
---

# PWA Offline Guardian

## Goal

Ensure the app works in spotty hospitality Wi-Fi. Users should never see stale failures or endless spinners when the network is unreliable.

## Rules

### 1. Retry-Logic Helper

**Always wrap data fetches** in a retry-logic helper:

- Use exponential backoff (e.g., 1s, 2s, 4s)
- Max retries: 3–5 depending on criticality
- Log failures for debugging
- Consider `fetch` + `AbortController` for cancellable requests
- Reference existing utilities in `src/` before creating new ones

### 2. Service Worker Precache

**Check that any new image or asset** is added to the Service Worker precache list:

- Update `public/firebase-messaging-sw.js` or the main SW manifest
- Ensure critical app shell assets and landing images are precached
- Verify new routes/pages that must work offline have their assets listed

### 3. Optimistic UI Updates

Implement **Optimistic UI** for user-triggered actions:

- Show success immediately (e.g., toast, checkmark)
- Sync in background; queue writes if offline
- Revert or surface error only if sync fails after retries
- Never block the user on network for non-critical operations

## Checklist

Before finishing any feature that touches network or assets:

- [ ] Data fetches wrapped in retry-logic helper
- [ ] New images/assets added to Service Worker precache
- [ ] User actions use optimistic UI (immediate feedback, background sync)
- [ ] Error states are clear and actionable when sync fails
