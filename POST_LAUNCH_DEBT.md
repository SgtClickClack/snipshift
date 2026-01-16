# Post-Launch Technical Debt

This document tracks technical debt items identified during the final pre-launch audit. These items are non-blocking for launch but should be addressed in future iterations.

## 🔴 High Priority (Address Soon)

### 1. Console Log Cleanup
**Location**: Multiple files across `src/` and `api/_src/`
**Issue**: Extensive use of `console.log`, `console.error`, and `console.warn` statements throughout the codebase
**Impact**: 
- Performance overhead in production
- Potential information leakage in browser console
- Cluttered logs making debugging harder
**Action**: 
- Replace with proper logging service (e.g., structured logger)
- Remove debug console.logs from production builds
- Keep only critical error logging with proper sanitization

**Files with excessive console usage:**
- `src/components/calendar/professional-calendar.tsx` (50+ console statements)
- `src/pages/onboarding.tsx` (20+ console statements)
- `api/_src/routes/shifts.ts` (100+ console statements)
- `api/_src/routes/webhooks.ts` (30+ console statements)

### 2. Type Safety Improvements
**Location**: Multiple files
**Issue**: Use of `any` types in critical paths
**Impact**: Potential runtime errors, reduced IDE support, harder refactoring
**Action**: Replace `any` types with proper TypeScript interfaces

**Notable instances:**
- `src/pages/venue-dashboard.tsx`: Multiple `as any` casts for job/shift data
- `src/contexts/PusherContext.tsx`: `error: any` in error handlers
- `api/_src/middleware/errorHandler.ts`: Extensive `any` usage for error extraction

### 3. Profile Image URL Standardization
**Location**: `src/contexts/AuthContext.tsx` (lines 24-25)
**Issue**: Multiple field names for profile images (`profileImageURL`, `avatarUrl`, `profileImage`)
**Impact**: Inconsistent data access, potential bugs
**Action**: Standardize on single field name across entire codebase

## 🟡 Medium Priority (Address in Next Sprint)

### 4. Credits System Integration
**Location**: `api/_src/index.ts` (line 1424)
**Issue**: TODO comment indicates credits table/field needs implementation
**Action**: Design and implement credits system for subscription-based features

### 5. Stripe Checkout API Integration
**Location**: `api/_src/index.ts` (line 1454)
**Issue**: TODO comment for Stripe Checkout API integration
**Action**: Complete Stripe Checkout flow implementation

### 6. Rating System Integration
**Location**: `api/_src/routes/shifts.ts` (line 550)
**Issue**: Rating calculation from reviews not implemented
**Action**: Implement rating aggregation from shift reviews

### 7. Notification System Enhancements
**Location**: `src/components/calendar/professional-calendar.tsx` (line 1397)
**Issue**: TODO for triggering notifications to professionals
**Action**: Implement real-time notifications for shift updates

### 8. Session Management
**Location**: `api/_src/routes/users.ts` (line 1077)
**Issue**: Session view toggle needs proper session management system
**Action**: Implement comprehensive session management

### 9. Appeals System
**Location**: `api/_src/routes/appeals.ts` (lines 251, 285)
**Issue**: Appeals table not implemented, placeholder values used
**Action**: Design and implement appeals system for dispute resolution

### 10. Waitlist Notification Service
**Location**: `api/_src/services/waitlist-notification.service.ts` (lines 110, 124, 194)
**Issues**: 
- SendGrid email sending not implemented
- Twilio SMS sending not implemented
- Secure token generation for waitlist not implemented
**Action**: Complete notification service implementations

## 🟢 Low Priority (Nice to Have)

### 11. Job Feed Enhancements
**Location**: `src/pages/job-feed.tsx` (line 310)
**Issue**: Job type filtering needs API data structure alignment
**Action**: Align frontend filtering with backend API structure

### 12. Saved Shifts/Jobs Feature
**Location**: 
- `src/pages/shift-details.tsx` (line 27)
- `src/pages/job-details.tsx` (line 26)
**Issue**: Currently using local state only, needs backend persistence
**Action**: Implement saved items feature with database persistence

### 13. Analytics Dashboard
**Location**: 
- `src/components/analytics/analytics-dashboard.tsx` (line 14)
- `src/components/dashboard/professional-overview.tsx` (line 324)
**Issue**: Analytics API not implemented
**Action**: Design and implement analytics collection and display

### 14. Earnings & Payout Features
**Location**: 
- `src/pages/earnings.tsx` (lines 76, 114, 133)
- `src/components/payments/earnings-dashboard.tsx` (line 194)
**Issue**: 
- Wallet API not implemented
- Withdrawal API not implemented
- Invoice download not implemented
**Action**: Complete earnings and payout functionality

### 15. Training Module Features
**Location**: `src/components/training/training-hub.tsx` (lines 360, 385)
**Issue**: Video player modal/page not implemented
**Action**: Implement video player for training modules

### 16. Application Navigation
**Location**: `src/pages/professional-dashboard/ApplicationsView.tsx` (lines 50, 55)
**Issue**: Navigation to job details and messaging not implemented
**Action**: Complete navigation flows for applications view

### 17. Professional Status Tracking
**Location**: `api/_src/routes/professional.ts` (line 497)
**Issue**: Status update tracking needs database implementation
**Action**: Implement status tracking system

### 18. Subscription Plan Stripe Price IDs
**Location**: `api/_src/scripts/seed-plans.ts` (lines 54, 71)
**Issue**: Placeholder Stripe Price IDs need to be replaced
**Action**: Update with actual Stripe Price IDs from production Stripe account

### 19. E2E Test User Requirements
**Location**: `e2e/navigation.spec.ts` (line 20)
**Issue**: Test requires valid test user setup
**Action**: Document and automate test user setup for E2E tests

## 📝 Notes

- All TODO/FIXME comments have been catalogued
- Priority levels are based on impact on user experience and system stability
- High priority items should be addressed in the first post-launch sprint
- Medium priority items can be scheduled for subsequent sprints
- Low priority items are feature enhancements that can be added based on user feedback

## 🔄 Review Schedule

This document should be reviewed:
- Weekly during first month post-launch
- Monthly thereafter
- Before each major feature release
