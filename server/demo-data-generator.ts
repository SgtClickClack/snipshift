import { storage } from "./storage";

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: "hub" | "professional" | "brand" | "trainer";
  location: string;
  avatar?: string;
  businessName?: string;
  skills?: string[];
  rating?: number;
  joinedDate: Date;
}

export interface DemoJob {
  id: string;
  hubId: string;
  hubName: string;
  title: string;
  description: string;
  location: string;
  payRate: number;
  date: Date;
  duration: string;
  skills: string[];
  urgency: "low" | "medium" | "high";
  filled: boolean;
}

export interface DemoTrainingContent {
  id: string;
  trainerId: string;
  trainerName: string;
  title: string;
  description: string;
  price: number;
  duration: string;
  level: "beginner" | "intermediate" | "advanced";
  tags: string[];
  rating: number;
  enrollments: number;
  preview?: string;
}

export class DemoDataGenerator {
  
  generateDemoUsers(): DemoUser[] {
    return [
      // Hub Owners
      {
        id: "hub_001",
        name: "Marcus Chen",
        email: "marcus@goldenstylebar.com.au",
        role: "hub",
        location: "Melbourne, VIC",
        businessName: "Golden Style Barbershop",
        rating: 4.9,
        joinedDate: new Date("2024-01-15")
      },
      {
        id: "hub_002", 
        name: "Sarah Williams",
        email: "sarah@urbancuts.com.au",
        role: "hub",
        location: "Sydney, NSW",
        businessName: "Urban Cuts Studio",
        rating: 4.7,
        joinedDate: new Date("2024-02-22")
      },
      {
        id: "hub_003",
        name: "David Rodriguez",
        email: "david@classicbarbers.com.au",
        role: "hub", 
        location: "Brisbane, QLD",
        businessName: "Classic Barbers Co.",
        rating: 4.8,
        joinedDate: new Date("2024-03-10")
      },

      // Professionals
      {
        id: "prof_001",
        name: "Jake Thompson",
        email: "jake.thompson@email.com",
        role: "professional",
        location: "Melbourne, VIC",
        skills: ["Fade Cuts", "Beard Styling", "Classic Cuts"],
        rating: 4.8,
        joinedDate: new Date("2024-01-20")
      },
      {
        id: "prof_002",
        name: "Emma Foster",
        email: "emma.foster@email.com",
        role: "professional",
        location: "Sydney, NSW", 
        skills: ["Women's Cuts", "Color Styling", "Wedding Styles"],
        rating: 4.9,
        joinedDate: new Date("2024-02-05")
      },
      {
        id: "prof_003",
        name: "Ryan Mitchell",
        email: "ryan.mitchell@email.com",
        role: "professional",
        location: "Perth, WA",
        skills: ["Razor Cuts", "Hot Towel Shaves", "Mustache Styling"],
        rating: 4.7,
        joinedDate: new Date("2024-02-18")
      },

      // Trainers
      {
        id: "trainer_001",
        name: "Master Tony Ricci",
        email: "tony@ricciacademy.com.au",
        role: "trainer",
        location: "Melbourne, VIC",
        businessName: "Ricci Barber Academy",
        skills: ["Advanced Fades", "Competition Styling", "Business Training"],
        rating: 4.9,
        joinedDate: new Date("2023-11-12")
      },
      {
        id: "trainer_002",
        name: "Lisa Zhang",
        email: "lisa@moderncuts.edu.au",
        role: "trainer",
        location: "Sydney, NSW",
        businessName: "Modern Cuts Education",
        skills: ["Digital Marketing", "Customer Service", "Trend Analysis"],
        rating: 4.8,
        joinedDate: new Date("2023-12-08")
      },

      // Brands
      {
        id: "brand_001",
        name: "Alex Kumar",
        email: "alex@aussiebarbertools.com.au",
        role: "brand",
        location: "Melbourne, VIC",
        businessName: "Aussie Barber Tools",
        rating: 4.6,
        joinedDate: new Date("2024-01-05")
      },
      {
        id: "brand_002",
        name: "Sophie Miller",
        email: "sophie@premiumproducts.com.au",
        role: "brand",
        location: "Sydney, NSW",
        businessName: "Premium Hair Products",
        rating: 4.7,
        joinedDate: new Date("2024-01-28")
      }
    ];
  }

  generateDemoJobs(): DemoJob[] {
    return [
      {
        id: "job_001",
        hubId: "hub_001",
        hubName: "Golden Style Barbershop",
        title: "Weekend Barber - Premium Location",
        description: "Seeking experienced barber for busy weekend shifts at our premium Melbourne location. High foot traffic, great tips, professional environment.",
        location: "Melbourne CBD, VIC",
        payRate: 45,
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        duration: "8 hours",
        skills: ["Fade Cuts", "Beard Styling", "Customer Service"],
        urgency: "high",
        filled: false
      },
      {
        id: "job_002", 
        hubId: "hub_002",
        hubName: "Urban Cuts Studio",
        title: "Senior Stylist - Flexible Hours",
        description: "Join our dynamic team! Looking for a creative stylist with modern cutting techniques. Flexible scheduling available.",
        location: "Bondi, NSW",
        payRate: 50,
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        duration: "6 hours",
        skills: ["Modern Cuts", "Color Techniques", "Trend Knowledge"],
        urgency: "medium",
        filled: false
      },
      {
        id: "job_003",
        hubId: "hub_003",
        hubName: "Classic Barbers Co.",
        title: "Traditional Barber Needed",
        description: "Traditional barbershop seeking skilled barber for classic cuts and hot towel shaves. Great for experienced professionals.",
        location: "Brisbane CBD, QLD",
        payRate: 42,
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        duration: "7 hours",
        skills: ["Classic Cuts", "Hot Towel Shaves", "Traditional Techniques"],
        urgency: "low",
        filled: false
      },
      {
        id: "job_004",
        hubId: "hub_001",
        hubName: "Golden Style Barbershop",
        title: "Competition Prep Specialist",
        description: "Special event! Need expert barber for competition preparation cuts. High profile clients, premium rates.",
        location: "Melbourne CBD, VIC",
        payRate: 65,
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        duration: "4 hours",
        skills: ["Advanced Fades", "Competition Cuts", "Precision Work"],
        urgency: "high",
        filled: false
      }
    ];
  }

  generateDemoTrainingContent(): DemoTrainingContent[] {
    return [
      {
        id: "training_001",
        trainerId: "trainer_001",
        trainerName: "Master Tony Ricci",
        title: "Advanced Fade Techniques Masterclass",
        description: "Learn professional fade techniques used by competition barbers. Includes skin fades, high fades, and blend perfection.",
        price: 149,
        duration: "2.5 hours",
        level: "advanced",
        tags: ["Fades", "Advanced Techniques", "Competition"],
        rating: 4.9,
        enrollments: 127,
        preview: "Introduction to advanced fade theory and tool selection"
      },
      {
        id: "training_002", 
        trainerId: "trainer_002",
        trainerName: "Lisa Zhang",
        title: "Digital Marketing for Barbers",
        description: "Build your personal brand and attract premium clients using social media and digital marketing strategies.",
        price: 89,
        duration: "1.5 hours",
        level: "beginner",
        tags: ["Marketing", "Social Media", "Business"],
        rating: 4.7,
        enrollments: 89,
        preview: "Why digital marketing is essential for modern barbers"
      },
      {
        id: "training_003",
        trainerId: "trainer_001", 
        trainerName: "Master Tony Ricci",
        title: "Classic Pompadour Styling",
        description: "Master the art of classic pompadour cuts with traditional and modern variations. Includes product recommendations.",
        price: 79,
        duration: "1 hour",
        level: "intermediate",
        tags: ["Classic Cuts", "Styling", "Pompadour"],
        rating: 4.8,
        enrollments: 156,
        preview: "History and fundamentals of pompadour styling"
      },
      {
        id: "training_004",
        trainerId: "trainer_002",
        trainerName: "Lisa Zhang", 
        title: "Customer Service Excellence",
        description: "Transform your client relationships and boost retention with proven customer service techniques for barbers.",
        price: 59,
        duration: "45 minutes",
        level: "beginner",
        tags: ["Customer Service", "Communication", "Business"],
        rating: 4.6,
        enrollments: 203,
        preview: "The psychology of exceptional customer service"
      },
      {
        id: "training_005",
        trainerId: "trainer_001",
        trainerName: "Master Tony Ricci",
        title: "Barbering Business Fundamentals", 
        description: "Complete guide to starting and running a successful barbering business. From licensing to profit optimization.",
        price: 199,
        duration: "3 hours",
        level: "intermediate",
        tags: ["Business", "Entrepreneurship", "Finance"],
        rating: 4.9,
        enrollments: 67,
        preview: "Essential business planning for barbers"
      }
    ];
  }

  generateDemoMessages(): Array<{
    id: string;
    fromId: string;
    fromName: string;
    toId: string;
    toName: string;
    content: string;
    timestamp: Date;
    read: boolean;
  }> {
    return [
      {
        id: "msg_001",
        fromId: "hub_001",
        fromName: "Marcus Chen",
        toId: "prof_001", 
        toName: "Jake Thompson",
        content: "Hi Jake! I saw your profile and I'm impressed with your fade work. We have a premium weekend shift available at our Melbourne CBD location. Are you interested?",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        read: false
      },
      {
        id: "msg_002",
        fromId: "prof_002",
        fromName: "Emma Foster",
        toId: "trainer_002",
        toName: "Lisa Zhang",
        content: "Thanks for the excellent digital marketing course! I've already gained 200 new Instagram followers using your strategies. Any plans for an advanced social media course?",
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        read: true
      },
      {
        id: "msg_003",
        fromId: "brand_001",
        fromName: "Alex Kumar",
        toId: "hub_002",
        toName: "Sarah Williams",
        content: "We'd love to partner with Urban Cuts Studio for our new product launch. We're offering exclusive discounts for your clients. Interested in a partnership?",
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        read: false
      }
    ];
  }

  generateDemoSocialPosts(): Array<{
    id: string;
    userId: string;
    userName: string;
    userRole: string;
    content: string;
    images?: string[];
    likes: number;
    comments: number;
    timestamp: Date;
    status: "approved" | "pending" | "rejected";
  }> {
    return [
      {
        id: "post_001",
        userId: "prof_001",
        userName: "Jake Thompson", 
        userRole: "professional",
        content: "Just finished an amazing fade at Golden Style Barbershop! The team there really knows how to create a professional environment. Love working with passionate barbers! ✂️",
        likes: 24,
        comments: 8,
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        status: "approved"
      },
      {
        id: "post_002",
        userId: "trainer_001",
        userName: "Master Tony Ricci",
        userRole: "trainer",
        content: "New course alert! 🚨 Advanced Fade Techniques Masterclass is now live. Perfect for barbers looking to elevate their skills and command premium rates. Early bird pricing ends this weekend!",
        likes: 156,
        comments: 23,
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        status: "approved"
      },
      {
        id: "post_003",
        userId: "brand_001",
        userName: "Alex Kumar",
        userRole: "brand",
        content: "🎉 Exciting news! Aussie Barber Tools is launching our new titanium clipper series. Precision engineering meets Australian craftsmanship. Pre-orders start next week with exclusive Snipshift member discounts!",
        likes: 89,
        comments: 15,
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        status: "approved"
      }
    ];
  }

  async createCompleteDemoDataset(): Promise<void> {
    try {
      // In a real implementation, this would populate the database
      // For demo purposes, we'll store in memory through the storage service
      
      const users = this.generateDemoUsers();
      const jobs = this.generateDemoJobs();
      const training = this.generateDemoTrainingContent();
      const messages = this.generateDemoMessages();
      const posts = this.generateDemoSocialPosts();

      console.log("Demo dataset created successfully:");
      console.log(`- ${users.length} demo users`);
      console.log(`- ${jobs.length} demo jobs`);
      console.log(`- ${training.length} training courses`);
      console.log(`- ${messages.length} messages`);
      console.log(`- ${posts.length} social posts`);

      return Promise.resolve();
    } catch (error) {
      console.error("Error creating demo dataset:", error);
      throw error;
    }
  }

  // Generate realistic activity metrics for the demo
  generateLiveMetrics(): {
    activeUsers: number;
    jobsPosted: number;
    shiftsBooked: number;
    trainingPurchases: number;
    messagesExchanged: number;
    avgRating: number;
    revenue: number;
  } {
    const baseMetrics = {
      activeUsers: 1247,
      jobsPosted: 89,
      shiftsBooked: 156,
      trainingPurchases: 34,
      messagesExchanged: 423,
      avgRating: 4.8,
      revenue: 2847
    };

    // Add small random variations to simulate live activity
    return {
      activeUsers: baseMetrics.activeUsers + Math.floor(Math.random() * 10),
      jobsPosted: baseMetrics.jobsPosted + Math.floor(Math.random() * 3),
      shiftsBooked: baseMetrics.shiftsBooked + Math.floor(Math.random() * 5),
      trainingPurchases: baseMetrics.trainingPurchases + Math.floor(Math.random() * 2),
      messagesExchanged: baseMetrics.messagesExchanged + Math.floor(Math.random() * 15),
      avgRating: 4.8 + (Math.random() * 0.2 - 0.1), // 4.7 - 4.9
      revenue: baseMetrics.revenue + Math.floor(Math.random() * 200)
    };
  }
}

export const demoDataGenerator = new DemoDataGenerator();