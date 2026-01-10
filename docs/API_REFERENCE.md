# API Reference

This document provides an overview of the HospoGo API endpoints, authentication requirements, and request/response formats.

## Base URL

- **Development:** `http://localhost:5000`
- **Production:** `https://your-api-domain.com`

## Authentication

Most endpoints require authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <firebase_id_token>
```

The token is obtained from Firebase Authentication on the client side and must be included in all authenticated requests.

## Endpoints

### Authentication

#### `POST /api/login`
Authenticate a user with email/password or Firebase token.

**Headers:**
- `Authorization: Bearer <firebase_token>` (for OAuth flow)

**Body (email/password):**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "name": "User Name",
  "token": "firebase-token"
}
```

#### `POST /api/register`
Register a new user.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name"
}
```

### User Profile

#### `GET /api/me`
Get current user profile.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response:**
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "name": "User Name",
  "role": "professional",
  "roles": ["professional"],
  "bio": "User bio",
  "phone": "+1234567890",
  "location": "City, State",
  "avatarUrl": "https://...",
  "isOnboarded": true
}
```

#### `PUT /api/me`
Update current user profile.

**Headers:**
- `Authorization: Bearer <token>` (required)
- `Content-Type: multipart/form-data` (if uploading files)

**Body:**
```json
{
  "name": "Updated Name",
  "bio": "Updated bio",
  "phone": "+1234567890",
  "location": "City, State",
  "avatarUrl": "https://...",
  "bannerUrl": "https://..."
}
```

### Shifts

#### `GET /api/shifts`
Get shifts with optional filtering.

**Query Parameters:**
- `employerId` - Filter by employer
- `professionalId` - Filter by assigned professional
- `status` - Filter by status (open, filled, completed, cancelled)
- `startDate` - Start date (ISO format)
- `endDate` - End date (ISO format)
- `limit` - Number of results
- `offset` - Pagination offset

**Response:**
```json
[
  {
    "id": "shift-id",
    "title": "Barber Shift",
    "employerId": "employer-id",
    "startTime": "2024-01-15T09:00:00Z",
    "endTime": "2024-01-15T17:00:00Z",
    "hourlyRate": "50.00",
    "status": "open",
    "description": "Shift description"
  }
]
```

#### `POST /api/shifts`
Create a new shift (employer only).

**Headers:**
- `Authorization: Bearer <token>` (required)

**Body:**
```json
{
  "title": "Barber Shift",
  "startTime": "2024-01-15T09:00:00Z",
  "endTime": "2024-01-15T17:00:00Z",
  "hourlyRate": "50.00",
  "description": "Shift description",
  "location": "123 Main St, City, State"
}
```

#### `GET /api/shifts/:id`
Get a specific shift by ID.

**Response:**
```json
{
  "id": "shift-id",
  "title": "Barber Shift",
  "employerId": "employer-id",
  "startTime": "2024-01-15T09:00:00Z",
  "endTime": "2024-01-15T17:00:00Z",
  "hourlyRate": "50.00",
  "status": "open",
  "description": "Shift description"
}
```

#### `PUT /api/shifts/:id`
Update a shift (employer only).

**Headers:**
- `Authorization: Bearer <token>` (required)

#### `DELETE /api/shifts/:id`
Delete a shift (employer only).

**Headers:**
- `Authorization: Bearer <token>` (required)

### Applications

#### `GET /api/applications`
Get applications (filtered by user role).

**Headers:**
- `Authorization: Bearer <token>` (required)

**Query Parameters:**
- `status` - Filter by status (pending, accepted, rejected)
- `limit` - Number of results
- `offset` - Pagination offset

**Response:**
```json
[
  {
    "id": "application-id",
    "jobId": "job-id",
    "shiftId": "shift-id",
    "userId": "user-id",
    "status": "pending",
    "appliedAt": "2024-01-10T10:00:00Z",
    "respondedAt": null
  }
]
```

#### `POST /api/applications`
Create a new application.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Body:**
```json
{
  "shiftId": "shift-id",
  "coverLetter": "Application cover letter"
}
```

#### `PUT /api/applications/:id/status`
Update application status (employer only).

**Headers:**
- `Authorization: Bearer <token>` (required)

**Body:**
```json
{
  "status": "accepted"
}
```

#### `DELETE /api/applications/:id`
Withdraw an application.

**Headers:**
- `Authorization: Bearer <token>` (required)

### Payments

#### `GET /api/payments/balance/:userId`
Get payment balance for a user.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response:**
```json
{
  "available": 1000.00,
  "pending": 500.00,
  "currency": "aud"
}
```

#### `GET /api/payments/history`
Get payment history.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Query Parameters:**
- `limit` - Number of results (default: 50)

**Response:**
```json
[
  {
    "id": "payment-id",
    "amount": "100.00",
    "currency": "aud",
    "status": "completed",
    "description": "Payment description",
    "createdAt": "2024-01-10T10:00:00Z"
  }
]
```

### Stripe Connect

#### `GET /api/stripe-connect/onboard`
Get Stripe Connect onboarding link.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response:**
```json
{
  "url": "https://connect.stripe.com/..."
}
```

#### `GET /api/stripe-connect/status`
Get Stripe Connect account status.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response:**
```json
{
  "connected": true,
  "chargesEnabled": true,
  "payoutsEnabled": true
}
```

### Messaging

#### `GET /api/conversations`
Get user's conversations.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response:**
```json
[
  {
    "id": "conversation-id",
    "jobId": "job-id",
    "otherParticipant": {
      "id": "user-id",
      "name": "User Name"
    },
    "latestMessage": {
      "id": "message-id",
      "content": "Message content",
      "senderId": "user-id",
      "createdAt": "2024-01-10T10:00:00Z"
    },
    "lastMessageAt": "2024-01-10T10:00:00Z"
  }
]
```

#### `POST /api/conversations`
Create a new conversation.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Body:**
```json
{
  "participant2Id": "user-id",
  "jobId": "job-id"
}
```

#### `GET /api/conversations/:id`
Get conversation with message history.

**Headers:**
- `Authorization: Bearer <token>` (required)

#### `POST /api/messages`
Send a message.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Body:**
```json
{
  "conversationId": "conversation-id",
  "content": "Message content"
}
```

### Notifications

#### `GET /api/notifications`
Get user notifications.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response:**
```json
[
  {
    "id": "notification-id",
    "type": "application_received",
    "title": "New Application",
    "message": "You received a new application",
    "link": "/applications/123",
    "isRead": false,
    "createdAt": "2024-01-10T10:00:00Z"
  }
]
```

#### `PATCH /api/notifications/:id/read`
Mark notification as read.

**Headers:**
- `Authorization: Bearer <token>` (required)

### Health Check

#### `GET /health`
Check API server health.

**Response:**
```json
{
  "status": "ok",
  "message": "Server is running",
  "database": "connected"
}
```

## Error Responses

All errors follow this format:

```json
{
  "message": "Error description",
  "error": "Detailed error message (development only)"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

## Rate Limiting

Currently, no rate limiting is implemented. Consider implementing rate limiting for production use.

## Webhooks

### Stripe Webhooks

**Endpoint:** `POST /api/webhooks/stripe`

**Headers:**
- `stripe-signature` - Stripe webhook signature (required)

See [Stripe Webhooks Setup Guide](STRIPE_WEBHOOKS_SETUP.md) for configuration details.
