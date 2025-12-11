import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, CheckCircle2, AlertCircle, ExternalLink, CreditCard } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";

export default function PayoutSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  // Check for onboarding completion callback
  useEffect(() => {
    const onboardingStatus = searchParams.get('onboarding');
    if (onboardingStatus === 'complete') {
      toast({
        title: "Onboarding Complete!",
        description: "Your payout account has been set up successfully.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['stripe-connect-account-status'] });
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (onboardingStatus === 'refresh') {
      toast({
        title: "Onboarding Incomplete",
        description: "Please complete all required steps to finish setting up your payout account.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['stripe-connect-account-status'] });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, toast, queryClient]);

  const { data: accountStatus, isLoading } = useQuery({
    queryKey: ['stripe-connect-account-status', user?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/stripe-connect/account/status');
      return res.json();
    },
    enabled: !!user?.id,
  });

  const createAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/stripe-connect/account/create');
      return res.json();
    },
    onSuccess: (data) => {
      if (data.onboardingUrl) {
        // Redirect to Stripe onboarding
        window.location.href = data.onboardingUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create payout account",
        variant: "destructive",
      });
    },
  });

  const createOnboardingLinkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/stripe-connect/account/onboarding-link');
      return res.json();
    },
    onSuccess: (data) => {
      if (data.onboardingUrl) {
        // Redirect to Stripe onboarding
        window.location.href = data.onboardingUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create onboarding link",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-steel-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasAccount = accountStatus?.hasAccount || false;
  const isComplete = accountStatus?.onboardingComplete && accountStatus?.chargesEnabled;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payout Settings
          </CardTitle>
          <CardDescription>
            Connect your Stripe account to receive payments for completed shifts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!hasAccount ? (
            <div className="space-y-4">
              <div className="p-4 border border-steel-200 rounded-lg bg-steel-50">
                <p className="text-sm text-steel-700 mb-4">
                  To receive payments for shifts, you need to connect a Stripe account. This allows us to securely transfer your earnings directly to your bank account.
                </p>
                <Button
                  onClick={() => createAccountMutation.mutate()}
                  disabled={createAccountMutation.isPending}
                  className="steel-button"
                >
                  {createAccountMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Connect with Stripe
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : !isComplete ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Setup Incomplete
                </Badge>
              </div>
              <div className="p-4 border border-amber-200 rounded-lg bg-amber-50">
                <p className="text-sm text-steel-700 mb-4">
                  Your Stripe account is connected but onboarding is not complete. Please finish the setup process to start receiving payments.
                </p>
                <Button
                  onClick={() => createOnboardingLinkMutation.mutate()}
                  disabled={createOnboardingLinkMutation.isPending}
                  className="steel-button"
                >
                  {createOnboardingLinkMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Complete Setup
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              </div>
              <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                <p className="text-sm text-steel-700 mb-2">
                  Your payout account is set up and ready to receive payments. Funds from completed shifts will be transferred to your connected bank account.
                </p>
                <div className="mt-4 space-y-2 text-sm text-steel-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>Account connected</span>
                  </div>
                  {accountStatus?.payoutsEnabled && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>Payouts enabled</span>
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => createOnboardingLinkMutation.mutate()}
                  disabled={createOnboardingLinkMutation.isPending}
                  variant="outline"
                  className="mt-4"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Update Account Settings
                </Button>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-steel-200">
            <h4 className="text-sm font-semibold text-steel-900 mb-2">How it works</h4>
            <ul className="space-y-2 text-sm text-steel-600">
              <li className="flex items-start gap-2">
                <span className="text-steel-400">1.</span>
                <span>Connect your Stripe account (takes about 5 minutes)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-steel-400">2.</span>
                <span>Accept shifts and complete your work</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-steel-400">3.</span>
                <span>After the shop marks the shift as complete, payment is automatically transferred to your account</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-steel-400">4.</span>
                <span>Funds typically arrive in your bank account within 2-3 business days</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
