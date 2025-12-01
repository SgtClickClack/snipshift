# Detailed Breakdown of Missing API Endpoints

This document provides a comprehensive overview of all frontend API calls that don't have matching backend endpoints, organized by feature area.

---

## 🔴 CRITICAL - Core Functionality Issues

### 1. Profile Update Endpoint Mismatch
**Endpoint:** `PUT /api/profiles/:userId`  
**Location:** `src/components/profile/integrated-profile-system.tsx:109`  
**Status:** ❌ **MISSING**  
**Impact:** Profile updates via integrated profile system will fail

**What it does:**
- Allows users to update their profile information (name, bio, skills, etc.)
- Used in the integrated profile system component
- Currently fails silently or shows error

**Backend Alternative:**
- ✅ `PUT /api/me` exists and works (used in `edit-profile.tsx`)
- **Fix:** Update `integrated-profile-system.tsx` to use `PUT /api/me` instead

---

### 2. User Role Update Endpoint Mismatch
**Endpoint:** `PATCH /api/users/:id/role`  
**Location:** `src/pages/home.tsx:30`  
**Status:** ❌ **MISSING**  
**Impact:** Role selection/updates from home page will fail

**What it does:**
- Updates a user's role (hub, professional, brand, trainer)
- Called when user selects a role on the home page
- Part of the role selection flow

**Backend Alternatives Available:**
- ✅ `POST /api/users/role` - Adds/updates role (used in onboarding)
- ✅ `PATCH /api/users/:id/current-role` - Switches current role view
- **Fix:** Update `home.tsx` to use `POST /api/users/role` instead

---

### 3. Legacy Messaging API Endpoints (Old Chat System)
**Status:** ❌ **MISSING** - Old endpoints, new system exists  
**Location:** `src/lib/messaging.ts`  
**Impact:** Old messaging service will fail, but new conversation system works

#### 3a. `POST /api/chats`
- **Line:** `src/lib/messaging.ts:18`
- **Purpose:** Creates a new chat between two users
- **Backend Alternative:** ✅ `POST /api/conversations` exists

#### 3b. `POST /api/chats/:chatId/messages`
- **Line:** `src/lib/messaging.ts:41`
- **Purpose:** Sends a message in a chat
- **Backend Alternative:** ✅ `POST /api/messages` exists

#### 3c. `GET /api/chats/:chatId/messages`
- **Line:** `src/lib/messaging.ts:84`
- **Purpose:** Fetches messages for a chat
- **Backend Alternative:** ✅ `GET /api/conversations/:id` returns messages

#### 3d. `PUT /api/chats/:chatId/read/:userId`
- **Line:** `src/lib/messaging.ts:103`
- **Purpose:** Marks messages as read
- **Backend Alternative:** ✅ `PATCH /api/conversations/:id/read` exists

**Note:** `GET /api/chats/user/:userId` ✅ **EXISTS** and works

**Fix:** Update `messaging.ts` to use the new `/api/conversations` endpoints, or deprecate this service if the new system is fully implemented.

---

## 🟡 MEDIUM PRIORITY - Feature Endpoints (May Be Planned)

### 4. Community Feed Feature
**Endpoint:** `GET /api/community/feed`  
**Location:** `src/components/social/community-feed.tsx:122`  
**Status:** ❌ **MISSING**  
**Impact:** Community feed page shows mock data only

**What it does:**
- Fetches community posts/feed
- Used in `/community` page
- Currently uses mock data as fallback
- Supports filtering by type (all, questions, tips, showcases)
- Supports search functionality

**Component Details:**
- File: `src/components/social/community-feed.tsx`
- Page: `src/pages/community.tsx`
- Features: Post creation, filtering, search, likes, comments
- **Current State:** Uses mock data, API call fails silently

**Decision Needed:** Build backend or remove feature?

---

### 5. Training Content Management
**Status:** ❌ **MISSING** - Multiple endpoints  
**Impact:** Training hub and trainer dashboard features non-functional

#### 5a. `GET /api/training-content`
- **Locations:**
  - `src/pages/trainer-dashboard.tsx:63`
  - `src/components/training/training-hub.tsx:147`
- **Purpose:** Fetches all training content (videos, courses, tutorials)
- **Used By:**
  - Trainer Dashboard - Shows trainer's uploaded content
  - Training Hub - Shows all available training content to users
- **Features:** Filtering by level, category, free/paid

#### 5b. `POST /api/training-content`
- **Location:** `src/pages/trainer-dashboard.tsx:69`
- **Purpose:** Creates new training content
- **Used By:** Trainer Dashboard - Content upload form
- **Data:** Title, description, video URL, price, duration, level, category

#### 5c. `POST /api/purchase-content`
- **Location:** `src/components/training/training-hub.tsx:157`
- **Purpose:** Purchases paid training content
- **Used By:** Training Hub - Purchase button for paid content
- **Data:** `{ contentId: string }`

**Component Details:**
- Trainer Dashboard: `src/pages/trainer-dashboard.tsx`
  - Allows trainers to upload training content
  - Shows list of uploaded content
  - Form includes: title, description, video URL, price, duration, level, category
  
- Training Hub: `src/components/training/training-hub.tsx`
  - Browse all training content
  - Filter by level (beginner/advanced), category, free/paid
  - Purchase paid content
  - Track purchased content

**Decision Needed:** Build backend or remove feature?

---

### 6. Shop Shift Management
**Status:** ❌ **MISSING** - Multiple endpoints  
**Impact:** Shop dashboard shift posting feature non-functional

#### 6a. `GET /api/shifts/shop/:userId`
- **Location:** `src/pages/shop-dashboard.tsx:28`
- **Purpose:** Fetches all shifts posted by a shop
- **Used By:** Shop Dashboard - Lists posted shifts
- **Returns:** Array of Shift objects

#### 6b. `POST /api/shifts`
- **Location:** `src/pages/shop-dashboard.tsx:34`
- **Purpose:** Creates a new shift posting
- **Used By:** Shop Dashboard - "Post New Shift" form
- **Data:**
  ```typescript
  {
    shopId: string,
    title: string,
    date: string (ISO),
    requirements: string,
    pay: string
  }
  ```

**Component Details:**
- File: `src/pages/shop-dashboard.tsx`
- Access: Requires `currentRole === "hub"`
- Features:
  - View all posted shifts
  - Create new shift postings
  - Form fields: title, date, requirements, pay
  - Displays shifts in a card grid

**Decision Needed:** Build backend or remove feature?

---

### 7. Social Posts Feature (Brand Dashboard)
**Status:** ❌ **MISSING** - Multiple endpoints  
**Impact:** Brand dashboard social posting feature non-functional

#### 7a. `GET /api/social-posts`
- **Location:** `src/pages/brand-dashboard.tsx:62`
- **Purpose:** Fetches all social posts created by the brand
- **Used By:** Brand Dashboard - Shows brand's social media posts
- **Returns:** Array of SocialPost objects

#### 7b. `POST /api/social-posts`
- **Locations:**
  - `src/pages/brand-dashboard.tsx:68`
  - `src/components/content-creation/social-posting-modal.tsx:38`
- **Purpose:** Creates a new social media post
- **Used By:**
  - Brand Dashboard - Post creation form
  - Social Posting Modal - Reusable post creation component
- **Data:**
  ```typescript
  {
    postType: "offer" | "event" | "product",
    content: string,
    images: string[],
    linkUrl?: string,
    discountCode?: string,
    discountPercentage?: number,
    validUntil?: string,
    eventTime?: string,
    location?: string
  }
  ```

#### 7c. `POST /api/social-posts/:postId/like`
- **Location:** `src/components/social/social-feed.tsx:45`
- **Purpose:** Likes/unlikes a social post
- **Used By:** Social Feed component
- **Data:** `{ action: "like" | "unlike" }`

**Component Details:**
- Brand Dashboard: `src/pages/brand-dashboard.tsx`
  - View all brand's social posts
  - Create new posts (offers, events, products)
  - Post types: Special offers, Events, Product showcases
  - Form includes: content, images, links, discount codes, event details
  
- Social Feed: `src/components/social/social-feed.tsx`
  - Displays social posts in a feed
  - Like/unlike functionality
  - Filter by type (all, offers, events, products)
  
- Social Posting Modal: `src/components/content-creation/social-posting-modal.tsx`
  - Reusable modal for creating social posts
  - Used by brand dashboard

**Decision Needed:** Build backend or remove feature?

---

### 8. Admin Content Moderation
**Status:** ❌ **MISSING** - Multiple endpoints  
**Impact:** Admin content moderation panel non-functional

#### 8a. `GET /api/admin/pending-posts`
- **Location:** `src/components/admin/content-moderation.tsx:52`
- **Purpose:** Fetches all social posts pending moderation
- **Used By:** Admin Content Moderation component
- **Returns:** Array of pending posts awaiting approval/rejection

#### 8b. `POST /api/admin/moderate-post/:postId`
- **Location:** `src/components/admin/content-moderation.tsx:61`
- **Purpose:** Approves or rejects a social post
- **Used By:** Admin Content Moderation - Moderation actions
- **Data:**
  ```typescript
  {
    action: "approve" | "reject",
    reason?: string
  }
  ```

#### 8c. `GET /api/admin/pending-training`
- **Location:** `src/components/admin/content-moderation.tsx:56`
- **Purpose:** Fetches all training content pending moderation
- **Used By:** Admin Content Moderation component
- **Returns:** Array of pending training content awaiting approval/rejection

#### 8d. `POST /api/admin/moderate-training/:contentId`
- **Location:** `src/components/admin/content-moderation.tsx:75`
- **Purpose:** Approves or rejects training content
- **Used By:** Admin Content Moderation - Moderation actions
- **Data:**
  ```typescript
  {
    action: "approve" | "reject",
    reason?: string
  }
  ```

**Component Details:**
- File: `src/components/admin/content-moderation.tsx`
- Access: Admin role required
- Features:
  - View pending social posts
  - View pending training content
  - Approve/reject posts with optional reason
  - Approve/reject training content with optional reason
  - Filter by type (all, posts, training)

**Decision Needed:** Build backend or remove feature?

---

### 9. Google OAuth Endpoint (May Be Intentional)
**Endpoint:** `GET /api/auth/google`  
**Location:** `src/components/auth/google-signin-button.tsx:35`  
**Status:** ❌ **MISSING**  
**Impact:** May be intentional - OAuth handled client-side via Firebase

**What it does:**
- Google OAuth authentication
- Currently handled by Firebase Auth on client-side
- May not need backend endpoint

**Decision Needed:** Verify if this is intentional or needs implementation.

---

## Summary by Priority

### 🔴 CRITICAL (Must Fix)
1. Profile update endpoint mismatch (`PUT /api/profiles/:userId` → `PUT /api/me`)
2. Role update endpoint mismatch (`PATCH /api/users/:id/role` → `POST /api/users/role`)
3. Legacy messaging API endpoints (update to use `/api/conversations`)

### 🟡 MEDIUM (Feature Endpoints - Decision Needed)
4. Community Feed (`GET /api/community/feed`)
5. Training Content (3 endpoints: GET, POST, purchase)
6. Shop Shifts (2 endpoints: GET shop shifts, POST shift)
7. Social Posts (3 endpoints: GET, POST, like)
8. Admin Moderation (4 endpoints: GET pending posts/training, POST moderate)

### 🟢 LOW (May Be Intentional)
9. Google OAuth (`GET /api/auth/google` - Firebase handles this)

---

## Recommendations

### Immediate Actions (Critical)
1. **Fix profile update:** Update `integrated-profile-system.tsx` to use `PUT /api/me`
2. **Fix role update:** Update `home.tsx` to use `POST /api/users/role`
3. **Update messaging service:** Migrate `messaging.ts` to use `/api/conversations` endpoints, or deprecate if new system is complete

### Feature Endpoints Decision
For each feature endpoint group (Community, Training, Shifts, Social Posts, Admin Moderation):
- **Option A:** Build the backend endpoints to support the feature
- **Option B:** Remove the frontend code and disable the feature
- **Option C:** Add "Coming Soon" placeholders and disable API calls

### Next Steps
1. Review this document and decide which features to keep/build vs. remove
2. Fix critical endpoint mismatches
3. Implement or remove feature endpoints based on product roadmap
4. Update frontend to handle missing endpoints gracefully (error states, "coming soon" messages)

