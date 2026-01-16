import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { stripe } from '../lib/stripe.js';
import * as subscriptionsRepo from '../repositories/subscriptions.repository.js';
import * as paymentsRepo from '../repositories/payments.repository.js';
import * as usersRepo from '../repositories/users.repository.js';
import * as shiftsRepo from '../repositories/shifts.repository.js';
import * as notificationsService from '../lib/notifications-service.js';

const router = express.Router();

// Handler for Stripe webhooks
// This route must use raw body parser, so it's defined separately
router.post('/stripe', express.raw({ type: 'application/json' }), asyncHandler(async (req, res) => {
  if (!stripe) {
    console.error('Stripe is not configured');
    res.status(500).json({ error: 'Stripe is not configured' });
    return;
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error('Missing Stripe signature or webhook secret');
    res.status(400).json({ error: 'Missing signature or webhook secret' });
    return;
  }

  let event;

  try {
    // Verify webhook signature using raw body
    event = stripe.webhooks.constructEvent(
      req.body,
      sig as string,
      webhookSecret
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).json({ error: `Webhook Error: ${err.message}` });
    return;
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        
        // Get metadata
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;

        if (!userId || !planId) {
          console.error('Missing userId or planId in checkout session metadata');
          break;
        }

        // Retrieve the subscription from Stripe
        const stripeSubscriptionId = session.subscription;
        if (!stripeSubscriptionId) {
          console.error('No subscription ID in checkout session');
          break;
        }

        const stripeSubscriptionResult = await stripe!.subscriptions.retrieve(stripeSubscriptionId);
        const stripeSubscription = stripeSubscriptionResult as any;
        const stripeCustomerId = stripeSubscription.customer as string;

        // Get plan from database
        const plan = await subscriptionsRepo.getSubscriptionPlanById(planId);
        if (!plan) {
          console.error(`Plan ${planId} not found in database`);
          break;
        }

        // Create subscription in database
        await subscriptionsRepo.createSubscription({
          userId,
          planId,
          stripeSubscriptionId,
          stripeCustomerId,
          status: stripeSubscription.status === 'active' ? 'active' : 
                  stripeSubscription.status === 'trialing' ? 'trialing' : 'incomplete',
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        });

        // Create payment record
        const amount = session.amount_total ? session.amount_total / 100 : 0; // Convert from cents
        await paymentsRepo.createPayment({
          userId,
          amount,
          currency: session.currency || 'usd',
          status: 'PAID',
          stripePaymentIntentId: session.payment_intent,
          description: `Subscription: ${plan.name}`,
        });

        console.info(`✅ Subscription created for user ${userId}, plan ${planId}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        const stripeSubscriptionId = invoice.subscription;

        if (!stripeSubscriptionId) {
          break;
        }

        // Get subscription from database
        const subscription = await subscriptionsRepo.getSubscriptionByStripeId(stripeSubscriptionId);
        if (!subscription) {
          console.error(`Subscription ${stripeSubscriptionId} not found in database`);
          break;
        }

        // Retrieve subscription from Stripe to get updated period
        const stripeSubscriptionResult = await stripe!.subscriptions.retrieve(stripeSubscriptionId);
        const stripeSubscription = stripeSubscriptionResult as any;

        // Update subscription period
        await subscriptionsRepo.updateSubscription(subscription.id, {
          status: 'active',
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        });

        // Create payment record
        const amount = invoice.amount_paid / 100; // Convert from cents
        await paymentsRepo.createPayment({
          userId: subscription.userId,
          subscriptionId: subscription.id,
          amount,
          currency: invoice.currency,
          status: 'PAID',
          stripePaymentIntentId: invoice.payment_intent,
          stripeChargeId: invoice.charge,
          description: `Subscription renewal: ${invoice.description || 'Monthly subscription'}`,
        });

        console.info(`✅ Subscription renewed for subscription ${subscription.id}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSubscription = event.data.object as any;
        const stripeSubscriptionId = stripeSubscription.id;

        // Get subscription from database
        const subscription = await subscriptionsRepo.getSubscriptionByStripeId(stripeSubscriptionId);
        if (!subscription) {
          console.error(`Subscription ${stripeSubscriptionId} not found in database`);
          break;
        }

        // Mark subscription as canceled
        await subscriptionsRepo.updateSubscription(subscription.id, {
          status: 'canceled',
          canceledAt: new Date(),
        });

        console.info(`✅ Subscription canceled: ${subscription.id}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const stripeSubscriptionId = invoice.subscription;

        if (!stripeSubscriptionId) {
          break;
        }

        // Get subscription from database
        const subscription = await subscriptionsRepo.getSubscriptionByStripeId(stripeSubscriptionId);
        if (!subscription) {
          break;
        }

        // Track payment attempt count - Stripe sends this in the invoice
        const attemptCount = invoice.attempt_count || 1;

        // After 3 failed attempts, downgrade to Starter tier (cancel subscription)
        // This ensures venues don't retain Business perks (booking fee waiver) indefinitely
        if (attemptCount >= 3) {
          await subscriptionsRepo.updateSubscription(subscription.id, {
            status: 'canceled',
            canceledAt: new Date(),
          });

          // Notify venue owner of downgrade
          try {
            await notificationsService.notifyVenueOfDowngrade(
              subscription.userId,
              'Your Business subscription has been canceled due to payment failure. ' +
              'A $20 booking fee will now apply to each shift booking. ' +
              'Please update your payment method in Wallet settings to resubscribe.'
            );
          } catch (notifyError) {
            console.error('[WEBHOOK] Failed to notify venue of downgrade:', notifyError);
          }

          console.warn(`⚠️  Subscription ${subscription.id} DOWNGRADED to Starter after ${attemptCount} failed payment attempts`);
        } else {
          // First or second failure - just mark as past_due
          await subscriptionsRepo.updateSubscription(subscription.id, {
            status: 'past_due',
          });

          console.warn(`⚠️  Payment failed for subscription ${subscription.id} (attempt ${attemptCount}/3)`);
        }
        break;
      }

      case 'account.updated': {
        // Handle Stripe Connect account updates
        // Check payouts_enabled and charges_enabled to determine if account is fully onboarded
        const account = event.data.object as any;
        const accountId = account.id;

        console.info(`[WEBHOOK] Account updated event received for account: ${accountId}`);
        console.info(`   Details submitted: ${account.details_submitted}`);
        console.info(`   Charges enabled: ${account.charges_enabled}`);
        console.info(`   Payouts enabled: ${account.payouts_enabled}`);

        // Find user by stripeAccountId
        const db = await import('../db/index.js').then(m => m.getDb());
        if (!db) {
          console.warn(`[WEBHOOK] Database connection not available`);
          break;
        }

        const { users } = await import('../db/schema.js');
        const { eq } = await import('drizzle-orm');
        
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.stripeAccountId, accountId))
          .limit(1);

        if (user) {
          // Account is complete only if both charges and payouts are enabled
          // This ensures barbers can both receive payments and get payouts
          const isComplete = account.details_submitted === true && 
                            account.charges_enabled === true && 
                            account.payouts_enabled === true;

          console.info(`[WEBHOOK] Found user ${user.id} (${user.email}) for account ${accountId}`);
          console.info(`[WEBHOOK] Onboarding complete: ${isComplete}`);

          // Update user's onboarding status
          await usersRepo.updateUser(user.id, {
            stripeOnboardingComplete: isComplete,
          });

          if (!isComplete) {
            console.warn(`⚠️  Connect account ${accountId} lost verification. User ${user.id} locked from accepting shifts.`);
          } else {
            console.info(`✅ Updated Connect account status for user ${user.id} - fully onboarded`);
          }
        } else {
          console.warn(`[WEBHOOK] No user found with stripeAccountId: ${accountId}`);
          console.warn(`   This is normal for test events that don't match existing accounts`);
        }
        break;
      }

      case 'identity.verification_session.verified': {
        // Handle identity verification completion
        const verificationSession = event.data.object as any;
        const accountId = verificationSession.metadata?.account_id;
        const verificationSessionId = verificationSession.id;

        console.info(`[WEBHOOK] Identity verification session verified: ${verificationSessionId}`);

        if (!accountId) {
          console.warn('⚠️  Identity verification session verified but no account_id in metadata');
          console.warn('   This is normal - account.updated event will handle the status update');
          // For Express accounts, identity verification is part of onboarding
          // The account.updated event will fire when verification completes
          break;
        }

        // Find user by stripeAccountId
        const db = await import('../db/index.js').then(m => m.getDb());
        if (!db) break;

        const { users } = await import('../db/schema.js');
        const { eq } = await import('drizzle-orm');
        
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.stripeAccountId, accountId))
          .limit(1);

        if (user) {
          // Identity verification is complete
          // The account.updated webhook will handle the full onboarding status
          console.info(`✅ Identity verification completed for user ${user.id}, account ${accountId}`);
          console.info(`   Waiting for account.updated event to finalize onboarding status`);
          
          // Note: For Express accounts, we rely on account.updated to set stripeOnboardingComplete
          // because identity verification is part of the overall onboarding flow
        } else {
          console.warn(`⚠️  Identity verification completed for account ${accountId}, but user not found`);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        // Handle successful payment intent (after capture)
        // Fail-safe: Ensure payment status is set to PAID even if manual capture flow missed it
        const paymentIntent = event.data.object as any;
        const paymentIntentId = paymentIntent.id;
        const shiftId = paymentIntent.metadata?.shiftId;

        // Try to find shift by metadata first (more reliable), then fallback to paymentIntentId
        let shift = null;
        if (shiftId) {
          shift = await shiftsRepo.getShiftById(shiftId);
        }

        // If not found by metadata, try by paymentIntentId
        if (!shift) {
          const db = await import('../db/index.js').then(m => m.getDb());
          if (db) {
            const { shifts } = await import('../db/schema.js');
            const { eq } = await import('drizzle-orm');
            
            const [foundShift] = await db
              .select()
              .from(shifts)
              .where(eq(shifts.paymentIntentId, paymentIntentId))
              .limit(1);
            
            shift = foundShift;
          }
        }

        if (shift) {
          // Update shift payment status to PAID (fail-safe)
          await shiftsRepo.updateShift(shift.id, {
            paymentStatus: 'PAID',
          });

          // Store charge ID if available
          const chargeId = paymentIntent.latest_charge;
          if (chargeId && typeof chargeId === 'string') {
            await shiftsRepo.updateShift(shift.id, {
              stripeChargeId: chargeId,
            });
          }

          console.info(`✅ Payment completed for shift ${shift.id} (webhook fail-safe)`);
        } else {
          console.warn(`⚠️  Shift not found for PaymentIntent ${paymentIntentId}`);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        // Handle failed payment intent
        const paymentIntent = event.data.object as any;
        const paymentIntentId = paymentIntent.id;
        const shiftId = paymentIntent.metadata?.shiftId;

        // Try to find shift by metadata first, then fallback to paymentIntentId
        let shift = null;
        if (shiftId) {
          shift = await shiftsRepo.getShiftById(shiftId);
        }

        // If not found by metadata, try by paymentIntentId
        if (!shift) {
          const db = await import('../db/index.js').then(m => m.getDb());
          if (db) {
            const { shifts } = await import('../db/schema.js');
            const { eq } = await import('drizzle-orm');
            
            const [foundShift] = await db
              .select()
              .from(shifts)
              .where(eq(shifts.paymentIntentId, paymentIntentId))
              .limit(1);
            
            shift = foundShift;
          }
        }

        if (shift) {
          // Update shift payment status to PAYMENT_FAILED
          await shiftsRepo.updateShift(shift.id, {
            paymentStatus: 'PAYMENT_FAILED',
          });

          // Notify shop owner of payment failure
          await notificationsService.notifyShopOfPaymentFailure(
            shift.employerId,
            shift.id,
            shift.title,
            paymentIntentId
          );

          console.warn(`⚠️  Payment failed for shift ${shift.id}, shop notified`);
        } else {
          console.warn(`⚠️  Payment failed for PaymentIntent ${paymentIntentId}, but shift not found`);
        }
        break;
      }

      case 'charge.refunded': {
        // Handle charge refunds
        const charge = event.data.object as any;
        const paymentIntentId = charge.payment_intent;

        if (!paymentIntentId) {
          console.warn('⚠️  Charge refunded but no payment_intent found');
          break;
        }

        // Find shift by paymentIntentId
        const db = await import('../db/index.js').then(m => m.getDb());
        if (!db) break;

        const { shifts } = await import('../db/schema.js');
        const { eq } = await import('drizzle-orm');
        
        const [shift] = await db
          .select()
          .from(shifts)
          .where(eq(shifts.paymentIntentId, paymentIntentId))
          .limit(1);

        if (shift) {
          // Update shift payment status to REFUNDED
          await shiftsRepo.updateShift(shift.id, {
            paymentStatus: 'REFUNDED',
          });

          console.info(`✅ Charge refunded for shift ${shift.id}`);
        } else {
          console.warn(`⚠️  Charge refunded for PaymentIntent ${paymentIntentId}, but shift not found`);
        }
        break;
      }

      default:
        console.debug(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Error processing webhook' });
  }
}));

export default router;

