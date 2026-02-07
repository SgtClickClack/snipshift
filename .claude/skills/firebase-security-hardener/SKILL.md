---
name: firebase-security-hardener
description: Protects the B2B marketplace logic for HospoGo. Use when writing Firestore rules, auth logic, API routes, or any code that touches venues, users, or marketplace data. Enforces hydration guards, path normalization, and ID obfuscation.
---

# Firebase Security Hardener

## Goal

Protect the B2B marketplace logic from abuse, leakage, and invalid writes. Never expose internal identifiers or allow unauthorized access.

## Rules

### 1. 10-Second Hydration Guard

Audit **every Firestore write** to ensure it passes the hydration guard:

- Reject writes that occur within 10 seconds of app hydration (client-side auth may not be fully propagated)
- Implement server-side or rule-level checks that tokens/claims are valid before allowing writes
- Document any write paths that bypass this guard and why

### 2. Auth-Protected Routes

All auth-protected routes must have:

- **Custom path-normalization middleware:** Sanitize and validate path parameters before processing
- Prevent path traversal (`../`, encoded variants)
- Validate route parameters match expected format (e.g., alphanumeric, length limits)
- Reject malformed or suspicious paths with 400/403

### 3. Venue ID Obfuscation

**Never expose internal Venue IDs** in URLs, API responses, or client state.

- Use **obfuscated public handles** (e.g., slug, short hash, or opaque token) for public-facing identifiers
- Map public handles to internal IDs only on the server
- Ensure Firestore rules and API logic validate via handles, not raw IDs, when dealing with external clients

## Checklist

Before merging any Firebase/auth/venue-related code:

- [ ] All Firestore writes pass the 10-second hydration guard or are explicitly documented
- [ ] Auth-protected routes use path-normalization middleware
- [ ] No internal Venue IDs leaked; only obfuscated handles exposed
- [ ] Firestore rules and API logic validate handles correctly
