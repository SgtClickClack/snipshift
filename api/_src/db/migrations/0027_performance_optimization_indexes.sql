-- Migration: Performance Optimization Indexes for Brisbane Market Launch
-- Description: Adds composite and spatial indexes to optimize high-volume queries for shifts and shift_logs
-- Date: 2024-01-12
-- Author: Database Performance Engineering

-- ============================================================================
-- SHIFTS TABLE INDEXES
-- ============================================================================

-- 1. Composite index for getShiftsByEmployer with status filter
-- Query pattern: WHERE employer_id = ? AND status = ?
-- Used by: GET /api/shifts/shop/:userId, employer dashboard queries
CREATE INDEX IF NOT EXISTS shifts_employer_status_idx 
ON shifts(employer_id, status) 
WHERE status IS NOT NULL;

-- 2. Composite index for getShiftsByAssignee with status filter
-- Query pattern: WHERE assignee_id = ? AND status = ?
-- Used by: Professional shift listings, "My Shifts" page
CREATE INDEX IF NOT EXISTS shifts_assignee_status_idx 
ON shifts(assignee_id, status) 
WHERE assignee_id IS NOT NULL;

-- 3. Composite index for getShiftsByEmployerInRange
-- Query pattern: WHERE employer_id = ? AND start_time >= ? AND start_time <= ?
-- Used by: Calendar views, date range queries for employers
CREATE INDEX IF NOT EXISTS shifts_employer_start_time_idx 
ON shifts(employer_id, start_time) 
WHERE start_time IS NOT NULL;

-- 4. Composite index for marketplace queries (open shifts, future dates)
-- Query pattern: WHERE status = 'open' AND start_time > NOW() ORDER BY created_at DESC
-- Used by: GET /api/shifts (public marketplace feed)
CREATE INDEX IF NOT EXISTS shifts_status_start_created_idx 
ON shifts(status, start_time, created_at DESC) 
WHERE status = 'open';

-- 5. Composite index for status + start_time filtering (common pattern)
-- Query pattern: WHERE status = ? AND start_time >= ?
-- Used by: Marketplace filtering, shift discovery
CREATE INDEX IF NOT EXISTS shifts_status_start_time_idx 
ON shifts(status, start_time) 
WHERE start_time IS NOT NULL;

-- 6. Composite index for assignee + clock-in time queries
-- Query pattern: WHERE assignee_id = ? AND clock_in_time IS NOT NULL
-- Used by: Attendance tracking, shift completion queries
CREATE INDEX IF NOT EXISTS shifts_assignee_clock_in_idx 
ON shifts(assignee_id, clock_in_time) 
WHERE assignee_id IS NOT NULL AND clock_in_time IS NOT NULL;

-- 7. Spatial index optimization for geofencing queries
-- Note: Using B-tree indexes for bounding box queries (PostGIS GIST not available)
-- Query pattern: WHERE lat IS NOT NULL AND lng IS NOT NULL (for location-based filtering)
-- Used by: Location-based shift discovery, proximity searches
CREATE INDEX IF NOT EXISTS shifts_lat_idx ON shifts(lat) WHERE lat IS NOT NULL;
CREATE INDEX IF NOT EXISTS shifts_lng_idx ON shifts(lng) WHERE lng IS NOT NULL;

-- Composite spatial index for both coordinates (for bounding box queries)
-- This helps with queries that filter by both lat and lng ranges
CREATE INDEX IF NOT EXISTS shifts_lat_lng_composite_idx 
ON shifts(lat, lng) 
WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- 8. Index for payment status queries (for financial reporting)
-- Query pattern: WHERE payment_status = ? AND status = 'completed'
CREATE INDEX IF NOT EXISTS shifts_payment_status_completed_idx 
ON shifts(payment_status, status) 
WHERE status = 'completed';

-- 9. Index for recurring shift queries
-- Query pattern: WHERE parent_shift_id = ? OR (is_recurring = true AND employer_id = ?)
CREATE INDEX IF NOT EXISTS shifts_parent_recurring_idx 
ON shifts(parent_shift_id, is_recurring, employer_id) 
WHERE is_recurring = true OR parent_shift_id IS NOT NULL;

-- ============================================================================
-- SHIFT_LOGS TABLE INDEXES (Write-Heavy Optimization)
-- ============================================================================

-- Note: shift_logs is write-heavy (every clock-in creates a log entry)
-- Indexes are optimized to minimize insert overhead while maintaining fast reads

-- 1. Composite index for getShiftLogsByShiftId (ordered by timestamp DESC)
-- Query pattern: WHERE shift_id = ? ORDER BY timestamp DESC
-- Used by: Shift attendance history, venue reports
-- Using covering index pattern to avoid table lookups
CREATE INDEX IF NOT EXISTS shift_logs_shift_timestamp_desc_idx 
ON shift_logs(shift_id, timestamp DESC, event_type);

-- 2. Composite index for getShiftLogsByStaffId (ordered by timestamp DESC)
-- Query pattern: WHERE staff_id = ? ORDER BY timestamp DESC
-- Used by: Staff attendance history, professional reports
CREATE INDEX IF NOT EXISTS shift_logs_staff_timestamp_desc_idx 
ON shift_logs(staff_id, timestamp DESC, event_type);

-- 3. Composite index for shift + staff + timestamp queries
-- Query pattern: WHERE shift_id = ? AND staff_id = ? ORDER BY timestamp DESC
-- Used by: Specific shift attendance tracking
CREATE INDEX IF NOT EXISTS shift_logs_shift_staff_timestamp_idx 
ON shift_logs(shift_id, staff_id, timestamp DESC);

-- 4. Partial index for clock-in events only (most common query)
-- Query pattern: WHERE event_type = 'CLOCK_IN' AND shift_id = ?
-- Reduces index size and improves query performance
CREATE INDEX IF NOT EXISTS shift_logs_clock_in_events_idx 
ON shift_logs(shift_id, timestamp DESC) 
WHERE event_type = 'CLOCK_IN';

-- 5. Partial index for failed clock-in attempts (for reporting)
-- Query pattern: WHERE event_type = 'CLOCK_IN_ATTEMPT_FAILED'
CREATE INDEX IF NOT EXISTS shift_logs_failed_attempts_idx 
ON shift_logs(shift_id, timestamp DESC, distance_meters) 
WHERE event_type = 'CLOCK_IN_ATTEMPT_FAILED';

-- 6. Index for time-range queries (venue reports by date range)
-- Query pattern: WHERE timestamp >= ? AND timestamp <= ? AND shift_id IN (...)
CREATE INDEX IF NOT EXISTS shift_logs_timestamp_range_idx 
ON shift_logs(timestamp, shift_id);

-- 7. Spatial index for geofencing analysis (if needed for reporting)
-- Query pattern: WHERE latitude IS NOT NULL AND longitude IS NOT NULL
-- Note: Only create if geofencing analysis queries are needed
CREATE INDEX IF NOT EXISTS shift_logs_lat_lng_idx 
ON shift_logs(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ============================================================================
-- SHIFT_OFFERS TABLE INDEXES (Additional Optimization)
-- ============================================================================

-- Composite index for professional's pending offers
-- Query pattern: WHERE professional_id = ? AND status = 'pending'
CREATE INDEX IF NOT EXISTS shift_offers_professional_status_idx 
ON shift_offers(professional_id, status) 
WHERE status = 'pending';

-- ============================================================================
-- SHIFT_INVITATIONS TABLE INDEXES (Additional Optimization)
-- ============================================================================

-- Composite index for professional's pending invitations
-- Query pattern: WHERE professional_id = ? AND status = 'PENDING'
CREATE INDEX IF NOT EXISTS shift_invitations_professional_status_idx 
ON shift_invitations(professional_id, status) 
WHERE status = 'PENDING';

-- ============================================================================
-- ANALYZE TABLES
-- ============================================================================

-- Update table statistics for query planner
ANALYZE shifts;
ANALYZE shift_logs;
ANALYZE shift_offers;
ANALYZE shift_invitations;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON INDEX shifts_employer_status_idx IS 'Optimizes employer dashboard queries filtering by status';
COMMENT ON INDEX shifts_assignee_status_idx IS 'Optimizes professional shift listings and "My Shifts" queries';
COMMENT ON INDEX shifts_employer_start_time_idx IS 'Optimizes calendar and date range queries for employers';
COMMENT ON INDEX shifts_status_start_created_idx IS 'Optimizes marketplace feed queries for open shifts';
COMMENT ON INDEX shift_logs_shift_timestamp_desc_idx IS 'Optimizes shift attendance history queries';
COMMENT ON INDEX shift_logs_staff_timestamp_desc_idx IS 'Optimizes staff attendance history queries';
COMMENT ON INDEX shift_logs_clock_in_events_idx IS 'Partial index for most common shift_logs query pattern';
