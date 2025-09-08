import Stripe from 'stripe';
import { Request, Response } from 'express';

// Use test credentials for development
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_51OqJxYBEZQGWNXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'; // Test key placeholder
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_51OqJxYBEZQGWNXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'; // Test key placeholder

const stripe = new Stripe(STRIPE_SECRET_KEY);

export interface ConnectedAccount {
  id: string;
  trainerId: string;
  stripeAccountId: string;
  onboardingComplete: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory storage for demo (replace with database in production)
const connectedAccounts: Map<string, ConnectedAccount> = new Map();

export class StripeConnectService {
  async createConnectedAccount(trainerId: string, email: string, businessName: string): Promise<string> {
    try {
      const account = await stripe.accounts.create({
        type: 'express',
        email: email,
        business_profile: {
          name: businessName,
          product_description: 'Professional barbering and styling training content',
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        settings: {
          payouts: {
            schedule: {
              interval: 'manual', // Allow manual payouts for demo
            },
          },
        },
      });

      // Store the connected account info
      const connectedAccount: ConnectedAccount = {
        id: `ca_${Date.now()}`,
        trainerId,
        stripeAccountId: account.id,
        onboardingComplete: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      connectedAccounts.set(trainerId, connectedAccount);
      return account.id;
    } catch (error) {
      console.error('Error creating connected account:', error);
      throw new Error('Failed to create connected account');
    }
  }

  async createAccountLink(accountId: string, returnUrl: string, refreshUrl: string): Promise<string> {
    try {
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      return accountLink.url;
    } catch (error) {
      console.error('Error creating account link:', error);
      throw new Error('Failed to create account link');
    }
  }

  async getAccountStatus(accountId: string): Promise<{
    onboardingComplete: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
  }> {
    try {
      const account = await stripe.accounts.retrieve(accountId);
      
      return {
        onboardingComplete: account.details_submitted || false,
        payoutsEnabled: account.payouts_enabled || false,
        detailsSubmitted: account.details_submitted || false,
      };
    } catch (error) {
      console.error('Error getting account status:', error);
      throw new Error('Failed to get account status');
    }
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    connectedAccountId: string,
    applicationFeeAmount: number,
    metadata: Record<string, string>
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        application_fee_amount: Math.round(applicationFeeAmount * 100),
        transfer_data: {
          destination: connectedAccountId,
        },
        metadata,
      });

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  getConnectedAccount(trainerId: string): ConnectedAccount | undefined {
    return connectedAccounts.get(trainerId);
  }

  updateConnectedAccount(trainerId: string, updates: Partial<ConnectedAccount>): void {
    const account = connectedAccounts.get(trainerId);
    if (account) {
      Object.assign(account, updates, { updatedAt: new Date() });
      connectedAccounts.set(trainerId, account);
    }
  }

  // Create test connected account for demo purposes
  async createTestAccount(trainerId: string): Promise<ConnectedAccount> {
    const testAccount: ConnectedAccount = {
      id: `ca_test_${Date.now()}`,
      trainerId,
      stripeAccountId: `acct_test_${trainerId}`,
      onboardingComplete: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    connectedAccounts.set(trainerId, testAccount);
    return testAccount;
  }
}

export const stripeConnectService = new StripeConnectService();

// Express route handlers
export const stripeConnectRoutes = {
  // Create connected account for trainer
  async createAccount(req: Request, res: Response) {
    try {
      const { trainerId, email, businessName } = req.body;
      
      if (!trainerId || !email || !businessName) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // For demo mode, create test account
      if (process.env.NODE_ENV === 'development') {
        const testAccount = await stripeConnectService.createTestAccount(trainerId);
        return res.json({
          accountId: testAccount.stripeAccountId,
          onboardingUrl: '/trainer-dashboard?tab=payments&demo=true',
          message: 'Demo account created successfully'
        });
      }

      const accountId = await stripeConnectService.createConnectedAccount(trainerId, email, businessName);
      const onboardingUrl = await stripeConnectService.createAccountLink(
        accountId,
        `${req.protocol}://${req.get('host')}/trainer-dashboard?tab=payments&success=true`,
        `${req.protocol}://${req.get('host')}/trainer-dashboard?tab=payments&refresh=true`
      );

      res.json({ accountId, onboardingUrl });
    } catch (error) {
      console.error('Create account error:', error);
      res.status(500).json({ error: 'Failed to create account' });
    }
  },

  // Get account status
  async getAccountStatus(req: Request, res: Response) {
    try {
      const { trainerId } = req.params;
      const account = stripeConnectService.getConnectedAccount(trainerId);
      
      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      // For demo accounts, return test status
      if (account.stripeAccountId.startsWith('acct_test_')) {
        return res.json({
          onboardingComplete: true,
          payoutsEnabled: true,
          detailsSubmitted: true,
          accountId: account.stripeAccountId,
          demo: true
        });
      }

      const status = await stripeConnectService.getAccountStatus(account.stripeAccountId);
      res.json({ ...status, accountId: account.stripeAccountId });
    } catch (error) {
      console.error('Get account status error:', error);
      res.status(500).json({ error: 'Failed to get account status' });
    }
  },

  // Create payment intent for training content purchase
  async createPaymentIntent(req: Request, res: Response) {
    try {
      const { amount, contentId, trainerId, buyerId } = req.body;
      
      if (!amount || !contentId || !trainerId || !buyerId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const account = stripeConnectService.getConnectedAccount(trainerId);
      if (!account) {
        return res.status(404).json({ error: 'Trainer account not found' });
      }

      // Calculate application fee (10% for platform)
      const applicationFee = amount * 0.1;

      const { clientSecret, paymentIntentId } = await stripeConnectService.createPaymentIntent(
        amount,
        'aud',
        account.stripeAccountId,
        applicationFee,
        {
          contentId,
          trainerId,
          buyerId,
          type: 'training_content_purchase'
        }
      );

      res.json({ clientSecret, paymentIntentId });
    } catch (error) {
      console.error('Create payment intent error:', error);
      res.status(500).json({ error: 'Failed to create payment intent' });
    }
  },

  // Handle webhook events
  async handleWebhook(req: Request, res: Response) {
    try {
      const sig = req.headers['stripe-signature'] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_webhook_secret';
      
      let event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return res.status(400).send('Webhook signature verification failed');
      }

      // Handle different event types
      switch (event.type) {
        case 'account.updated':
          console.log('Account updated:', event.data.object);
          break;
        case 'payment_intent.succeeded':
          console.log('Payment succeeded:', event.data.object);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: 'Webhook handling failed' });
    }
  }
};