import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { stripe } from '../lib/stripe.js';
import * as subscriptionsRepo from '../repositories/subscriptions.repository.js';
import * as paymentsRepo from '../repositories/payments.repository.js';
import * as usersRepo from '../repositories/users.repository.js';

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
          status: 'succeeded',
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
          status: 'succeeded',
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

        // Update subscription status to past_due
        await subscriptionsRepo.updateSubscription(subscription.id, {
          status: 'past_due',
        });

        console.warn(`⚠️  Payment failed for subscription ${subscription.id}`);
        break;
      }

      case 'account.updated': {
        // Handle Stripe Connect account updates
        const account = event.data.object as any;
        const accountId = account.id;

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
          // Update user's onboarding status
          await usersRepo.updateUser(user.id, {
            stripeOnboardingComplete: account.details_submitted || false,
          });

          console.info(`✅ Updated Connect account status for user ${user.id}`);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        // Handle successful payment intent (after capture)
        const paymentIntent = event.data.object as any;
        const paymentIntentId = paymentIntent.id;

        // Update shift payment status
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
          await db
            .update(shifts)
            .set({
              paymentStatus: 'PAID',
              updatedAt: new Date(),
            })
            .where(eq(shifts.id, shift.id));

          console.info(`✅ Payment completed for shift ${shift.id}`);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        // Handle failed payment intent
        const paymentIntent = event.data.object as any;
        const paymentIntentId = paymentIntent.id;

        // Log failure (could update shift status or notify user)
        console.warn(`⚠️  Payment failed for PaymentIntent ${paymentIntentId}`);
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

