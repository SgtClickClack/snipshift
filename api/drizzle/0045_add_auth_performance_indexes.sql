-- Performance optimization: Add indexes for auth lookup queries
-- These indexes significantly reduce latency for /api/me and /api/venues/me endpoints

-- Index on users.firebase_uid for fast Firebase auth token lookups
-- Used by: auth middleware, getUserByFirebaseUid, getUserByFirebaseUidOrEmail
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users (firebase_uid);

-- Index on users.email for email-based lookups (fallback auth)
-- Used by: getUserByEmail, getUserByFirebaseUidOrEmail
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- Index on venues.user_id for fast venue ownership lookups
-- Used by: getVenueByUserId in /api/venues/me
CREATE INDEX IF NOT EXISTS idx_venues_user_id ON venues (user_id);

-- Composite index for the OR query pattern in getUserByFirebaseUidOrEmail
-- Helps PostgreSQL optimize: WHERE firebase_uid = $1 OR email = $2
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid_email ON users (firebase_uid, email);
