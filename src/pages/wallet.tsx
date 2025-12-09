import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PageLoadingFallback } from '@/components/loading/loading-spinner';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard, Wallet, TrendingUp, CheckCircle2, XCircle, Clock, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createCheckoutSession, cancelSubscription } from '@/lib/api';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  stripePriceId?: string;
}

interface Subscription {
  id: string;
  planId: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  description?: string;
  createdAt: string;
}

export default function WalletPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'plans' | 'subscription' | 'payments'>('plans');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  // Handle checkout success/cancel redirects
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    const sessionId = searchParams.get('session_id');

    if (success === 'true' && sessionId) {
      toast({
        title: 'Success!',
        description: 'Your subscription has been activated.',
      });
      // Refresh subscription data
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payments/history'] });
      setActiveTab('subscription');
      // Clean up URL
      setSearchParams({});
    } else if (canceled === 'true') {
      toast({
        title: 'Checkout Canceled',
        description: 'You can try again anytime.',
      });
      // Clean up URL
      setSearchParams({});
    }
  }, [searchParams, toast, queryClient, setSearchParams]);

  // Fetch subscription plans
  const { data: plans = [], isLoading: isLoadingPlans } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/subscriptions/plans'],
    enabled: activeTab === 'plans',
  });

  // Fetch current subscription
  const { data: currentSubscription, isLoading: isLoadingSubscription } = useQuery<Subscription>({
    queryKey: ['/api/subscriptions/current'],
    enabled: !!user && activeTab === 'subscription',
  });

  // Fetch payment history
  const { data: payments = [], isLoading: isLoadingPayments } = useQuery<Payment[]>({
    queryKey: ['/api/payments/history'],
    enabled: !!user && activeTab === 'payments',
  });

  const handleSubscribe = async (planId: string) => {
    if (isSubscribing) return;

    try {
      setIsSubscribing(true);
      const { url } = await createCheckoutSession(planId);
      
      if (url) {
        // Redirect to Stripe Checkout
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to initiate subscription checkout.',
        variant: 'destructive',
      });
      setIsSubscribing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (isCanceling) return;

    try {
      setIsCanceling(true);
      await cancelSubscription();
      
      toast({
        title: 'Subscription Canceled',
        description: 'Your subscription will remain active until the end of the billing period.',
      });
      
      // Refresh subscription data
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions/current'] });
    } catch (error: any) {
      console.error('Cancellation error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel subscription.',
        variant: 'destructive',
      });
    } finally {
      setIsCanceling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default' as const, icon: CheckCircle2, label: 'Active' },
      canceled: { variant: 'secondary' as const, icon: XCircle, label: 'Canceled' },
      past_due: { variant: 'destructive' as const, icon: Clock, label: 'Past Due' },
      trialing: { variant: 'default' as const, icon: Clock, label: 'Trialing' },
      incomplete: { variant: 'secondary' as const, icon: XCircle, label: 'Incomplete' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.incomplete;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      succeeded: { variant: 'default' as const, icon: CheckCircle2, label: 'Paid' },
      pending: { variant: 'secondary' as const, icon: Clock, label: 'Pending' },
      failed: { variant: 'destructive' as const, icon: XCircle, label: 'Failed' },
      refunded: { variant: 'secondary' as const, icon: XCircle, label: 'Refunded' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight">Wallet & Subscriptions</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Manage your subscription plans and payment history
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border">
          <Button
            variant={activeTab === 'plans' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('plans')}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            Subscription Plans
          </Button>
          <Button
            variant={activeTab === 'subscription' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('subscription')}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            My Subscription
          </Button>
          <Button
            variant={activeTab === 'payments' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('payments')}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            Payment History
          </Button>
        </div>

        {/* Content */}
        {activeTab === 'plans' && (
          <div>
            {isLoadingPlans ? (
              <PageLoadingFallback />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.length === 0 ? (
                  <Card className="col-span-full">
                    <CardContent className="pt-6">
                      <p className="text-center text-muted-foreground">
                        No subscription plans available at this time.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  plans.map((plan) => (
                    <Card key={plan.id} className="flex flex-col border-2 hover:border-primary transition-colors">
                      <CardHeader>
                        <CardTitle className="text-2xl">{plan.name}</CardTitle>
                        <CardDescription>{plan.description}</CardDescription>
                        <div className="mt-4">
                          <span className="text-4xl font-bold">${plan.price}</span>
                          <span className="text-muted-foreground">/{plan.interval}</span>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col">
                        <ul className="space-y-2 mb-6 flex-1">
                          {plan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{feature}</span>
                            </li>
                          ))}
                        </ul>
                        <Button
                          onClick={() => handleSubscribe(plan.id)}
                          className="w-full"
                          size="lg"
                          disabled={isSubscribing}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          {isSubscribing ? 'Processing...' : 'Subscribe Now'}
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'subscription' && (
          <div>
            {isLoadingSubscription ? (
              <PageLoadingFallback />
            ) : currentSubscription ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl">Current Subscription</CardTitle>
                      <CardDescription className="mt-2">
                        {currentSubscription.currentPeriodEnd
                          ? `Renews on ${new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}`
                          : 'No renewal date'}
                      </CardDescription>
                    </div>
                    {getStatusBadge(currentSubscription.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-semibold">Plan Details</p>
                          <p className="text-sm text-muted-foreground">Plan ID: {currentSubscription.planId}</p>
                        </div>
                      </div>
                    </div>
                    {currentSubscription.cancelAtPeriodEnd && (
                      <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                        <p className="text-sm">
                          Your subscription will be canceled at the end of the current billing period.
                        </p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      {currentSubscription.status === 'active' && !currentSubscription.cancelAtPeriodEnd && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              disabled={isCanceling}
                            >
                              {isCanceling ? 'Canceling...' : 'Cancel Subscription'}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to cancel your subscription? It will remain active until the end of the billing period, and you will lose access to premium features after that.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleCancelSubscription}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Cancel Subscription
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-semibold mb-2">No Active Subscription</p>
                    <p className="text-muted-foreground mb-4">
                      Subscribe to a plan to unlock premium features.
                    </p>
                    <Button onClick={() => setActiveTab('plans')}>
                      View Plans
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div>
            {isLoadingPayments ? (
              <PageLoadingFallback />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Payment History</CardTitle>
                  <CardDescription>View all your past transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  {payments.length === 0 ? (
                    <div className="text-center py-8">
                      <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-lg font-semibold mb-2">No Payments Yet</p>
                      <p className="text-muted-foreground">
                        Your payment history will appear here once you make a transaction.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <p className="font-semibold">
                                {payment.description || 'Subscription Payment'}
                              </p>
                              {getPaymentStatusBadge(payment.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(payment.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">
                              ${payment.amount.toFixed(2)} {payment.currency.toUpperCase()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

