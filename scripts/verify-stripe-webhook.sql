-- Stripe Connect Onboarding Verification Queries
-- Run these queries in your PostgreSQL database to verify the onboarding status

-- 1. Check all users with Stripe accounts
SELECT 
    id,
    email,
    name,
    stripe_account_id,
    stripe_onboarding_complete,
    stripe_customer_id,
    created_at,
    updated_at
FROM users
WHERE stripe_account_id IS NOT NULL
ORDER BY updated_at DESC;

-- 2. Count users by onboarding status
SELECT 
    CASE 
        WHEN stripe_account_id IS NULL THEN 'No Stripe Account'
        WHEN stripe_onboarding_complete = true THEN 'Onboarding Complete'
        ELSE 'Onboarding Incomplete'
    END AS status,
    COUNT(*) AS user_count
FROM users
GROUP BY 
    CASE 
        WHEN stripe_account_id IS NULL THEN 'No Stripe Account'
        WHEN stripe_onboarding_complete = true THEN 'Onboarding Complete'
        ELSE 'Onboarding Incomplete'
    END;

-- 3. Find users with incomplete onboarding (for testing)
SELECT 
    id,
    email,
    name,
    stripe_account_id,
    stripe_onboarding_complete,
    updated_at
FROM users
WHERE stripe_account_id IS NOT NULL 
  AND stripe_onboarding_complete = false
ORDER BY updated_at DESC;

-- 4. Check recent webhook updates (users updated in last hour)
SELECT 
    id,
    email,
    stripe_account_id,
    stripe_onboarding_complete,
    updated_at,
    NOW() - updated_at AS time_since_update
FROM users
WHERE stripe_account_id IS NOT NULL
  AND updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;
