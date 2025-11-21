/**
 * Subscription Plans Seeding Script
 * 
 * Populates the subscription_plans table with standard Snipshift tiers.
 * 
 * Usage:
 *   1. Replace placeholder Stripe Price IDs in this file with your real Price IDs from Stripe Dashboard
 *   2. Run: npm run seed:plans
 * 
 * Safety: This script checks for existing plans and will not overwrite them.
 */

import * as dotenv from 'dotenv';
import { getDb } from '../db';
import { subscriptionPlans } from '../db/schema';
import { eq } from 'drizzle-orm';

// Load environment variables
dotenv.config();

/**
 * Subscription plan definitions
 * 
 * IMPORTANT: Replace the placeholder Stripe Price IDs below with your actual Price IDs
 * from the Stripe Dashboard (Products > Your Product > Pricing > Price ID)
 * 
 * To get your Stripe Price IDs:
 * 1. Go to Stripe Dashboard > Products
 * 2. Create products for each tier (or use existing ones)
 * 3. Create prices for each product (monthly recurring)
 * 4. Copy the Price ID (starts with "price_")
 * 5. Replace the placeholders below
 */
const PLAN_DEFINITIONS = [
  {
    name: 'Freelancer',
    description: 'Perfect for independent professionals looking to find work',
    price: '29.00', // $29.00 per month (stored as decimal string)
    interval: 'month',
    stripePriceId: 'price_HOLDER_FREELANCER', // TODO: Replace with your Stripe Price ID
    features: JSON.stringify([
      'Verified Profile',
      'Apply to Unlimited Jobs',
      'Basic Support',
    ]),
  },
  {
    name: 'Shop Owner',
    description: 'For businesses looking to hire and manage their workforce',
    price: '99.00', // $99.00 per month
    interval: 'month',
    stripePriceId: 'price_HOLDER_SHOP', // TODO: Replace with your Stripe Price ID
    features: JSON.stringify([
      'Post Unlimited Jobs',
      'Feature Listings',
      'Applicant Management',
      'Priority Support',
    ]),
  },
  {
    name: 'Enterprise',
    description: 'For large organizations with multiple locations and advanced needs',
    price: '299.00', // $299.00 per month
    interval: 'month',
    stripePriceId: 'price_HOLDER_ENTERPRISE', // TODO: Replace with your Stripe Price ID
    features: JSON.stringify([
      'Multiple Locations',
      'API Access',
      'Dedicated Account Manager',
      'White Labeling',
    ]),
  },
];

async function seedPlans() {
  console.log('🌱 Starting subscription plans seeding...\n');

  const db = getDb();
  if (!db) {
    console.error('❌ Database connection failed. Please check DATABASE_URL environment variable.');
    process.exit(1);
  }

  try {
    // Check for placeholder Price IDs
    const hasPlaceholders = PLAN_DEFINITIONS.some(plan => 
      plan.stripePriceId.startsWith('price_HOLDER_')
    );

    if (hasPlaceholders) {
      console.warn('⚠️  WARNING: You are using placeholder Stripe Price IDs!');
      console.warn('   Please replace them with your actual Price IDs from Stripe Dashboard.\n');
      console.log('   To get your Stripe Price IDs:');
      console.log('   1. Go to Stripe Dashboard > Products');
      console.log('   2. Create products and prices for each tier');
      console.log('   3. Copy the Price IDs (start with "price_")');
      console.log('   4. Update api/src/scripts/seed-plans.ts\n');
    }

    let createdCount = 0;
    let skippedCount = 0;

    for (const planDef of PLAN_DEFINITIONS) {
      // Check if plan already exists by name
      const existing = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.name, planDef.name))
        .limit(1);

      if (existing.length > 0) {
        console.log(`⏭️  Skipping "${planDef.name}" - already exists (ID: ${existing[0].id})`);
        skippedCount++;
        continue;
      }

      // Check if plan exists by Stripe Price ID (if not a placeholder)
      if (!planDef.stripePriceId.startsWith('price_HOLDER_')) {
        const existingByPriceId = await db
          .select()
          .from(subscriptionPlans)
          .where(eq(subscriptionPlans.stripePriceId, planDef.stripePriceId))
          .limit(1);

        if (existingByPriceId.length > 0) {
          console.log(`⏭️  Skipping "${planDef.name}" - Price ID ${planDef.stripePriceId} already exists`);
          skippedCount++;
          continue;
        }
      }

      // Insert new plan
      const [newPlan] = await db
        .insert(subscriptionPlans)
        .values({
          name: planDef.name,
          description: planDef.description,
          price: planDef.price,
          interval: planDef.interval,
          stripePriceId: planDef.stripePriceId,
          features: planDef.features,
          isActive: new Date(), // Mark as active
        })
        .returning();

      console.log(`✅ Created "${planDef.name}" plan (ID: ${newPlan.id})`);
      console.log(`   Price: $${planDef.price}/${planDef.interval}`);
      console.log(`   Stripe Price ID: ${planDef.stripePriceId}`);
      createdCount++;
    }

    console.log('\n📊 Seeding Summary:');
    console.log(`   Created: ${createdCount} plans`);
    console.log(`   Skipped: ${skippedCount} plans (already exist)`);
    console.log(`   Total: ${PLAN_DEFINITIONS.length} plans\n`);

    if (createdCount > 0) {
      console.log('✅ Seeding completed successfully!\n');
      
      if (hasPlaceholders) {
        console.log('⚠️  REMINDER: Update Stripe Price IDs before using checkout functionality.');
      }
    } else {
      console.log('ℹ️  All plans already exist. No changes made.\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding plans:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedPlans();

