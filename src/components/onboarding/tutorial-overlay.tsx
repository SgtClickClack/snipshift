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
      content: "Click here to post jobs and attract talented professionals to your barbershop.",
      target: "[data-testid='button-post-job']",
      position: "bottom"
    },
    {
      id: "manage-team",
      title: "Manage Your Team",
      content: "View and manage your professional team members and their schedules.",
      target: "[data-testid='card-team-overview']",
      position: "top"
    },
    {
      id: "social-feed",
      title: "Community Connection",
      content: "Stay connected with the barbering community through our social feed.",
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
      content: "Browse available jobs near you using our interactive map and filters.",
      target: "[data-testid='button-browse-jobs']",
      position: "bottom"
    },
    {
      id: "profile",
      title: "Build Your Profile",
      content: "Complete your profile to attract the best Business opportunities.",
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
      content: "Share your latest products and offers with our professional community.",
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
      content: "Create and upload your training videos to build your education business.",
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
    if (user?.currentRole) {
      setUserRole(user.currentRole);
      
      // Only show tutorial on dashboard pages, not login/signup
      const isDashboardPage = window.location.pathname.includes('-dashboard');
      const hasSeenTutorial = localStorage.getItem(`tutorial-seen-${user.currentRole}`);
      
      if (!hasSeenTutorial && isDashboardPage && tutorialSteps[user.currentRole]) {
        // Delay to ensure dashboard has fully loaded
        setTimeout(() => setIsVisible(true), 1500);
      }
    }
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

  // Disable overlay during e2e to avoid interference
  if (import.meta.env.VITE_E2E === '1') return null;
  if (!isVisible || !currentStepData) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm pointer-events-none" data-testid="tutorial-overlay">
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-auto">
        <Card className="w-full max-w-md bg-white dark:bg-steel-900 shadow-xl">
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
  const [isVisible, setIsVisible] = useState(false);
  const { user } = useAuth();

  const restartTutorial = () => {
    if (user?.currentRole) {
      localStorage.removeItem(`tutorial-seen-${user.currentRole}`);
      window.location.reload(); // Reload to show tutorial
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