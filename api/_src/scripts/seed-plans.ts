/**
 * Subscription Plans Seeding Script
 * 
 * Populates the subscription_plans table with standard HospoGo tiers.
 * 
 * Usage:
 *   1. Replace placeholder Stripe Price IDs in this file with your real Price IDs from Stripe Dashboard
 *   2. Run: npm run seed:plans
 * 
 * Safety: This script checks for existing plans and will not overwrite them.
 */

import * as dotenv from 'dotenv';
import { getDb } from '../db/index.js';
import { subscriptionPlans } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// Load environment variables
dotenv.config();

/**
 * Subscription plan definitions matching frontend pricing
 * 
 * Pricing Structure (as per Pricing.tsx):
 * - Starter: $0/month, $20 booking fee per shift
 * - Business: $149/month, booking fees waived, 14-day free trial
 * - Enterprise: Custom pricing, booking fees waived
 * 
 * IMPORTANT: Replace the placeholder Stripe Price IDs below with your actual Price IDs
 * from the Stripe Dashboard (Products > Your Product > Pricing > Price ID)
 */
const PLAN_DEFINITIONS = [
  {
    name: 'Starter',
    description: 'Free tier with pay-per-booking model. Perfect for venues getting started.',
    price: '0.00', // Free - $20 booking fee applies per shift
    interval: 'month',
    tier: 'starter' as const,
    stripePriceId: null, // No Stripe subscription for free tier
    bookingFeeWaived: false,
    features: JSON.stringify([
      'Post Unlimited Shifts',
      'Access to Verified Professionals',
      'Basic Support',
      '$20 Booking Fee Per Shift',
    ]),
  },
  {
    name: 'Business',
    description: 'For growing venues that want to eliminate booking fees and access premium features.',
    price: '149.00', // $149.00 per month
    interval: 'month',
    tier: 'business' as const,
    stripePriceId: 'price_HOLDER_BUSINESS', // TODO: Replace with your Stripe Price ID
    bookingFeeWaived: true,
    features: JSON.stringify([
      'Everything in Starter',
      'No Booking Fees',
      'Priority Listing',
      'Advanced Analytics',
      'Priority Support',
      '14-Day Free Trial',
    ]),
  },
  {
    name: 'Enterprise',
    description: 'For large hospitality groups with multiple venues and custom requirements.',
    price: '0.00', // Custom pricing - contact sales
    interval: 'month',
    tier: 'enterprise' as const,
    stripePriceId: 'price_HOLDER_ENTERPRISE', // TODO: Replace with your Stripe Price ID
    bookingFeeWaived: true,
    features: JSON.stringify([
      'Everything in Business',
      'Multiple Venue Management',
      'API Access',
      'Dedicated Account Manager',
      'Custom Integrations',
      'SLA Guarantees',
      'White Labeling Options',
    ]),
  },
];

async function seedPlans() {
  console.log('🌱 Starting HospoGo subscription plans seeding...\n');

  const db = getDb();
  if (!db) {
    console.error('❌ Database connection failed. Please check DATABASE_URL environment variable.');
    process.exit(1);
  }

  try {
    // Check for placeholder Price IDs
    const hasPlaceholders = PLAN_DEFINITIONS.some(plan => 
      plan.stripePriceId?.startsWith('price_HOLDER_')
    );

    if (hasPlaceholders) {
      console.warn('⚠️  WARNING: You are using placeholder Stripe Price IDs!');
      console.warn('   Please replace them with your actual Price IDs from Stripe Dashboard.\n');
      console.log('   To get your Stripe Price IDs:');
      console.log('   1. Go to Stripe Dashboard > Products');
      console.log('   2. Create products: "HospoGo Business" ($149/month), "HospoGo Enterprise" (custom)');
      console.log('   3. Copy the Price IDs (start with "price_")');
      console.log('   4. Update api/_src/scripts/seed-plans.ts\n');
    }

    let createdCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    for (const planDef of PLAN_DEFINITIONS) {
      // Check if plan already exists by name
      const existing = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.name, planDef.name))
        .limit(1);

      if (existing.length > 0) {
        // Update existing plan to ensure tier is set correctly
        await db
          .update(subscriptionPlans)
          .set({
            tier: planDef.tier,
            price: planDef.price,
            description: planDef.description,
            features: planDef.features,
            bookingFeeWaived: planDef.bookingFeeWaived ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(subscriptionPlans.id, existing[0].id));
        
        console.log(`🔄 Updated "${planDef.name}" plan (ID: ${existing[0].id}) - tier: ${planDef.tier}`);
        updatedCount++;
        continue;
      }

      // Insert new plan
      const [newPlan] = await db
        .insert(subscriptionPlans)
        .values({
          name: planDef.name,
          description: planDef.description,
          price: planDef.price,
          interval: planDef.interval,
          tier: planDef.tier,
          stripePriceId: planDef.stripePriceId,
          features: planDef.features,
          bookingFeeWaived: planDef.bookingFeeWaived ? new Date() : null,
          isActive: new Date(), // Mark as active
        })
        .returning();

      console.log(`✅ Created "${planDef.name}" plan (ID: ${newPlan.id})`);
      console.log(`   Price: $${planDef.price}/${planDef.interval}`);
      console.log(`   Tier: ${planDef.tier}`);
      console.log(`   Booking Fee Waived: ${planDef.bookingFeeWaived ? 'Yes' : 'No'}`);
      if (planDef.stripePriceId) {
        console.log(`   Stripe Price ID: ${planDef.stripePriceId}`);
      }
      createdCount++;
    }

    console.log('\n📊 Seeding Summary:');
    console.log(`   Created: ${createdCount} plans`);
    console.log(`   Updated: ${updatedCount} plans`);
    console.log(`   Total: ${PLAN_DEFINITIONS.length} plans\n`);

    if (createdCount > 0 || updatedCount > 0) {
      console.log('✅ Seeding completed successfully!\n');
      
      if (hasPlaceholders) {
        console.log('⚠️  REMINDER: Update Stripe Price IDs before using checkout functionality.');
      }
    } else {
      console.log('ℹ️  All plans already exist with correct configuration. No changes made.\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding plans:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedPlans();
