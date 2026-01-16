-- Migration: Add anonymity fields to shift_reviews table
-- Description: Enables double-blind reviews (anonymous until both parties submit or time limit passes)

-- Add isAnonymous flag (default true for new reviews)
ALTER TABLE shift_reviews 
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT true;

-- Add revealedAt timestamp (when anonymity is lifted)
ALTER TABLE shift_reviews 
ADD COLUMN IF NOT EXISTS revealed_at TIMESTAMP;

-- Add index for querying anonymous reviews
CREATE INDEX IF NOT EXISTS shift_reviews_is_anonymous_idx ON shift_reviews(is_anonymous);

-- Add comment
COMMENT ON COLUMN shift_reviews.is_anonymous IS 'Whether the review is anonymous (double-blind). Revealed when both parties submit or time limit passes.';
COMMENT ON COLUMN shift_reviews.revealed_at IS 'Timestamp when the review was revealed (anonymity lifted)';
