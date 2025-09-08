import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink,
  DollarSign,
  Shield,
  Clock,
  TrendingUp
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ConnectOnboardingProps {
  trainerId: string;
  businessName: string;
  email: string;
}

interface AccountStatus {
  onboardingComplete: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  accountId?: string;
  demo?: boolean;
}

export default function ConnectOnboarding({ trainerId, businessName, email }: ConnectOnboardingProps) {
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkAccountStatus();
  }, [trainerId]);

  const checkAccountStatus = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('GET', `/api/stripe/account-status/${trainerId}`);
      const data = await response.json();
      setAccountStatus(data);
    } catch (error) {
      // Account doesn't exist yet
      setAccountStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  const createConnectedAccount = async () => {
    try {
      setIsCreatingAccount(true);
      const response = await apiRequest('POST', '/api/stripe/create-account', {
        trainerId,
        email,
        businessName
      });
      
      const data = await response.json();
      
      if (data.demo) {
        // Demo mode - no external redirect needed
        toast({
          title: "Demo Account Created",
          description: "Your test payment account has been set up successfully",
        });
        await checkAccountStatus();
      } else {
        // Production mode - redirect to Stripe onboarding
        window.location.href = data.onboardingUrl;
      }
    } catch (error) {
      console.error('Error creating account:', error);
      toast({
        title: "Account Creation Failed",
        description: "Failed to create payment account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const getStatusBadge = () => {
    if (!accountStatus) return null;

    if (accountStatus.onboardingComplete && accountStatus.payoutsEnabled) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active
        </Badge>
      );
    }

    if (accountStatus.detailsSubmitted) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
          <Clock className="w-3 h-3 mr-1" />
          Under Review
        </Badge>
      );
    }

    return (
      <Badge className="bg-red-100 text-red-800 border-red-200">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Setup Required
      </Badge>
    );
  };

  const getStatusMessage = () => {
    if (!accountStatus) {
      return {
        title: "Payment Account Required",
        description: "To sell training content and receive payments, you need to set up a payment account.",
        type: "setup" as const
      };
    }

    if (accountStatus.demo) {
      return {
        title: "Demo Payment Account Active",
        description: "Your test payment account is ready. In production, you'll need to complete full verification.",
        type: "demo" as const
      };
    }

    if (accountStatus.onboardingComplete && accountStatus.payoutsEnabled) {
      return {
        title: "Payment Account Active",
        description: "Your payment account is fully set up and ready to receive payments.",
        type: "success" as const
      };
    }

    if (accountStatus.detailsSubmitted) {
      return {
        title: "Account Under Review",
        description: "Your account details are being reviewed. This usually takes 1-2 business days.",
        type: "pending" as const
      };
    }

    return {
      title: "Setup Incomplete",
      description: "Please complete your account setup to start receiving payments.",
      type: "incomplete" as const
    };
  };

  const statusMessage = getStatusMessage();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          <span className="ml-2">Checking payment account status...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="connect-onboarding">
      {/* Account Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              Payment Account
            </CardTitle>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className={`${
            statusMessage.type === 'success' ? 'border-green-200 bg-green-50' :
            statusMessage.type === 'demo' ? 'border-blue-200 bg-blue-50' :
            statusMessage.type === 'pending' ? 'border-yellow-200 bg-yellow-50' :
            'border-red-200 bg-red-50'
          }`}>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>{statusMessage.title}:</strong> {statusMessage.description}
            </AlertDescription>
          </Alert>

          {!accountStatus && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Why Set Up Payments?</h4>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li>• <strong>Sell Training Content:</strong> Monetize your expertise with paid courses</li>
                  <li>• <strong>Secure Payments:</strong> Professional payment processing with instant transfers</li>
                  <li>• <strong>Financial Tracking:</strong> Detailed earnings reports and tax documents</li>
                  <li>• <strong>Platform Integration:</strong> Seamless integration with Snipshift marketplace</li>
                </ul>
              </div>

              <Button 
                onClick={createConnectedAccount}
                disabled={isCreatingAccount}
                className="w-full bg-blue-600 hover:bg-blue-700"
                data-testid="button-setup-payments"
              >
                {isCreatingAccount ? (
                  <>
                    <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    Setting Up Account...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Set Up Payment Account
                  </>
                )}
              </Button>
            </div>
          )}

          {accountStatus && (
            <div className="space-y-4">
              {/* Account Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <CheckCircle className={`h-5 w-5 ${
                    accountStatus.detailsSubmitted ? 'text-green-600' : 'text-gray-400'
                  }`} />
                  <div>
                    <div className="text-sm font-medium">Details Submitted</div>
                    <div className="text-xs text-muted-foreground">
                      {accountStatus.detailsSubmitted ? 'Complete' : 'Pending'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <DollarSign className={`h-5 w-5 ${
                    accountStatus.payoutsEnabled ? 'text-green-600' : 'text-gray-400'
                  }`} />
                  <div>
                    <div className="text-sm font-medium">Payouts Enabled</div>
                    <div className="text-xs text-muted-foreground">
                      {accountStatus.payoutsEnabled ? 'Active' : 'Pending'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <TrendingUp className={`h-5 w-5 ${
                    accountStatus.onboardingComplete ? 'text-green-600' : 'text-gray-400'
                  }`} />
                  <div>
                    <div className="text-sm font-medium">Ready to Sell</div>
                    <div className="text-xs text-muted-foreground">
                      {accountStatus.onboardingComplete ? 'Yes' : 'Setup Required'}
                    </div>
                  </div>
                </div>
              </div>

              {accountStatus.demo && (
                <Alert className="border-blue-200 bg-blue-50">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>Demo Mode:</strong> You're using a test payment account. 
                    For real payments, complete the full verification process.
                  </AlertDescription>
                </Alert>
              )}

              {!accountStatus.onboardingComplete && !accountStatus.demo && (
                <Button 
                  onClick={createConnectedAccount}
                  variant="outline"
                  className="w-full"
                  data-testid="button-complete-setup"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Complete Setup
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Earnings Preview */}
      {accountStatus?.onboardingComplete && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Earnings Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">$0</div>
                <div className="text-sm text-muted-foreground">This Month</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">0</div>
                <div className="text-sm text-muted-foreground">Sales</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">$0</div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">$0</div>
                <div className="text-sm text-muted-foreground">Total Earned</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}