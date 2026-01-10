# 🎯 HospoGo - Project Handover Document

**Version:** 1.1.1  
**Date:** December 16, 2025  
**Status:** ✅ Launch Ready

---

## 📊 Executive Summary

HospoGo is a gig economy platform ("Uber for Barbers") connecting barbershops/salons with freelance professionals. The codebase has been fully audited and stabilized:

| Metric | Status |
|--------|--------|
| Build Status | ✅ Passing (10.2s) |
| Type Errors | ✅ 0 critical (447 → 0) |
| Mobile Ready | ✅ Audited & Fixed |
| PWA Support | ✅ Enabled |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  React 18 + Vite + TypeScript + TailwindCSS                 │
│  Port: 5173                                                  │
└─────────────────────┬───────────────────────────────────────┘
                      │ REST API (Bearer Token Auth)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                         API                                  │
│  Express.js + TypeScript + Drizzle ORM                      │
│  Port: 5000                                                  │
└─────────────────────┬───────────────────────────────────────┘
                      │ SQL (Drizzle)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                      PostgreSQL                              │
│  Hosted on Railway/Neon/etc.                                │
└─────────────────────────────────────────────────────────────┘

External Services:
├── Firebase Auth + Storage
├── Stripe Connect (Payments)
├── Resend (Emails)
└── Google Maps API
```

---

## 📁 Key File Locations

### Frontend (`/src`)

| Area | Path | Description |
|------|------|-------------|
| **Entry Point** | `src/main.tsx` | App bootstrap |
| **Routes** | `src/App.tsx` | All route definitions |
| **Auth Context** | `src/contexts/AuthContext.tsx` | User auth state |
| **API Client** | `src/lib/api.ts` | Backend API calls |
| **Query Client** | `src/lib/queryClient.ts` | TanStack Query setup |
| **Types** | `src/shared/types.ts` | Shared TypeScript types |

### Key Pages

| Page | Path | Description |
|------|------|-------------|
| **Professional Dashboard** | `src/pages/professional-dashboard.tsx` | Main pro view |
| **Hub Dashboard** | `src/pages/hub-dashboard.tsx` | Business owner view |
| **Shop Schedule** | `src/pages/shop/schedule.tsx` | Calendar scheduling |
| **Job Feed** | `src/pages/job-feed.tsx` | Browse available shifts |
| **Profile** | `src/pages/profile.tsx` | User profile |

### Key Components

| Component | Path | Purpose |
|-----------|------|---------|
| **Navbar** | `src/components/layout/Navbar.tsx` | Main navigation |
| **Calendar** | `src/components/calendar/professional-calendar.tsx` | Large calendar view |
| **AssignStaffModal** | `src/components/calendar/assign-staff-modal.tsx` | Staff assignment |
| **ShiftBlock** | `src/components/calendar/shift-block.tsx` | Shift display |

### Backend (`/api`)

| Area | Path | Description |
|------|------|-------------|
| **Entry Point** | `api/index.ts` | API bootstrap |
| **Routes** | `api/_src/routes/*.ts` | API endpoints |
| **DB Schema** | `api/_src/db/schema.ts` | Drizzle schema |
| **Migrations** | `api/drizzle/*.sql` | DB migrations |
| **Auth Middleware** | `api/_src/middleware/auth.ts` | Token verification |

---

## 🔧 Environment Setup

### Required Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/snipshift

# Firebase
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_xxx
STRIPE_SECRET_KEY=sk_xxx

# Resend (Email)
RESEND_API_KEY=re_xxx

# Google Maps
VITE_GOOGLE_MAPS_API_KEY=xxx

# API Config
PORT=5000
NODE_ENV=development
```

---

## 🚀 Quick Start Commands

```bash
# Install dependencies
npm install
cd api && npm install

# Run both frontend + backend
npm run dev:all

# Build for production
npm run build

# Run E2E tests
npm run test:e2e

# Database operations (in api/)
cd api
npm run db:clean        # Reset DB
npm run migrate         # Run migrations
```

---

## 🎨 UI/UX Key Decisions

### Design System
- **Framework:** TailwindCSS + Radix UI (shadcn/ui components)
- **Theme:** Light/Dark mode support via CSS variables
- **Colors:** Defined in `src/index.css` `:root` and `.dark`

### Mobile Responsiveness
- **Touch Targets:** Minimum 44px (Apple standard) - enforced in calendar events
- **Modal Behavior:** Full-width buttons on mobile, stacked vertically
- **Navigation:** Sheet-based hamburger menu on mobile
- **Scroll Fix:** `overflow-x: hidden` on html/body

### Calendar (React Big Calendar)
- **Views:** Week (desktop), Day (mobile), Agenda
- **Shift States:**
  - `draft` (gray, dashed) - Ghost slot, ready for assignment
  - `open` (blue) - Posted, accepting applications
  - `invited` (amber) - Invite sent, awaiting response
  - `confirmed` (green) - Assigned, locked in
  - `completed` (slate) - Finished
  - `cancelled` (rose) - Cancelled

---

## 🔐 Authentication Flow

1. User signs in via **Firebase Auth** (Google OAuth or email/password)
2. Frontend receives Firebase ID token
3. All API requests include `Authorization: Bearer <token>`
4. Backend verifies token via Firebase Admin SDK
5. User data synced to PostgreSQL `users` table

### Role System
- **professional** - Freelance barber/stylist
- **hub/business** - Shop owner
- **admin** - Platform admin
- **trainer** - Training/certification provider

---

## 💳 Payment Flow (Stripe Connect)

1. **Professional Onboarding:** Creates Stripe Connected Account
2. **Shift Completion:** Business pays via platform
3. **Payout:** Platform transfers to professional's Stripe account
4. **Platform Fee:** Configurable percentage retained

---

## ⚠️ Known Limitations

1. **Dependabot Alerts:** 16 vulnerabilities flagged (7 high) - review `npm audit`
2. **Large Bundle:** `professional-calendar.tsx` is 3175 lines - consider splitting
3. **No Offline Mode:** PWA caches assets but doesn't sync offline data
4. **Email Templates:** Basic - could use HTML email improvements

---

## 🔮 Future Improvements (Backlog)

- [ ] Implement recurring shift templates
- [ ] Add push notifications (Firebase Cloud Messaging)
- [ ] Split large components (calendar, dashboard)
- [ ] Add more comprehensive E2E test coverage
- [ ] Implement rate limiting on API
- [ ] Add WebSocket for real-time updates (currently polling)

---

## 📞 Support Contacts

- **Repository:** https://github.com/SgtClickClack/snipshift
- **Email:** support@snipshift.com

---

## ✅ Pre-Launch Checklist

- [x] Build passes with no errors
- [x] Type safety verified (0 critical errors)
- [x] Mobile responsive (44px touch targets)
- [x] Modal accessibility (full-width mobile buttons)
- [x] PWA manifest configured
- [x] Environment variables documented
- [x] Database migrations ready
- [x] Authentication flow working

---

**Generated:** December 16, 2025  
**Last Build:** ✅ 10.24s

