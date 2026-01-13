import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LocationInput } from '@/components/ui/location-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/useToast';
import { apiRequest } from '@/lib/queryClient';
import { SEO } from '@/components/seo/SEO';
import { Building2, CreditCard, CheckCircle, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface PlanInfo {
  id: string;
  name: string;
  price: string;
  tier: string;
}

// Payment Form Component
function PaymentForm({ 
  onSuccess, 
  onBack,
  isSubmitting,
  setIsSubmitting 
}: { 
  onSuccess: () => void; 
  onBack: () => void;
  isSubmitting: boolean;
  setIsSubmitting: (v: boolean) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/onboarding/hub?payment_success=true`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'An error occurred');
        setIsSubmitting(false);
      } else {
        toast({
          title: "Payment Method Saved",
          description: "Your card has been saved successfully.",
          variant: "default",
        });
        onSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-steel-50 rounded-lg border border-steel-200">
        <PaymentElement />
      </div>
      {errorMessage && (
        <div className="text-red-500 text-sm p-3 bg-red-50 rounded-lg border border-red-200">
          {errorMessage}
        </div>
      )}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button
          type="submit"
          variant="accent"
          disabled={!stripe || isSubmitting}
          className="flex-1 shadow-neon-realistic"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Save & Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default function HubOnboardingPage() {
  const { user, refreshUser, login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanInfo | null>(null);
  const [isTrialMode, setIsTrialMode] = useState(false);
  const [formData, setFormData] = useState({
    venueName: '',
    location: '',
    description: '',
  });

  // Read plan preference from sessionStorage on mount
  useEffect(() => {
    const planPreference = sessionStorage.getItem('signupPlanPreference');
    const trialMode = sessionStorage.getItem('signupTrialMode') === 'true';
    
    setIsTrialMode(trialMode);

    // Fetch plans and find the selected one
    if (planPreference) {
      fetchPlanByName(planPreference);
    }

    // Check for payment success callback
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment_success') === 'true') {
      // Payment was successful, proceed to create subscription
      setCurrentStep(3);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const fetchPlanByName = async (planName: string) => {
    try {
      const res = await apiRequest('GET', '/api/subscriptions/plans');
      const data = await res.json();
      const plans = data.plans || [];
      
      // Find the plan that matches the preference (case-insensitive)
      const matchedPlan = plans.find((p: any) => 
        p.name.toLowerCase() === planName.toLowerCase() ||
        p.tier?.toLowerCase() === planName.toLowerCase()
      );
      
      if (matchedPlan && matchedPlan.tier !== 'starter') {
        setSelectedPlan({
          id: matchedPlan.id,
          name: matchedPlan.name,
          price: matchedPlan.price,
          tier: matchedPlan.tier,
        });
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleVenueDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      // Force refresh the Firebase ID token BEFORE the API call to avoid 401 errors.
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }

      const response = await apiRequest('POST', '/api/users/role', {
        role: 'hub',
        shopName: formData.venueName,
        location: formData.location,
        description: formData.description,
      });

      if (!response.ok) {
        try {
          const error = await response.json();
          throw new Error(error.message || 'Failed to create venue profile');
        } catch (e) {
          if (e instanceof Error) throw e;
          throw new Error('Failed to create venue profile');
        }
      }

      const updatedUser = await response.json();
      
      // Update user state
      if (login && updatedUser) {
        login({
          ...updatedUser,
          createdAt: updatedUser.createdAt ? new Date(updatedUser.createdAt) : new Date(),
          updatedAt: updatedUser.updatedAt ? new Date(updatedUser.updatedAt) : new Date(),
        });
      }

      // Force token refresh
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }

      if (refreshUser) {
        await refreshUser();
      }

      toast({
        title: "Venue Profile Created",
        description: "Your venue has been successfully registered.",
        variant: "default",
      });

      // If Business/Enterprise plan selected, proceed to payment step
      if (selectedPlan && selectedPlan.tier !== 'starter') {
        // Create setup intent for payment method collection
        await initializePaymentSetup();
        setCurrentStep(2);
      } else {
        // No payment needed (Starter tier), go directly to dashboard
        clearSessionStorage();
        navigate('/hub-dashboard');
      }
    } catch (error: any) {
      console.error('Onboarding error:', error);
      toast({
        title: 'Setup Failed',
        description: error.message || 'Failed to complete setup. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const initializePaymentSetup = async () => {
    try {
      // Ensure customer exists
      await apiRequest('POST', '/api/stripe-connect/customer/create');
      
      // Create setup intent
      const res = await apiRequest('POST', '/api/stripe-connect/setup-intent');
      const data = await res.json();
      
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        throw new Error('Failed to initialize payment setup');
      }
    } catch (error: any) {
      console.error('Error creating setup intent:', error);
      toast({
        title: "Error",
        description: "Failed to initialize payment form. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePaymentSuccess = async () => {
    setCurrentStep(3);
    await createSubscription();
  };

  const createSubscription = async () => {
    if (!selectedPlan) return;

    setIsSubmitting(true);
    try {
      const res = await apiRequest('POST', '/api/subscriptions/create-with-trial', {
        planId: selectedPlan.id,
        trialDays: isTrialMode ? 14 : 0,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create subscription');
      }

      const data = await res.json();

      toast({
        title: "Subscription Activated!",
        description: isTrialMode 
          ? `Your 14-day free trial of ${selectedPlan.name} has started.`
          : `Your ${selectedPlan.name} subscription is now active.`,
        variant: "default",
      });

      clearSessionStorage();
      navigate('/hub-dashboard');
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast({
        title: 'Subscription Failed',
        description: error.message || 'Failed to create subscription. You can subscribe later from the Wallet page.',
        variant: 'destructive',
      });
      // Still navigate to dashboard even if subscription fails
      clearSessionStorage();
      navigate('/hub-dashboard');
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearSessionStorage = () => {
    sessionStorage.removeItem('signupPlanPreference');
    sessionStorage.removeItem('signupTrialMode');
    sessionStorage.removeItem('signupRolePreference');
  };

  const skipPayment = () => {
    toast({
      title: "Payment Skipped",
      description: "You can subscribe anytime from your Wallet page.",
      variant: "default",
    });
    clearSessionStorage();
    navigate('/hub-dashboard');
  };

  // Determine total steps
  const totalSteps = selectedPlan && selectedPlan.tier !== 'starter' ? 3 : 1;

  const renderStepIndicator = () => {
    if (totalSteps === 1) return null;
    
    const steps = [
      { num: 1, label: 'Venue Details' },
      { num: 2, label: 'Payment' },
      { num: 3, label: 'Confirmation' },
    ];

    return (
      <div className="flex items-center justify-center mb-6">
        {steps.map((step, idx) => (
          <React.Fragment key={step.num}>
            <div className={`flex items-center ${currentStep >= step.num ? 'text-brand-neon' : 'text-steel-400'}`}>
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${currentStep > step.num 
                  ? 'bg-brand-neon text-brand-dark' 
                  : currentStep === step.num 
                    ? 'bg-brand-neon text-brand-dark' 
                    : 'bg-steel-200 text-steel-500'}
              `}>
                {currentStep > step.num ? <CheckCircle className="h-5 w-5" /> : step.num}
              </div>
              <span className={`ml-2 text-sm hidden sm:inline ${currentStep >= step.num ? 'text-steel-900' : 'text-steel-400'}`}>
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`w-12 h-0.5 mx-2 ${currentStep > step.num ? 'bg-brand-neon' : 'bg-steel-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <>
      <SEO
        title="Create Venue Profile"
        description="Register your venue on HospoGo."
        url="/onboarding/hub"
      />
      <div className="min-h-screen bg-gradient-to-br from-steel-50 to-steel-100 flex items-center justify-center p-4">
        <div className="w-full max-w-xl">
          {/* Plan Badge */}
          {selectedPlan && (
            <div className="text-center mb-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-brand-neon text-brand-dark">
                {selectedPlan.name} Plan
                {isTrialMode && ' • 14-Day Free Trial'}
              </span>
            </div>
          )}

          <Card className="card-chrome">
            <CardHeader className="text-center">
              {renderStepIndicator()}
              <div className="mx-auto w-12 h-12 bg-brand-neon rounded-full flex items-center justify-center mb-4 shadow-neon-realistic">
                {currentStep === 1 && <Building2 className="h-6 w-6 text-brand-dark" />}
                {currentStep === 2 && <CreditCard className="h-6 w-6 text-brand-dark" />}
                {currentStep === 3 && <CheckCircle className="h-6 w-6 text-brand-dark" />}
              </div>
              <CardTitle className="text-2xl text-steel-900">
                {currentStep === 1 && 'Create Venue Profile'}
                {currentStep === 2 && 'Add Payment Method'}
                {currentStep === 3 && 'Setting Up Your Account'}
              </CardTitle>
              <CardDescription>
                {currentStep === 1 && 'Tell us about your business to start hiring pros'}
                {currentStep === 2 && (
                  <>
                    Add a payment method to start your {isTrialMode ? '14-day free trial' : 'subscription'}
                    <br />
                    <span className="text-xs text-steel-400">
                      {isTrialMode && "You won't be charged until your trial ends"}
                    </span>
                  </>
                )}
                {currentStep === 3 && 'Almost there! We\'re activating your subscription...'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Step 1: Venue Details */}
              {currentStep === 1 && (
                <form onSubmit={handleVenueDetailsSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="venueName" className="text-steel-700">Venue Name *</Label>
                    <Input
                      id="venueName"
                      name="venueName"
                      value={formData.venueName}
                      onChange={handleChange}
                      placeholder="e.g. The Grand Hotel"
                      required
                      className="bg-card"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-steel-700">Location *</Label>
                    <LocationInput
                      value={formData.location}
                      onChange={(val) => setFormData(prev => ({ ...prev, location: val }))}
                      placeholder="City, State or Address"
                      className="bg-card"
                    />
                    <p className="text-xs text-steel-500">
                      Use a generic location like "Downtown Metro" or full address.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-steel-700">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Briefly describe your venue..."
                      rows={4}
                      className="bg-card"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    variant="accent"
                    className="w-full shadow-neon-realistic hover:shadow-[0_0_8px_rgba(186,255,57,1),0_0_20px_rgba(186,255,57,0.6),0_0_35px_rgba(186,255,57,0.3)] transition-shadow duration-300"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating Profile...
                      </>
                    ) : (
                      <>
                        {selectedPlan && selectedPlan.tier !== 'starter' ? 'Continue to Payment' : 'Create Venue Profile'}
                        {selectedPlan && selectedPlan.tier !== 'starter' && <ArrowRight className="h-4 w-4 ml-2" />}
                      </>
                    )}
                  </Button>
                </form>
              )}

              {/* Step 2: Payment */}
              {currentStep === 2 && clientSecret && (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: 'stripe',
                      variables: {
                        colorPrimary: '#BAFF39',
                        colorBackground: '#ffffff',
                        colorText: '#1a1a2e',
                      },
                    },
                  }}
                >
                  <PaymentForm 
                    onSuccess={handlePaymentSuccess}
                    onBack={() => setCurrentStep(1)}
                    isSubmitting={isSubmitting}
                    setIsSubmitting={setIsSubmitting}
                  />
                </Elements>
              )}

              {currentStep === 2 && !clientSecret && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-neon mb-4" />
                  <p className="text-steel-600">Loading payment form...</p>
                </div>
              )}

              {/* Step 2: Skip option */}
              {currentStep === 2 && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={skipPayment}
                    className="text-sm text-steel-500 hover:text-steel-700 underline"
                  >
                    Skip for now - subscribe later
                  </button>
                </div>
              )}

              {/* Step 3: Confirmation/Loading */}
              {currentStep === 3 && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-12 w-12 animate-spin text-brand-neon mb-4" />
                  <p className="text-steel-600 text-center">
                    {isTrialMode 
                      ? 'Activating your 14-day free trial...'
                      : 'Setting up your subscription...'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
