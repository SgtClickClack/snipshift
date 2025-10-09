import React, { useState, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Step {
  id: string;
  title: string;
  description?: string;
  component: ReactNode;
  validation?: () => boolean;
}

interface MultiStepFormProps {
  steps: Step[];
  onComplete: (data: any) => void;
  onCancel?: () => void;
  title: string;
  subtitle?: string;
  className?: string;
}

export function MultiStepForm({ 
  steps, 
  onComplete, 
  onCancel, 
  title, 
  subtitle,
  className 
}: MultiStepFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const updateFormData = (stepId: string, data: any) => {
    setFormData(prev => ({ ...prev, [stepId]: data }));
  };

  const validateCurrentStep = () => {
    if (currentStepData.validation) {
      return currentStepData.validation();
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        // All steps completed
        onComplete(formData);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    // Allow navigation to completed steps or the next step
    if (completedSteps.has(stepIndex) || stepIndex === currentStep + 1) {
      setCurrentStep(stepIndex);
    }
  };

  return (
    <div className={cn("min-h-screen bg-gradient-to-br from-steel-50 via-white to-chrome-light/20 p-6", className)}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-steel-900 mb-2">{title}</h1>
          {subtitle && (
            <p className="text-steel-600 text-lg">{subtitle}</p>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-steel-700">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm text-steel-500">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Navigation */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-2">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => handleStepClick(index)}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                  {
                    "bg-red-accent text-white": index === currentStep,
                    "bg-steel-200 text-steel-600": index < currentStep && !completedSteps.has(index),
                    "bg-green-500 text-white": completedSteps.has(index),
                    "bg-steel-100 text-steel-400 cursor-not-allowed": index > currentStep + 1,
                    "bg-steel-200 text-steel-600 cursor-pointer": index === currentStep + 1,
                  }
                )}
                disabled={index > currentStep + 1}
              >
                {completedSteps.has(index) ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Current Step Content */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
            {currentStepData.description && (
              <p className="text-steel-600">{currentStepData.description}</p>
            )}
          </CardHeader>
          <CardContent>
            {React.cloneElement(currentStepData.component as React.ReactElement, {
              data: formData[currentStepData.id] || {},
              updateData: (data: any) => updateFormData(currentStepData.id, data),
            })}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <div>
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
          
          <div className="flex space-x-4">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handlePrevious}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
            )}
            
            <Button 
              onClick={handleNext}
              className="bg-gradient-to-r from-red-accent to-red-accent-dark hover:from-red-accent-dark hover:to-red-accent"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  Complete Setup
                  <Check className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
