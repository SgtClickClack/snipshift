-- Venue Activation Verification Script
-- Checks for venues that are 'active' but missing corresponding Stripe details

-- 1. Find active venues with missing Stripe onboarding
SELECT 
    v.id AS venue_id,
    v.venue_name,
    v.status AS venue_status,
    u.id AS user_id,
    u.email,
    u.stripe_account_id,
    u.stripe_onboarding_complete,
    v.updated_at AS venue_updated_at,
    u.updated_at AS user_updated_at
FROM venues v
INNER JOIN users u ON v.user_id = u.id
WHERE v.status = 'active'
  AND (
    u.stripe_account_id IS NULL 
    OR u.stripe_onboarding_complete = false
    OR u.stripe_account_id IS NULL
  )
ORDER BY v.updated_at DESC;

-- 2. Find venues that should be active but are still pending
-- (User has payouts enabled but venue status is pending)
SELECT 
    v.id AS venue_id,
    v.venue_name,
    v.status AS venue_status,
    u.id AS user_id,
    u.email,
    u.stripe_account_id,
    u.stripe_onboarding_complete,
    v.updated_at AS venue_updated_at,
    u.updated_at AS user_updated_at,
    CASE 
        WHEN u.stripe_onboarding_complete = true AND v.status = 'pending' 
        THEN 'SHOULD BE ACTIVE'
        ELSE 'OK'
    END AS status_check
FROM venues v
INNER JOIN users u ON v.user_id = u.id
WHERE u.stripe_onboarding_complete = true
  AND v.status = 'pending'
ORDER BY v.updated_at DESC;

-- 3. Summary: Count venues by status and Stripe onboarding status
SELECT 
    v.status AS venue_status,
    CASE 
        WHEN u.stripe_onboarding_complete = true THEN 'Stripe Complete'
        WHEN u.stripe_account_id IS NOT NULL THEN 'Stripe Incomplete'
        ELSE 'No Stripe Account'
    END AS stripe_status,
    COUNT(*) AS count
FROM venues v
INNER JOIN users u ON v.user_id = u.id
GROUP BY v.status, 
    CASE 
        WHEN u.stripe_onboarding_complete = true THEN 'Stripe Complete'
        WHEN u.stripe_account_id IS NOT NULL THEN 'Stripe Incomplete'
        ELSE 'No Stripe Account'
    END
ORDER BY v.status, stripe_status;

-- 4. Find recently activated venues (active status in last 24 hours)
SELECT 
    v.id AS venue_id,
    v.venue_name,
    v.status,
    u.email,
    u.stripe_account_id,
    u.stripe_onboarding_complete,
    v.updated_at,
    NOW() - v.updated_at AS time_since_activation
FROM venues v
INNER JOIN users u ON v.user_id = u.id
WHERE v.status = 'active'
  AND v.updated_at > NOW() - INTERVAL '24 hours'
ORDER BY v.updated_at DESC;
