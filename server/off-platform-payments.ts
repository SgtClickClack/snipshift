import { Request, Response } from 'express';

interface OffPlatformPayment {
  id: string;
  jobId: string;
  payerName: string;
  payerType: "hub" | "professional" | "brand" | "client";
  recipientName: string;
  recipientType: "hub" | "professional" | "brand" | "client";
  amount: number;
  paymentMethod: "cash" | "bank_transfer" | "card" | "other";
  description: string;
  paymentDate: string;
  category: "shift_payment" | "tip" | "product_purchase" | "training" | "other";
  notes?: string;
  status: "pending" | "verified" | "disputed";
  submittedBy: string;
  submittedAt: Date;
  verifiedAt?: Date;
  verifiedBy?: string;
}

interface PaymentStats {
  totalAmount: number;
  totalCount: number;
  verifiedCount: number;
  pendingCount: number;
  disputedCount: number;
  categoryCounts: Record<string, number>;
  monthlyTotals: Array<{ month: string; amount: number; count: number }>;
}

// In-memory storage for demo (replace with database in production)
const offPlatformPayments: Map<string, OffPlatformPayment> = new Map();
const userPaymentCache: Map<string, string[]> = new Map();

export class OffPlatformPaymentService {

  createPayment(paymentData: Omit<OffPlatformPayment, 'id' | 'status' | 'submittedAt'>): OffPlatformPayment {
    const payment: OffPlatformPayment = {
      ...paymentData,
      id: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: "pending",
      submittedAt: new Date()
    };

    offPlatformPayments.set(payment.id, payment);
    
    // Update user payment cache
    const userPayments = userPaymentCache.get(payment.submittedBy) || [];
    userPayments.push(payment.id);
    userPaymentCache.set(payment.submittedBy, userPayments);

    return payment;
  }

  getUserPayments(userId: string): OffPlatformPayment[] {
    const paymentIds = userPaymentCache.get(userId) || [];
    const payments = paymentIds
      .map(id => offPlatformPayments.get(id))
      .filter(Boolean) as OffPlatformPayment[];
    
    // Also include payments where user is payer or recipient
    const allPayments = Array.from(offPlatformPayments.values());
    const relatedPayments = allPayments.filter(payment => 
      payment.payerName.toLowerCase().includes(userId.toLowerCase()) ||
      payment.recipientName.toLowerCase().includes(userId.toLowerCase())
    );

    // Combine and deduplicate
    const combined = [...payments, ...relatedPayments];
    const unique = Array.from(
      new Map(combined.map(p => [p.id, p])).values()
    );

    return unique.sort((a, b) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  }

  verifyPayment(paymentId: string, verifierId: string): boolean {
    const payment = offPlatformPayments.get(paymentId);
    if (!payment || payment.status !== "pending") {
      return false;
    }

    payment.status = "verified";
    payment.verifiedAt = new Date();
    payment.verifiedBy = verifierId;
    
    offPlatformPayments.set(paymentId, payment);
    return true;
  }

  disputePayment(paymentId: string, reason: string): boolean {
    const payment = offPlatformPayments.get(paymentId);
    if (!payment) {
      return false;
    }

    payment.status = "disputed";
    // In production, would also store dispute reason and create dispute record
    
    offPlatformPayments.set(paymentId, payment);
    return true;
  }

  getPaymentStats(userId?: string): PaymentStats {
    let payments: OffPlatformPayment[];
    
    if (userId) {
      payments = this.getUserPayments(userId);
    } else {
      payments = Array.from(offPlatformPayments.values());
    }

    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalCount = payments.length;
    const verifiedCount = payments.filter(p => p.status === "verified").length;
    const pendingCount = payments.filter(p => p.status === "pending").length;
    const disputedCount = payments.filter(p => p.status === "disputed").length;

    // Category counts
    const categoryCounts: Record<string, number> = {};
    payments.forEach(payment => {
      categoryCounts[payment.category] = (categoryCounts[payment.category] || 0) + 1;
    });

    // Monthly totals (last 6 months)
    const monthlyTotals: Array<{ month: string; amount: number; count: number }> = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      const monthPayments = payments.filter(payment => 
        payment.paymentDate.startsWith(monthKey)
      );
      
      monthlyTotals.push({
        month: monthName,
        amount: monthPayments.reduce((sum, p) => sum + p.amount, 0),
        count: monthPayments.length
      });
    }

    return {
      totalAmount,
      totalCount,
      verifiedCount,
      pendingCount,
      disputedCount,
      categoryCounts,
      monthlyTotals
    };
  }

  // Demo helper: Create test payment data
  createTestPaymentData(): void {
    const testPayments = [
      {
        jobId: "job_001",
        payerName: "Golden Style Barbershop",
        payerType: "hub" as const,
        recipientName: "Jake Thompson",
        recipientType: "professional" as const,
        amount: 280,
        paymentMethod: "cash" as const,
        description: "Weekend shift payment - 8 hours at $35/hour",
        paymentDate: "2024-09-06",
        category: "shift_payment" as const,
        notes: "Excellent work, regular customer feedback was outstanding",
        submittedBy: "jake_thompson"
      },
      {
        jobId: "job_002",
        payerName: "Client - Sarah M.",
        payerType: "client" as const,
        recipientName: "Emma Foster",
        recipientType: "professional" as const,
        amount: 25,
        paymentMethod: "cash" as const,
        description: "Tip for exceptional styling service",
        paymentDate: "2024-09-05",
        category: "tip" as const,
        notes: "Client was extremely happy with the cut and style",
        submittedBy: "emma_foster"
      },
      {
        jobId: "other",
        payerName: "Ryan Mitchell",
        payerType: "professional" as const,
        recipientName: "Aussie Barber Tools",
        recipientType: "brand" as const,
        amount: 89,
        paymentMethod: "card" as const,
        description: "Premium clipper set purchase",
        paymentDate: "2024-09-04",
        category: "product_purchase" as const,
        notes: "Purchased after seeing the product demo at the barbershop",
        submittedBy: "ryan_mitchell"
      },
      {
        jobId: "training_session",
        payerName: "Urban Cuts Studio",
        payerType: "hub" as const,
        recipientName: "Master Tony Ricci",
        recipientType: "trainer" as const,
        amount: 350,
        paymentMethod: "bank_transfer" as const,
        description: "On-site advanced fade training for team",
        paymentDate: "2024-09-03",
        category: "training" as const,
        notes: "Full team training session, 3 hours on-site at our studio",
        submittedBy: "sarah_williams"
      },
      {
        jobId: "job_003",
        payerName: "Classic Barbers Co.",
        payerType: "hub" as const,
        recipientName: "Marcus Chen",
        recipientType: "professional" as const,
        amount: 210,
        paymentMethod: "cash" as const,
        description: "Cover shift payment - Friday evening",
        paymentDate: "2024-09-02",
        category: "shift_payment" as const,
        submittedBy: "marcus_chen"
      }
    ];

    testPayments.forEach(paymentData => {
      this.createPayment(paymentData);
    });

    // Auto-verify some payments for demo
    const allPayments = Array.from(offPlatformPayments.values());
    allPayments.slice(0, 3).forEach(payment => {
      this.verifyPayment(payment.id, "admin_user");
    });
  }
}

export const offPlatformPaymentService = new OffPlatformPaymentService();

// Express route handlers
export const offPlatformPaymentRoutes = {
  // Get user's payments
  async getUserPayments(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const payments = offPlatformPaymentService.getUserPayments(userId);
      res.json(payments);
    } catch (error) {
      console.error("Get user payments error:", error);
      res.status(500).json({ error: "Failed to get payments" });
    }
  },

  // Create new payment record
  async createPayment(req: Request, res: Response) {
    try {
      const {
        jobId,
        payerName,
        payerType,
        recipientName,
        recipientType,
        amount,
        paymentMethod,
        description,
        paymentDate,
        category,
        notes,
        submittedBy
      } = req.body;

      // Validation
      if (!jobId || !payerName || !recipientName || !amount || !description || !submittedBy) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (amount <= 0) {
        return res.status(400).json({ error: "Amount must be greater than 0" });
      }

      const payment = offPlatformPaymentService.createPayment({
        jobId,
        payerName,
        payerType,
        recipientName,
        recipientType,
        amount: parseFloat(amount),
        paymentMethod,
        description,
        paymentDate,
        category,
        notes,
        submittedBy
      });

      res.json({
        paymentId: payment.id,
        status: payment.status,
        message: "Payment recorded successfully"
      });
    } catch (error) {
      console.error("Create payment error:", error);
      res.status(500).json({ error: "Failed to create payment record" });
    }
  },

  // Verify a payment
  async verifyPayment(req: Request, res: Response) {
    try {
      const { paymentId } = req.params;
      const verifierId = "admin_user"; // In production, get from auth

      const success = offPlatformPaymentService.verifyPayment(paymentId, verifierId);
      
      if (!success) {
        return res.status(404).json({ error: "Payment not found or already verified" });
      }

      res.json({ message: "Payment verified successfully" });
    } catch (error) {
      console.error("Verify payment error:", error);
      res.status(500).json({ error: "Failed to verify payment" });
    }
  },

  // Dispute a payment
  async disputePayment(req: Request, res: Response) {
    try {
      const { paymentId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ error: "Dispute reason is required" });
      }

      const success = offPlatformPaymentService.disputePayment(paymentId, reason);
      
      if (!success) {
        return res.status(404).json({ error: "Payment not found" });
      }

      res.json({ message: "Payment dispute recorded" });
    } catch (error) {
      console.error("Dispute payment error:", error);
      res.status(500).json({ error: "Failed to dispute payment" });
    }
  },

  // Get payment statistics
  async getPaymentStats(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const stats = offPlatformPaymentService.getPaymentStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Get payment stats error:", error);
      res.status(500).json({ error: "Failed to get payment statistics" });
    }
  },

  // Get recent jobs for dropdown
  async getRecentJobs(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      
      // Mock recent jobs data for demo
      const recentJobs = [
        {
          id: "job_001",
          title: "Weekend Barber - Premium Location",
          hubName: "Golden Style Barbershop",
          date: "2024-09-07"
        },
        {
          id: "job_002",
          title: "Senior Stylist - Flexible Hours", 
          hubName: "Urban Cuts Studio",
          date: "2024-09-08"
        },
        {
          id: "job_003",
          title: "Traditional Barber Needed",
          hubName: "Classic Barbers Co.",
          date: "2024-09-09"
        }
      ];

      res.json(recentJobs);
    } catch (error) {
      console.error("Get recent jobs error:", error);
      res.status(500).json({ error: "Failed to get recent jobs" });
    }
  },

  // Create test data
  async createTestData(req: Request, res: Response) {
    try {
      offPlatformPaymentService.createTestPaymentData();
      res.json({ message: "Test payment data created successfully" });
    } catch (error) {
      console.error("Create test data error:", error);
      res.status(500).json({ error: "Failed to create test data" });
    }
  }
};