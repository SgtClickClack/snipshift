import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Users, 
  Briefcase, 
  GraduationCap, 
  Building2,
  CreditCard,
  CheckCircle,
  TrendingUp,
  MessageSquare,
  Star,
  DollarSign
} from "lucide-react";

interface DemoStats {
  users: number;
  jobs: number;
  purchases: number;
  revenue: number;
  messages: number;
  ratings: number;
}

interface DemoScenario {
  id: string;
  title: string;
  description: string;
  steps: string[];
  duration: number;
  icon: any;
}

export default function ExpoDemoMode() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<DemoStats>({
    users: 1247,
    jobs: 89,
    purchases: 34,
    revenue: 2847,
    messages: 156,
    ratings: 4.8
  });

  const scenarios: DemoScenario[] = [
    {
      id: "hub_onboarding",
      title: "Hub Owner Onboarding",
      description: "Barbershop owner creates account and posts first job",
      steps: [
        "Create Hub Owner account",
        "Complete business profile",
        "Upload insurance verification",
        "Post urgent weekend shift",
        "Set competitive hourly rate"
      ],
      duration: 30,
      icon: Building2
    },
    {
      id: "professional_booking",
      title: "Professional Job Booking",
      description: "Barber finds and books shift using geolocation",
      steps: [
        "Professional logs in",
        "Search jobs within 15km radius",
        "Filter by weekend availability",
        "Apply for premium barbershop shift",
        "Receive instant confirmation"
      ],
      duration: 25,
      icon: Briefcase
    },
    {
      id: "training_purchase",
      title: "Training Content Purchase",
      description: "Professional buys advanced fade course with Stripe",
      steps: [
        "Browse training marketplace",
        "Preview advanced fade course",
        "Secure Stripe payment ($149)",
        "Access premium video content",
        "Track learning progress"
      ],
      duration: 35,
      icon: GraduationCap
    },
    {
      id: "community_engagement",
      title: "Community Interaction",
      description: "Users engage with social feed and messaging",
      steps: [
        "Brand posts product showcase",
        "Content passes moderation",
        "Professionals engage with likes",
        "Direct messaging for inquiries",
        "Build professional network"
      ],
      duration: 20,
      icon: MessageSquare
    }
  ];

  const startDemo = (scenarioId: string) => {
    setCurrentScenario(scenarioId);
    setIsRunning(true);
    setProgress(0);
  };

  const pauseDemo = () => {
    setIsRunning(false);
  };

  const resetDemo = () => {
    setIsRunning(false);
    setCurrentScenario(null);
    setProgress(0);
    setStats({
      users: 1247,
      jobs: 89,
      purchases: 34,
      revenue: 2847,
      messages: 156,
      ratings: 4.8
    });
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && currentScenario) {
      const scenario = scenarios.find(s => s.id === currentScenario);
      if (scenario) {
        interval = setInterval(() => {
          setProgress(prev => {
            const newProgress = prev + (100 / scenario.duration);
            
            // Update stats during demo
            if (newProgress > 20 && newProgress < 25) {
              setStats(prev => ({
                ...prev,
                users: prev.users + Math.floor(Math.random() * 3) + 1
              }));
            }
            
            if (newProgress > 50 && newProgress < 55) {
              setStats(prev => ({
                ...prev,
                jobs: prev.jobs + 1,
                messages: prev.messages + Math.floor(Math.random() * 5) + 2
              }));
            }
            
            if (newProgress > 80 && newProgress < 85) {
              setStats(prev => ({
                ...prev,
                purchases: prev.purchases + 1,
                revenue: prev.revenue + Math.floor(Math.random() * 200) + 50
              }));
            }
            
            if (newProgress >= 100) {
              setIsRunning(false);
              setCurrentScenario(null);
              return 100;
            }
            
            return newProgress;
          });
        }, 1000);
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, currentScenario]);

  const currentScenarioData = scenarios.find(s => s.id === currentScenario);
  const currentStep = currentScenarioData ? 
    Math.floor((progress / 100) * currentScenarioData.steps.length) : 0;

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-neutral-50 to-neutral-100 min-h-screen" data-testid="expo-demo-mode">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mr-3">
            <Play className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900">Barber Expo Demo</h1>
        </div>
        <p className="text-neutral-600 max-w-2xl mx-auto">
          Interactive demonstration of Snipshift's core features for the Australian 
          barbering and creative industries marketplace.
        </p>
        <Badge className="mt-3 bg-green-600">Live Demo Mode</Badge>
      </div>

      {/* Real-time Stats Dashboard */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-800">
            <TrendingUp className="h-5 w-5 mr-2" />
            Live Platform Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700">{stats.users.toLocaleString()}</div>
              <div className="text-sm text-blue-600">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">{stats.jobs}</div>
              <div className="text-sm text-green-600">Open Jobs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-700">{stats.purchases}</div>
              <div className="text-sm text-purple-600">Training Sales</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-700">${stats.revenue.toLocaleString()}</div>
              <div className="text-sm text-orange-600">Revenue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-700">{stats.messages}</div>
              <div className="text-sm text-indigo-600">Messages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-700">{stats.ratings}</div>
              <div className="text-sm text-yellow-600">Avg Rating</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Controls */}
      <div className="flex items-center justify-center gap-3">
        <Button
          onClick={pauseDemo}
          disabled={!isRunning}
          variant="outline"
          data-testid="button-pause-demo"
        >
          <Pause className="h-4 w-4 mr-2" />
          Pause Demo
        </Button>
        <Button
          onClick={resetDemo}
          variant="outline"
          data-testid="button-reset-demo"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset All
        </Button>
      </div>

      {/* Current Demo Progress */}
      {currentScenario && currentScenarioData && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center text-green-800">
              <currentScenarioData.icon className="h-5 w-5 mr-2" />
              Running: {currentScenarioData.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-green-700">{currentScenarioData.description}</p>
            <Progress value={progress} className="w-full" />
            <div className="space-y-2">
              {currentScenarioData.steps.map((step, index) => (
                <div 
                  key={index} 
                  className={`flex items-center text-sm ${
                    index < currentStep 
                      ? 'text-green-700' 
                      : index === currentStep 
                        ? 'text-green-800 font-medium' 
                        : 'text-green-600'
                  }`}
                >
                  {index < currentStep ? (
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  ) : index === currentStep ? (
                    <div className="h-4 w-4 mr-2 border-2 border-green-600 rounded-full animate-pulse" />
                  ) : (
                    <div className="h-4 w-4 mr-2 border border-green-400 rounded-full" />
                  )}
                  {step}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Demo Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {scenarios.map((scenario) => {
          const IconComponent = scenario.icon;
          const isActive = currentScenario === scenario.id;
          
          return (
            <Card 
              key={scenario.id} 
              className={`cursor-pointer transition-all hover:shadow-lg ${
                isActive ? 'ring-2 ring-green-500 bg-green-50' : ''
              }`}
              data-testid={`scenario-card-${scenario.id}`}
            >
              <CardHeader>
                <CardTitle className="flex items-center">
                  <IconComponent className={`h-6 w-6 mr-3 ${
                    isActive ? 'text-green-600' : 'text-blue-600'
                  }`} />
                  {scenario.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  {scenario.description}
                </p>
                
                <div className="space-y-1">
                  <div className="text-sm font-medium">Demo Steps:</div>
                  <ul className="text-xs space-y-1">
                    {scenario.steps.map((step, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-muted-foreground mr-2">{index + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="flex items-center justify-between">
                  <Badge variant="outline">
                    <Users className="h-3 w-3 mr-1" />
                    {scenario.duration}s demo
                  </Badge>
                  <Button
                    size="sm"
                    onClick={() => startDemo(scenario.id)}
                    disabled={isRunning}
                    className={isActive ? 'bg-green-600 hover:bg-green-700' : ''}
                    data-testid={`button-start-${scenario.id}`}
                  >
                    {isActive ? (
                      <>
                        <Pause className="h-4 w-4 mr-1" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-1" />
                        Start Demo
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Key Features Highlight */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Star className="h-5 w-5 mr-2 text-yellow-600" />
            Key Platform Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center">
                <CreditCard className="h-4 w-4 mr-2 text-blue-600" />
                Secure Payments
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Stripe-powered escrow system</li>
                <li>• 90/10 revenue split for trainers</li>
                <li>• Instant payment confirmation</li>
                <li>• Fraud protection built-in</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center">
                <Users className="h-4 w-4 mr-2 text-green-600" />
                Smart Matching
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Geolocation-based job search</li>
                <li>• Skill-based filtering</li>
                <li>• Real-time availability</li>
                <li>• Professional verification</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center">
                <DollarSign className="h-4 w-4 mr-2 text-purple-600" />
                Business Tools
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Training monetization</li>
                <li>• Brand promotion platform</li>
                <li>• Content moderation</li>
                <li>• Analytics dashboard</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expo Information */}
      <Alert className="border-yellow-200 bg-yellow-50">
        <Building2 className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <strong>Barber Expo Integration:</strong> This demo mode showcases real platform 
          functionality with simulated data flows. All payment processing uses Stripe's 
          test mode for safe demonstration. Ask our team about onboarding your business 
          to the live platform!
        </AlertDescription>
      </Alert>
    </div>
  );
}