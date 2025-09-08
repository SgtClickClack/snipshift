import { Request, Response } from 'express';

interface PostContent {
  id: string;
  userId: string;
  content: string;
  images?: string[];
  postType: "promotion" | "training" | "general" | "job_posting";
  submittedAt: Date;
  status: "pending" | "approved" | "rejected";
  moderationFlags: string[];
  riskScore: number;
  moderatedBy?: string;
  moderatedAt?: Date;
  rejectionReason?: string;
}

interface ModerationRule {
  id: string;
  name: string;
  pattern: RegExp;
  riskWeight: number;
  description: string;
  active: boolean;
}

// In-memory storage for demo (replace with database in production)
const pendingPosts: Map<string, PostContent> = new Map();
const moderationRules: ModerationRule[] = [
  {
    id: "spam_keywords",
    name: "Spam Keywords",
    pattern: /\b(buy now|click here|limited time|act fast|guaranteed|make money|work from home)\b/gi,
    riskWeight: 0.3,
    description: "Detects common spam keywords",
    active: true
  },
  {
    id: "excessive_caps",
    name: "Excessive Capitals",
    pattern: /[A-Z]{4,}/g,
    riskWeight: 0.2,
    description: "Detects excessive use of capital letters",
    active: true
  },
  {
    id: "multiple_exclamation",
    name: "Multiple Exclamation",
    pattern: /!{3,}/g,
    riskWeight: 0.15,
    description: "Detects excessive exclamation marks",
    active: true
  },
  {
    id: "external_links",
    name: "External Links",
    pattern: /(https?:\/\/(?!snipshift\.com)[\w\-\.]+\.[a-z]{2,})/gi,
    riskWeight: 0.4,
    description: "Detects links to external websites",
    active: true
  },
  {
    id: "phone_numbers",
    name: "Phone Numbers",
    pattern: /\b(\+?61|0)[1-9]\d{8,9}\b/g,
    riskWeight: 0.25,
    description: "Detects phone numbers (potential direct contact)",
    active: true
  },
  {
    id: "email_addresses",
    name: "Email Addresses",
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    riskWeight: 0.25,
    description: "Detects email addresses (potential direct contact)",
    active: true
  },
  {
    id: "currency_symbols",
    name: "Currency Focus",
    pattern: /\$\d+|\b\d+\s?(dollars?|bucks?|cash)\b/gi,
    riskWeight: 0.2,
    description: "Detects excessive focus on money/prices",
    active: true
  },
  {
    id: "urgent_language",
    name: "Urgent Language",
    pattern: /\b(urgent|asap|immediately|right now|don't wait|hurry)\b/gi,
    riskWeight: 0.25,
    description: "Detects urgency-creating language",
    active: true
  }
];

export class ContentModerationService {
  
  analyzeContent(content: string, postType: string): { riskScore: number; flags: string[] } {
    const flags: string[] = [];
    let totalRisk = 0;

    // Check each moderation rule
    for (const rule of moderationRules) {
      if (!rule.active) continue;

      const matches = content.match(rule.pattern);
      if (matches) {
        flags.push(rule.name);
        totalRisk += rule.riskWeight * Math.min(matches.length, 3); // Cap at 3 matches per rule
      }
    }

    // Additional risk factors based on post type
    if (postType === "promotion") {
      totalRisk += 0.1; // Promotions get slight risk increase
    }

    // Content length analysis
    if (content.length < 20) {
      flags.push("Very Short Content");
      totalRisk += 0.15;
    } else if (content.length > 1000) {
      flags.push("Very Long Content");
      totalRisk += 0.1;
    }

    // Repetitive content detection
    const words = content.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    const repetitionRatio = uniqueWords.size / words.length;
    if (repetitionRatio < 0.5) {
      flags.push("Repetitive Content");
      totalRisk += 0.2;
    }

    return {
      riskScore: Math.min(totalRisk, 1.0), // Cap at 1.0
      flags
    };
  }

  submitForModeration(postData: {
    userId: string;
    content: string;
    images?: string[];
    postType: string;
  }): PostContent {
    const { riskScore, flags } = this.analyzeContent(postData.content, postData.postType);
    
    const post: PostContent = {
      id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: postData.userId,
      content: postData.content,
      images: postData.images,
      postType: postData.postType as any,
      submittedAt: new Date(),
      status: riskScore >= 0.7 ? "pending" : riskScore >= 0.3 ? "pending" : "approved",
      moderationFlags: flags,
      riskScore
    };

    if (post.status === "pending") {
      pendingPosts.set(post.id, post);
    }

    return post;
  }

  getPendingPosts(): PostContent[] {
    return Array.from(pendingPosts.values()).sort((a, b) => 
      b.riskScore - a.riskScore || new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  }

  approvePost(postId: string, moderatorId: string): boolean {
    const post = pendingPosts.get(postId);
    if (!post) return false;

    post.status = "approved";
    post.moderatedBy = moderatorId;
    post.moderatedAt = new Date();
    
    pendingPosts.delete(postId);
    return true;
  }

  rejectPost(postId: string, moderatorId: string, reason: string): boolean {
    const post = pendingPosts.get(postId);
    if (!post) return false;

    post.status = "rejected";
    post.moderatedBy = moderatorId;
    post.moderatedAt = new Date();
    post.rejectionReason = reason;
    
    pendingPosts.delete(postId);
    return true;
  }

  getModerationStats(): any {
    const pending = pendingPosts.size;
    const highRisk = Array.from(pendingPosts.values()).filter(p => p.riskScore >= 0.7).length;
    
    // In production, these would come from database
    const approved = 127; // Demo data
    const rejected = 23; // Demo data

    return {
      pending,
      approved,
      rejected,
      highRisk
    };
  }

  // Demo helper: Create test moderation posts
  createTestModerationData(): void {
    const testPosts = [
      {
        userId: "user_1",
        content: "🔥🔥🔥 AMAZING DISCOUNT!!! BUY NOW - LIMITED TIME ONLY!!! Visit www.external-deals.com for the BEST PRICES!!! Don't wait, ACT FAST!!! Call 0412345678 NOW!!!",
        postType: "promotion"
      },
      {
        userId: "user_2", 
        content: "Check out my new barbering course! Learn advanced fade techniques. Contact me at john@barber-school.com for more info. $299 special price this week only!",
        postType: "training"
      },
      {
        userId: "user_3",
        content: "Great shift at the shop today. Thanks to the team for the support! 💪",
        postType: "general"
      },
      {
        userId: "user_4",
        content: "URGENT!!! Need barber ASAP for weekend shift. Top rates paid immediately. Email barber.jobs@external.com or call 0423456789 RIGHT NOW!",
        postType: "job_posting"
      },
      {
        userId: "user_5",
        content: "Hi everyone! New to the platform. Looking forward to connecting with other professionals and learning from the community.",
        postType: "general"
      }
    ];

    testPosts.forEach(postData => {
      this.submitForModeration(postData);
    });
  }
}

export const contentModerationService = new ContentModerationService();

// Express route handlers
export const moderationRoutes = {
  // Get pending posts for moderation
  async getPendingPosts(req: Request, res: Response) {
    try {
      const posts = contentModerationService.getPendingPosts();
      
      // Add mock user data for demo
      const enrichedPosts = posts.map(post => ({
        ...post,
        userName: `User ${post.userId.slice(-1)}`,
        userAvatar: undefined,
        userRole: ["hub", "professional", "brand", "trainer"][Math.floor(Math.random() * 4)],
        automaticFlags: post.moderationFlags
      }));

      res.json(enrichedPosts);
    } catch (error) {
      console.error("Get pending posts error:", error);
      res.status(500).json({ error: "Failed to get pending posts" });
    }
  },

  // Approve a post
  async approvePost(req: Request, res: Response) {
    try {
      const { postId } = req.params;
      const moderatorId = "admin_user"; // In production, get from auth

      const success = contentModerationService.approvePost(postId, moderatorId);
      
      if (!success) {
        return res.status(404).json({ error: "Post not found" });
      }

      res.json({ message: "Post approved successfully" });
    } catch (error) {
      console.error("Approve post error:", error);
      res.status(500).json({ error: "Failed to approve post" });
    }
  },

  // Reject a post
  async rejectPost(req: Request, res: Response) {
    try {
      const { postId } = req.params;
      const { reason } = req.body;
      const moderatorId = "admin_user"; // In production, get from auth

      if (!reason) {
        return res.status(400).json({ error: "Rejection reason is required" });
      }

      const success = contentModerationService.rejectPost(postId, moderatorId, reason);
      
      if (!success) {
        return res.status(404).json({ error: "Post not found" });
      }

      res.json({ message: "Post rejected successfully" });
    } catch (error) {
      console.error("Reject post error:", error);
      res.status(500).json({ error: "Failed to reject post" });
    }
  },

  // Get moderation statistics
  async getModerationStats(req: Request, res: Response) {
    try {
      const stats = contentModerationService.getModerationStats();
      res.json(stats);
    } catch (error) {
      console.error("Get moderation stats error:", error);
      res.status(500).json({ error: "Failed to get moderation stats" });
    }
  },

  // Submit content for moderation
  async submitContent(req: Request, res: Response) {
    try {
      const { userId, content, images, postType } = req.body;

      if (!userId || !content || !postType) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const post = contentModerationService.submitForModeration({
        userId,
        content,
        images,
        postType
      });

      res.json({
        postId: post.id,
        status: post.status,
        riskScore: post.riskScore,
        flags: post.moderationFlags,
        message: post.status === "approved" 
          ? "Post approved automatically" 
          : "Post submitted for moderation"
      });
    } catch (error) {
      console.error("Submit content error:", error);
      res.status(500).json({ error: "Failed to submit content" });
    }
  },

  // Create test moderation data
  async createTestData(req: Request, res: Response) {
    try {
      contentModerationService.createTestModerationData();
      res.json({ message: "Test moderation data created successfully" });
    } catch (error) {
      console.error("Create test data error:", error);
      res.status(500).json({ error: "Failed to create test data" });
    }
  }
};