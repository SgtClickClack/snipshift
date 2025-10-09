import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ExpoDemoMode from "@/components/demo/expo-demo-mode";
import { DesignSystemShowcase } from "@/components/demo/design-system-showcase";
import { 
  Presentation, 
  Users, 
  Palette, 
  Code, 
  MessageSquare,
  CreditCard,
  Shield,
  Globe,
  Smartphone,
  Zap
} from "lucide-react";

export default function ExpoDemo() {
  const [activeDemo, setActiveDemo] = useState<string>("overview");

  const demoSections = [
    {
      id: "overview",
      title: "Platform Overview",
      icon: Presentation,
      description: "Complete marketplace demonstration"
    },
    {
      id: "live-demo",
      title: "Live Scenarios",
      icon: Zap,
      description: "Interactive user journey simulations"
    },
    {
      id: "design",
      title: "Design System",
      icon: Palette,
      description: "UI components and branding"
    }
  ];

  const platformFeatures = [
    {
      icon: Users,
      title: "Multi-Role Platform",
      description: "Hub Owners, Professionals, Brands, and Trainers",
      highlights: ["Role-specific dashboards", "Targeted workflows", "Professional verification"]
    },
    {
      icon: Globe,
      title: "Geolocation Matching",
      description: "Smart job matching with location-based filters",
      highlights: ["15-50km radius search", "Interstate toggle", "Real-time availability"]
    },
    {
      icon: CreditCard,
      title: "Secure Payments",
      description: "Stripe-powered escrow system with automated payouts",
      highlights: ["90/10 trainer revenue split", "Instant payment confirmation", "Fraud protection"]
    },
    {
      icon: MessageSquare,
      title: "Community Features",
      description: "Social feed with content moderation and professional networking",
      highlights: ["Anti-spam protection", "Brand promotion", "Direct messaging"]
    },
    {
      icon: Shield,
      title: "Content Moderation",
      description: "Automated spam detection with human review",
      highlights: ["Risk scoring algorithm", "Professional standards", "Appeals process"]
    },
    {
      icon: Smartphone,
      title: "Mobile Optimized",
      description: "Responsive design for on-the-go professionals",
      highlights: ["Touch-friendly interface", "Fast loading", "Offline capabilities"]
    }
  ];

  const businessMetrics = [
    { label: "Target Market Size", value: "45,000+", subtitle: "Licensed barbers in Australia" },
    { label: "Platform Revenue", value: "10%", subtitle: "Transaction fee model" },
    { label: "User Retention", value: "85%", subtitle: "Monthly active users" },
    { label: "Job Fill Rate", value: "92%", subtitle: "Posted shifts filled" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Snipshift Platform Demo</h1>
            <p className="text-xl mb-6 opacity-90">
              Australia's Premier Marketplace for the Barbering & Creative Industries
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Badge className="bg-white/20 text-white border-white/30">
                🇦🇺 Australian Market Leader
              </Badge>
              <Badge className="bg-white/20 text-white border-white/30">
                💳 Stripe-Powered Payments
              </Badge>
              <Badge className="bg-white/20 text-white border-white/30">
                🛡️ Enterprise Security
              </Badge>
              <Badge className="bg-white/20 text-white border-white/30">
                📱 Mobile-First Design
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Demo Navigation */}
        <div className="mb-8">
          <div className="flex flex-wrap justify-center gap-3">
            {demoSections.map((section) => {
              const IconComponent = section.icon;
              return (
                <Button
                  key={section.id}
                  variant={activeDemo === section.id ? "default" : "outline"}
                  onClick={() => setActiveDemo(section.id)}
                  className="flex items-center gap-2"
                  data-testid={`demo-nav-${section.id}`}
                >
                  <IconComponent className="h-4 w-4" />
                  {section.title}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Demo Content */}
        <div className="space-y-8">
          {activeDemo === "overview" && (
            <>
              {/* Business Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Presentation className="h-5 w-5 mr-2" />
                    Market Opportunity & Platform Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {businessMetrics.map((metric, index) => (
                      <div key={index} className="text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-1">
                          {metric.value}
                        </div>
                        <div className="font-medium text-neutral-900 mb-1">
                          {metric.label}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {metric.subtitle}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Platform Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {platformFeatures.map((feature, index) => {
                  const IconComponent = feature.icon;
                  return (
                    <Card key={index} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="flex items-center text-lg">
                          <IconComponent className="h-6 w-6 mr-3 text-blue-600" />
                          {feature.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-muted-foreground text-sm">
                          {feature.description}
                        </p>
                        <ul className="space-y-1">
                          {feature.highlights.map((highlight, idx) => (
                            <li key={idx} className="text-sm flex items-center">
                              <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                              {highlight}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Value Proposition */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-green-800">For Barbershops</CardTitle>
                  </CardHeader>
                  <CardContent className="text-green-700 space-y-2">
                    <p className="font-medium mb-3">Streamline Operations & Reduce Costs</p>
                    <ul className="space-y-1 text-sm">
                      <li>• Instant access to verified professionals</li>
                      <li>• Reduce recruitment time by 80%</li>
                      <li>• Built-in insurance verification</li>
                      <li>• No upfront fees - pay only when hiring</li>
                      <li>• Professional rating system</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-blue-800">For Professionals</CardTitle>
                  </CardHeader>
                  <CardContent className="text-blue-700 space-y-2">
                    <p className="font-medium mb-3">Maximize Earnings & Career Growth</p>
                    <ul className="space-y-1 text-sm">
                      <li>• Find shifts within 15-50km radius</li>
                      <li>• Competitive rates at premium shops</li>
                      <li>• Access professional development content</li>
                      <li>• Build network with industry leaders</li>
                      <li>• Flexible scheduling options</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Technology Stack */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Code className="h-5 w-5 mr-2" />
                    Technology & Security
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Frontend</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• React with TypeScript</li>
                        <li>• Responsive Tailwind CSS</li>
                        <li>• Progressive Web App</li>
                        <li>• Real-time updates</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Backend</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Node.js with Express</li>
                        <li>• PostgreSQL database</li>
                        <li>• RESTful API design</li>
                        <li>• Automated testing</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Security</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• 256-bit SSL encryption</li>
                        <li>• OAuth 2.0 authentication</li>
                        <li>• GDPR compliant</li>
                        <li>• Australian data sovereignty</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeDemo === "live-demo" && (
            <ExpoDemoMode />
          )}

          {activeDemo === "design" && (
            <DesignSystemShowcase />
          )}
        </div>

        {/* Call to Action */}
        <div className="mt-12">
          <Alert className="border-blue-200 bg-blue-50">
            <Presentation className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <strong>Ready to Transform Your Business?</strong>
                  <p className="mt-1">
                    Join Australia's fastest-growing barbering marketplace. Get started today 
                    with our exclusive Barber Expo launch offer.
                  </p>
                </div>
                <div className="mt-4 md:mt-0 md:ml-6 flex gap-3">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Sign Up Today
                  </Button>
                  <Button variant="outline">
                    Schedule Demo
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}