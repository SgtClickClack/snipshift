import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, ArrowRight, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface TutorialStep {
  id: string;
  title: string;
  content: string;
  target?: string;
  position: "top" | "bottom" | "left" | "right" | "center";
}

const tutorialSteps: Record<string, TutorialStep[]> = {
  hub: [
    {
      id: "welcome",
      title: "Welcome to Snipshift!",
      content: "Let's take a quick tour of your Business dashboard and key features.",
      position: "center"
    },
    {
      id: "post-job",
      title: "Post Your First Job",
      content: "Tap the + button to post a shift and attract talented professionals to your barbershop.",
      target: "[data-testid='button-post-job']",
      position: "bottom"
    },
    {
      id: "manage-team",
      title: "Manage Your Team",
      content: "Tap the Menu icon to access your Team management and schedules.",
      target: "[data-testid='card-team-overview']",
      position: "top"
    },
    {
      id: "social-feed",
      title: "Community Connection",
      content: "Tap the Menu icon to find the Community feed and stay connected.",
      target: "[data-testid='link-social-feed']",
      position: "left"
    }
  ],
  professional: [
    {
      id: "welcome",
      title: "Welcome Professional!",
      content: "Discover jobs, connect with Businesses, and showcase your skills.",
      position: "center"
    },
    {
      id: "job-search",
      title: "Find Your Next Opportunity",
      content: "Tap 'Find Work' to browse available jobs near you using our interactive map.",
      target: "[data-testid='button-browse-jobs']",
      position: "bottom"
    },
    {
      id: "profile",
      title: "Build Your Profile",
      content: "Tap the Menu icon to access your Profile and attract the best Business opportunities.",
      target: "[data-testid='link-profile']",
      position: "right"
    }
  ],
  brand: [
    {
      id: "welcome",
      title: "Welcome Brand Partner!",
      content: "Reach the barbering community with your products and promotions.",
      position: "center"
    },
    {
      id: "create-promotion",
      title: "Create Promotions",
      content: "Tap the + button to share your latest products and offers with our professional community.",
      target: "[data-testid='button-create-promotion']",
      position: "bottom"
    }
  ],
  trainer: [
    {
      id: "welcome",
      title: "Welcome Trainer!",
      content: "Share your expertise and monetize your training content.",
      position: "center"
    },
    {
      id: "upload-content",
      title: "Upload Training Content",
      content: "Tap the + button to create and upload your training videos.",
      target: "[data-testid='button-upload-content']",
      position: "bottom"
    }
  ]
};

export function TutorialOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [userRole, setUserRole] = useState<string>("");
  const { user } = useAuth();

  useEffect(() => {
    const handleStartTutorial = () => {
      const role = user?.currentRole === 'business' ? 'hub' : user?.currentRole;
      if (role && tutorialSteps[role]) {
        localStorage.removeItem(`tutorial-seen-${role}`);
        setUserRole(role);
        setCurrentStep(0);
        setIsVisible(true);
      }
    };

    window.addEventListener('start-tutorial', handleStartTutorial);

    if (user?.currentRole) {
      const role = user.currentRole === 'business' ? 'hub' : user.currentRole;
      setUserRole(role);
      
      // Only show tutorial on dashboard pages, not login/signup
      const isDashboardPage = window.location.pathname.includes('-dashboard');
      const hasSeenTutorial = localStorage.getItem(`tutorial-seen-${role}`);
      
      if (!hasSeenTutorial && isDashboardPage && tutorialSteps[role]) {
        // Delay to ensure dashboard has fully loaded
        setTimeout(() => setIsVisible(true), 1500);
      }
    }

    return () => {
      window.removeEventListener('start-tutorial', handleStartTutorial);
    };
  }, [user]);

  const steps = tutorialSteps[userRole] || [];
  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem(`tutorial-seen-${userRole}`, "true");
  };

  const handleSkip = () => {
    handleClose();
  };

  // Early return: Disable overlay during e2e to avoid interference
  // This check prevents any rendering in E2E test environments
  if (import.meta.env.VITE_E2E === '1') return null;

  // Early return: Do not render if tutorial is not visible or no step data
  // This prevents any DOM element from being created that could block pointer events
  // When inactive, the component returns null, ensuring no overlay exists in the DOM
  if (!isVisible || !currentStepData || !userRole) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm pointer-events-none" data-testid="tutorial-overlay">
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-auto">
        <Card className="w-full max-w-md bg-card shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {steps.length}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                data-testid="button-close-tutorial"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <h3 className="text-lg font-semibold mb-3" data-testid="tutorial-title">
              {currentStepData.title}
            </h3>
            
            <p className="text-muted-foreground mb-6" data-testid="tutorial-content">
              {currentStepData.content}
            </p>
            
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handleSkip}
                data-testid="button-skip-tutorial"
              >
                Skip Tour
              </Button>
              
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    data-testid="button-previous-step"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                )}
                
                <Button
                  onClick={handleNext}
                  data-testid="button-next-step"
                >
                  {currentStep < steps.length - 1 ? (
                    <>
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  ) : (
                    "Get Started"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Manual tutorial trigger component
export function TutorialTrigger() {
  const { user } = useAuth();

  const restartTutorial = () => {
    if (user?.currentRole) {
      window.dispatchEvent(new CustomEvent('start-tutorial'));
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={restartTutorial}
      data-testid="button-restart-tutorial"
    >
      View Tutorial
    </Button>
  );
}
