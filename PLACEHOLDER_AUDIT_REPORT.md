# Placeholder, TODO, and Mock Data Audit Report

## Executive Summary
This audit identified several user-visible placeholders, unfinished features marked with TODOs, and instances of hardcoded mock data. The most critical findings are visible text indicating missing features in the Hub Dashboard and hardcoded mock bookings in the Professional Dashboard.

## 1. Visible to User (Critical)
These items are directly visible to the user and indicate unfinished work.

### Pages & Components
- **Hub Dashboard (`src/pages/hub-dashboard.tsx`)**
  - **Text:** "Profile management features will be available here." (Profile Tab)
  - **Text:** "Applications will be displayed here when available." (Applications Tab)
  
- **Professional Dashboard (`src/pages/professional-dashboard.tsx`)**
  - **Mock UI:** The "Calendar" tab displays hardcoded mock bookings ("Haircut & Styling", "Beard Trim") labeled with `/* Mock bookings for demonstration */`.
  
- **Community Feed (`src/components/social/community-feed.tsx`)**
  - **Toast Message:** "Comments coming soon" / "Commenting functionality is not yet implemented in the backend." when trying to comment.

- **Coming Soon Page (`src/pages/coming-soon.tsx`)**
  - **Entire Page:** A dedicated "Coming Soon" page exists, intended for features under development.

- **Demo Page (`src/pages/demo.tsx`)**
  - **Entire Page:** A landing page for "Snipshift Platform Demo" with quick login for different roles. Ensure this is not accessible in production if not intended.

## 2. Internal / Tech Debt (Code Comments)
These are developer comments indicating missing backend connections or logic.

### Dashboards
- **Hub Dashboard (`src/pages/hub-dashboard.tsx`)**
  - `// TODO: Connect to messaging service` (Stats)
  - `// TODO: Connect to hiring service` (Stats)

- **Professional Dashboard (`src/pages/professional-dashboard.tsx`)**
  - `// TODO: Connect to booking system` (Stats)
  - `// TODO: Connect to messaging service` (Stats)
  - `// TODO: Connect to rating system` (Stats)

- **Trainer Dashboard (`src/pages/trainer-dashboard.tsx`)**
  - `// TODO: Connect to rating system` (Stats)

### Features
- **Community Feed (`src/components/social/community-feed.tsx`)**
  - `// TODO: Implement comments backend`

- **Auth Context (`src/contexts/AuthContext.tsx`)**
  - `// TODO: Sync with backend` (User profile updates)

## 3. Hardcoded Mock Data
Data structures hardcoded in components instead of being fetched from an API.

- **Professional Dashboard (`src/pages/professional-dashboard.tsx`)**
  - Mock bookings data array inside the render logic for the 'calendar' view.
  
- **Hub Dashboard (`src/pages/hub-dashboard.tsx`)**
  - `stats` object has hardcoded 0s for `unreadMessages` and `monthlyHires`.

- **Trainer Dashboard (`src/pages/trainer-dashboard.tsx`)**
  - `stats` object has hardcoded 0 for `avgRating`.

- **Notification Demo (`src/components/notifications/notification-demo.tsx`)**
  - Contains `notificationTypes` and logic for simulating notifications. This appears to be a standalone demo component.

## Recommendations
1.  **Hide or Implement:** Hide the "Profile" and "Applications" tabs in Hub Dashboard if they are not ready, or implement the missing logic.
2.  **Remove Mock UI:** Remove the hardcoded bookings in Professional Dashboard and replace with an empty state if the API is not ready.
3.  **Review Demo Pages:** Confirm if `src/pages/demo.tsx` and `src/pages/coming-soon.tsx` should be accessible in the production build.
4.  **Address TODOs:** Prioritize connecting the dashboard stats (messaging, bookings, ratings) to the backend to make the dashboards dynamic.

