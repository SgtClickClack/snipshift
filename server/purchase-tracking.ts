import { Request, Response } from 'express';

export interface Purchase {
  id: string;
  contentId: string;
  contentTitle: string;
  buyerId: string;
  trainerId: string;
  amount: number;
  platformFee: number;
  trainerEarnings: number;
  paymentIntentId: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  escrowStatus: 'held' | 'released' | 'disputed';
  purchaseDate: Date;
  accessGrantedDate?: Date;
  escrowReleaseDate?: Date;
}

export interface ContentAccess {
  id: string;
  userId: string;
  contentId: string;
  purchaseId: string;
  accessGranted: boolean;
  accessDate: Date;
  expiryDate?: Date;
}

// In-memory storage for demo (replace with database in production)
const purchases: Map<string, Purchase> = new Map();
const contentAccess: Map<string, ContentAccess> = new Map();

export class PurchaseTrackingService {
  createPurchase(data: {
    contentId: string;
    contentTitle: string;
    buyerId: string;
    trainerId: string;
    amount: number;
    paymentIntentId: string;
  }): Purchase {
    const platformFee = data.amount * 0.1; // 10% platform fee
    const trainerEarnings = data.amount - platformFee;

    const purchase: Purchase = {
      id: `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      platformFee,
      trainerEarnings,
      status: 'pending',
      escrowStatus: 'held',
      purchaseDate: new Date(),
    };

    purchases.set(purchase.id, purchase);
    return purchase;
  }

  completePurchase(purchaseId: string): Purchase | null {
    const purchase = purchases.get(purchaseId);
    if (!purchase) return null;

    purchase.status = 'completed';
    purchase.accessGrantedDate = new Date();
    
    // Grant content access
    this.grantContentAccess(purchase.buyerId, purchase.contentId, purchase.id);
    
    // Schedule escrow release (in production, this would be automated after content access confirmation)
    setTimeout(() => {
      this.releaseEscrow(purchaseId);
    }, 24 * 60 * 60 * 1000); // 24 hours for demo

    purchases.set(purchaseId, purchase);
    return purchase;
  }

  grantContentAccess(userId: string, contentId: string, purchaseId: string): ContentAccess {
    const accessKey = `${userId}_${contentId}`;
    const access: ContentAccess = {
      id: `access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      contentId,
      purchaseId,
      accessGranted: true,
      accessDate: new Date(),
      // No expiry for purchased content
    };

    contentAccess.set(accessKey, access);
    return access;
  }

  hasContentAccess(userId: string, contentId: string): boolean {
    const accessKey = `${userId}_${contentId}`;
    const access = contentAccess.get(accessKey);
    return access?.accessGranted || false;
  }

  releaseEscrow(purchaseId: string): boolean {
    const purchase = purchases.get(purchaseId);
    if (!purchase) return false;

    purchase.escrowStatus = 'released';
    purchase.escrowReleaseDate = new Date();
    purchases.set(purchaseId, purchase);
    
    console.log(`💰 Escrow released for purchase ${purchaseId}: $${purchase.trainerEarnings} to trainer`);
    return true;
  }

  getUserPurchases(userId: string): Purchase[] {
    return Array.from(purchases.values()).filter(p => p.buyerId === userId);
  }

  getTrainerEarnings(trainerId: string): Purchase[] {
    return Array.from(purchases.values()).filter(p => p.trainerId === trainerId);
  }

  getPurchaseByPaymentIntent(paymentIntentId: string): Purchase | null {
    return Array.from(purchases.values()).find(p => p.paymentIntentId === paymentIntentId) || null;
  }

  // Demo helper: Create test purchases
  createTestPurchases(userId: string, trainerId: string): void {
    const testPurchases = [
      {
        contentId: 'content_1',
        contentTitle: 'Advanced Fade Techniques',
        buyerId: userId,
        trainerId: trainerId,
        amount: 49.99,
        paymentIntentId: 'pi_test_fade_techniques'
      },
      {
        contentId: 'content_2', 
        contentTitle: 'Beard Styling Masterclass',
        buyerId: userId,
        trainerId: trainerId,
        amount: 79.99,
        paymentIntentId: 'pi_test_beard_styling'
      }
    ];

    testPurchases.forEach(data => {
      const purchase = this.createPurchase(data);
      this.completePurchase(purchase.id);
    });
  }
}

export const purchaseTrackingService = new PurchaseTrackingService();

// Express route handlers
export const purchaseRoutes = {
  // Complete a purchase after successful payment
  async completePurchase(req: Request, res: Response) {
    try {
      const { paymentIntentId, contentId, userId } = req.body;
      
      if (!paymentIntentId || !contentId || !userId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Find purchase by payment intent
      let purchase = purchaseTrackingService.getPurchaseByPaymentIntent(paymentIntentId);
      
      // If purchase doesn't exist, create it (for demo mode)
      if (!purchase) {
        // In production, this should come from the webhook
        purchase = purchaseTrackingService.createPurchase({
          contentId,
          contentTitle: `Training Content ${contentId}`,
          buyerId: userId,
          trainerId: 'trainer_demo',
          amount: 49.99,
          paymentIntentId
        });
      }

      const completedPurchase = purchaseTrackingService.completePurchase(purchase.id);
      if (!completedPurchase) {
        return res.status(404).json({ error: 'Purchase not found' });
      }

      res.json({
        purchaseId: completedPurchase.id,
        contentAccess: true,
        message: 'Purchase completed and access granted'
      });
    } catch (error) {
      console.error('Complete purchase error:', error);
      res.status(500).json({ error: 'Failed to complete purchase' });
    }
  },

  // Check if user has access to content
  async checkContentAccess(req: Request, res: Response) {
    try {
      const { userId, contentId } = req.params;
      
      if (!userId || !contentId) {
        return res.status(400).json({ error: 'Missing parameters' });
      }

      const hasAccess = purchaseTrackingService.hasContentAccess(userId, contentId);
      
      res.json({ 
        hasAccess,
        contentId,
        userId
      });
    } catch (error) {
      console.error('Check content access error:', error);
      res.status(500).json({ error: 'Failed to check content access' });
    }
  },

  // Get user's purchase history
  async getUserPurchases(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({ error: 'Missing user ID' });
      }

      const purchases = purchaseTrackingService.getUserPurchases(userId);
      
      res.json({ purchases });
    } catch (error) {
      console.error('Get user purchases error:', error);
      res.status(500).json({ error: 'Failed to get purchases' });
    }
  },

  // Get trainer earnings
  async getTrainerEarnings(req: Request, res: Response) {
    try {
      const { trainerId } = req.params;
      
      if (!trainerId) {
        return res.status(400).json({ error: 'Missing trainer ID' });
      }

      const earnings = purchaseTrackingService.getTrainerEarnings(trainerId);
      const totalEarnings = earnings.reduce((sum, p) => sum + p.trainerEarnings, 0);
      const totalSales = earnings.length;
      const pendingAmount = earnings
        .filter(p => p.escrowStatus === 'held')
        .reduce((sum, p) => sum + p.trainerEarnings, 0);

      res.json({ 
        earnings,
        totalEarnings,
        totalSales,
        pendingAmount
      });
    } catch (error) {
      console.error('Get trainer earnings error:', error);
      res.status(500).json({ error: 'Failed to get earnings' });
    }
  },

  // Create test purchases for demo
  async createTestData(req: Request, res: Response) {
    try {
      const { userId, trainerId } = req.body;
      
      if (!userId || !trainerId) {
        return res.status(400).json({ error: 'Missing user or trainer ID' });
      }

      purchaseTrackingService.createTestPurchases(userId, trainerId);
      
      res.json({ message: 'Test purchase data created successfully' });
    } catch (error) {
      console.error('Create test data error:', error);
      res.status(500).json({ error: 'Failed to create test data' });
    }
  }
};