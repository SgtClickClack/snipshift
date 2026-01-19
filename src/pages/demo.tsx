import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardRoute } from "@/lib/roles";
import { useNavigate } from "react-router-dom";
import { Scissors, Store, UserCheck, Award, Globe, Users, Video, Share2, Shield, Play, DollarSign, Star } from "lucide-react";

export default function DemoPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const quickLogin = (role: "hub" | "professional" | "trainer" | "brand") => {
    const demoUsers = {
      hub: {
        id: "demo_hub_1",
        email: "demo@venue.com",
        password: null,
        displayName: "Downtown Venue",
        role: "hub" as const,
        provider: "email" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        profileComplete: true,
        hubProfile: {
          businessName: "Downtown Venue",
          location: {
            address: "123 Main St",
            city: "New York",
            state: "NY",
            postcode: "10001",
            country: "USA"
          },
          businessType: "venue" as const
        }
      },
      professional: {
        id: "demo_pro_1",
        email: "demo@staff.com",
        password: null,
        displayName: "John Smith",
        role: "professional" as const,
        provider: "email" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        profileComplete: true,
        professionalProfile: {
          firstName: "John",
          lastName: "Smith",
          skills: ["Hair Cutting", "Beard Styling"],
          experience: "5+ years",
          hourlyRate: 50
        }
      },
      trainer: {
        id: "demo_trainer_1",
        email: "demo@trainer.com",
        password: null,
        displayName: "Master Staff Mike",
        role: "trainer" as const,
        provider: "email" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        profileComplete: true,
        trainerProfile: {
          qualifications: ["Master Staff License", "10+ years experience"],
          specializations: ["Advanced Fades", "Beard Care", "Business Training"],
          yearsExperience: 12,
          trainingLocation: "Downtown Training Center"
        }
      },
      brand: {
        id: "demo_brand_1",
        email: "demo@brand.com",
        password: null,
        displayName: "ProfHair Products",
        role: "brand" as const,
        provider: "email" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        profileComplete: true,
        brandProfile: {
          companyName: "ProfHair Products",
          website: "https://profhair.com",
          description: "Premium professional hair styling products",
          productCategories: ["Styling Tools", "Hair Products", "Accessories"]
        }
      }
    };

    const user = demoUsers[role];
    login(user as any);
    navigate(getDashboardRoute(role));
  };

  const features = [
    {
      title: "Trainer Dashboard",
      description: "Upload and monetize training content with video courses",
      icon: Award,
      color: "bg-blue-100 text-blue-800",
      demo: () => quickLogin("trainer"),
      highlights: [
        "Content upload with pricing",
        "Revenue analytics",
        "Student engagement tracking",
        "Course categorization"
      ]
    },
    {
      title: "Brand Dashboard", 
      description: "Create social posts and manage brand promotions",
      icon: Globe,
      color: "bg-purple-100 text-purple-800",
      demo: () => quickLogin("brand"),
      highlights: [
        "Social post creation",
        "Discount code management",
        "Content approval workflow",
        "Engagement analytics"
      ]
    },
    {
      title: "Social Feed",
      description: "Community feed with brand promotions and trainer events",
      icon: Share2,
      color: "bg-green-100 text-green-800",
      demo: () => navigate("/social-feed"),
      highlights: [
        "Approved brand posts",
        "Training events",
        "Discount codes",
        "Interactive engagement"
      ]
    },
    {
      title: "Training Hub",
      description: "Video marketplace with paid and free educational content",
      icon: Video,
      color: "bg-orange-100 text-orange-800",
      demo: () => navigate("/training-hub"),
      highlights: [
        "Video course library",
        "Mock payment system",
        "Progress tracking",
        "Skill level filtering"
      ]
    },
    {
      title: "Content Moderation",
      description: "Admin panel for reviewing and approving content",
      icon: Shield,
      color: "bg-red-100 text-red-800",
      demo: () => navigate("/admin"),
      highlights: [
        "Post approval workflow",
        "Training content review",
        "Quality control",
        "Spam prevention"
      ]
    }
  ];

  // Empty array - should pull from API/database
  const sampleContent: Array<{
    type: string;
    title: string;
    author: string;
    engagement: string;
    status: string;
  }> = [];

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
          <div className="text-center">
            <Scissors className="text-6xl mx-auto mb-6 opacity-90" />
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              HospoGo Platform Demo
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
              B2B2C marketplace for the hospitality industry
            </p>
            <div className="flex justify-center gap-4 mb-8">
              <Button 
                variant="accent"
                size="lg"
                onClick={() => navigate('/design-showcase')}
              >
                View Design System
              </Button>
            </div>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                ✓ Trainer Content Monetization
              </Badge>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                ✓ Brand Social Marketing
              </Badge>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                ✓ Content Moderation
              </Badge>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                ✓ Training Marketplace
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-neutral-900 mb-4">Try the Platform</h2>
          <p className="text-neutral-600 text-lg">Click any role below to instantly access demo accounts</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-16">
          {[
            { role: "hub", label: "Venue", icon: Store, description: "Manage venue operations" },
            { role: "professional", label: "Pro", icon: UserCheck, description: "Find jobs and gigs" },
            { role: "trainer", label: "Trainer", icon: Award, description: "Monetize your expertise" },
            { role: "brand", label: "Brand", icon: Globe, description: "Promote your products" }
          ].map((item) => (
            <Card key={item.role} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent 
                className="p-6 text-center" 
                onClick={() => quickLogin(item.role as any)}
                data-testid={`demo-login-${item.role}`}
              >
                <item.icon className="h-12 w-12 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-neutral-900 mb-2">{item.label}</h3>
                <p className="text-sm text-neutral-600 mb-4">{item.description}</p>
                <Button size="sm" className="w-full">
                  Login as {item.label}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features Showcase */}
        <h2 className="text-3xl font-bold text-neutral-900 mb-8 text-center">New Platform Features</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 mb-16">
          {features.map((feature) => (
            <Card key={feature.title} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <Badge className={feature.color} variant="outline">
                      NEW
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600 mb-4">{feature.description}</p>
                <ul className="space-y-2 mb-6">
                  {feature.highlights.map((highlight, index) => (
                    <li key={index} className="flex items-center text-sm text-neutral-600">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3"></div>
                      {highlight}
                    </li>
                  ))}
                </ul>
                <Button onClick={feature.demo} className="w-full">
                  Try Feature
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sample Content */}
        <div className="bg-card rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-bold text-neutral-900 mb-6">Live Platform Content</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {sampleContent.map((content, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className="text-xs">
                    {content.type}
                  </Badge>
                  <Badge variant={content.status === "Approved" ? "default" : content.status === "Free" ? "secondary" : "outline"}>
                    {content.status}
                  </Badge>
                </div>
                <h3 className="font-semibold text-neutral-900 mb-2 text-sm">{content.title}</h3>
                <p className="text-xs text-neutral-600 mb-2">by {content.author}</p>
                <p className="text-xs text-neutral-500">{content.engagement}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Public Features */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-neutral-900 mb-6">Explore Public Features</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Button variant="outline" onClick={() => navigate("/social-feed")}>
              <Share2 className="mr-2 h-4 w-4" />
              View Social Feed
            </Button>
            <Button variant="outline" onClick={() => navigate("/training-hub")}>
              <Video className="mr-2 h-4 w-4" />
              Browse Training Hub
            </Button>
            <Button variant="outline" onClick={() => navigate("/signup")}>
              <Users className="mr-2 h-4 w-4" />
              Create Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}