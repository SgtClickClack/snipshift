# State Integrity Audit Report
**Date**: 2026-01-20  
**Auditor**: Principal System Architect  
**Scope**: Business-critical data persistence audit

## Executive Summary

This audit identified **3 critical issues** where business-critical data is stored in browser storage instead of the database, and **1 issue** where notification settings are not being persisted.

## Task 1: Unsafe Storage Analysis

### ✅ Safe Storage (UI Preferences Only)
- **Auth tokens/bridge** (`hospogo_auth_bridge`, `hospogo_bridge_token`) - Temporary auth state, acceptable
- **Theme preferences** - UI-only, acceptable
- **Banner dismissals** (`hospogo_setup_banner_dismissed`, `verification_banner_dismissed`) - UI preferences, acceptable
- **E2E test flags** - Test infrastructure, acceptable
- **Onboarding cache** (`HOSPOGO_ONBOARDING_CACHE`) - Temporary progress cache, acceptable

### ❌ Critical Issues Found

#### 1. Calendar Favorites (HIGH PRIORITY)
**Location**: `src/components/calendar/professional-calendar.tsx`
- **Issue**: Favorite professional IDs stored in `localStorage` key `favorite-professionals-{userId}`
- **Impact**: Favorites lost on logout/clear cache, not synced across devices
- **Fix Required**: Move to database (user preferences or user settings table)

#### 2. Notification Settings (HIGH PRIORITY)
**Location**: `src/pages/settings.tsx`
- **Issue**: `handleNotificationsSave` only simulates API call with `setTimeout`, does not persist to database
- **Impact**: Notification preferences not saved, lost on page refresh
- **Fix Required**: Implement `PATCH /api/users/settings` endpoint and update handler

#### 3. Business Settings Fallback (MEDIUM PRIORITY)
**Location**: `src/components/settings/business-settings.tsx`
- **Issue**: Still saves to localStorage as backup after API call
- **Impact**: Redundant storage, but not critical since API is primary
- **Fix Required**: Remove localStorage fallback (already fixed in calendar component)

## Task 2: Stripe Payout State Evaluation

### Current Implementation
- **Status**: Tracked in `users.stripeOnboardingComplete` (boolean)
- **Venue Status**: `venues.status` enum (`pending` | `active`) already tracks Stripe onboarding completion
- **Assessment**: The `venues.status` field is sufficient for tracking Stripe onboarding at the venue level
- **Recommendation**: No additional field needed. The existing `venues.status` field serves this purpose.

### Verification
- Venue status is set to `active` when Stripe onboarding is complete
- Venue status is `pending` when awaiting Stripe onboarding
- This aligns with the business logic requirement

## Task 3: Notification Sync Verification

### Current State
- **Status**: ❌ NOT PERSISTED
- **Location**: `src/pages/settings.tsx:196`
- **Issue**: `handleNotificationsSave` only simulates save with `setTimeout`
- **Missing**: No API endpoint call to persist notification preferences

### Required Fix
1. Create `PATCH /api/users/settings` endpoint (or extend `PUT /api/me`)
2. Add notification preferences to user schema or user settings table
3. Update `handleNotificationsSave` to call API endpoint

## Task 4: Humanization Check

### Messages Reviewed
- ✅ "Schedule saved" - Clean, no double dashes
- ✅ "Settings saved" - Clean, no double dashes
- ✅ "Saving..." - Clean, no double dashes
- ✅ "Your notification preferences have been updated." - Clean, natural language

**Result**: All saving/syncing messages are already humanized.

## Recommendations

### Priority 1 (Critical) ✅ COMPLETED
1. ✅ **Fix notification settings persistence** - Implemented `PATCH /api/users/settings` endpoint and updated handler
2. ✅ **Move calendar favorites to database** - Added `favoriteProfessionals` field to users table and updated calendar component

### Priority 2 (Important) ✅ COMPLETED
3. ✅ **Remove business settings localStorage fallback** - Removed redundant localStorage storage

### Priority 3 (Nice to Have)
4. ✅ **User preferences centralized** - All preferences now stored in users table (notificationPreferences, favoriteProfessionals)

## Implementation Completed

1. ✅ Added `notificationPreferences` field to users table (JSONB)
2. ✅ Added `favoriteProfessionals` field to users table (text array)
3. ✅ Created `PATCH /api/users/settings` endpoint
4. ✅ Updated notification settings handler to use API
5. ✅ Updated calendar component to save/load favorites from API
6. ✅ Removed localStorage fallback from business settings
7. ✅ Verified Stripe onboarding status tracking (venues.status field is sufficient)

## Verification Results

### Stripe Payout State
- **Status**: ✅ VERIFIED
- **Implementation**: `venues.status` enum field tracks Stripe onboarding
  - `pending` = Awaiting Stripe onboarding
  - `active` = Stripe payouts enabled (onboarding complete)
- **Webhook Handler**: Properly updates venue status when Stripe account.updated event fires
- **Conclusion**: No additional field needed - existing implementation is correct

### Notification Settings
- **Status**: ✅ FIXED
- **Before**: Mock implementation with setTimeout
- **After**: Properly saves to `PATCH /api/users/settings` endpoint
- **Persistence**: Stored in `users.notificationPreferences` JSONB field

### Calendar Favorites
- **Status**: ✅ FIXED
- **Before**: Stored in localStorage
- **After**: Stored in `users.favoriteProfessionals` array field
- **Persistence**: Automatically synced across devices

### Humanization Check
- **Status**: ✅ VERIFIED
- **Result**: All saving/syncing messages are already humanized
- **No double-dashes found** in any success or loading messages
