import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Wallet, DollarSign, Clock, TrendingUp, ExternalLink, CheckCircle2, ArrowUpRight, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/currency";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BalanceData {
  available: number;
  pending: number;
  currency: string;
}

interface PaymentHistoryItem {
  id: string;
  date: string;
  shopName: string;
  netAmount: number;
  status: string;
  paymentStatus: 'PAID' | 'AUTHORIZED';
  hours: number;
  hourlyRate: number;
}

interface PaymentHistory {
  history: PaymentHistoryItem[];
}

interface EarningsDashboardProps {
  onNavigateToPayouts?: () => void;
}

export default function EarningsDashboard({ onNavigateToPayouts }: EarningsDashboardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch balance
  const { data: balanceData, isLoading: isLoadingBalance } = useQuery<BalanceData>({
    queryKey: ['payment-balance', user?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/payments/balance/${user?.id}`);
      return res.json();
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch payment history
  const { data: historyData, isLoading: isLoadingHistory } = useQuery<PaymentHistory>({
    queryKey: ['payment-history', user?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/payments/history/${user?.id}`);
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Calculate total earnings (sum of all paid amounts)
  const totalEarnings = historyData?.history
    .filter(item => item.paymentStatus === 'PAID')
    .reduce((sum, item) => sum + item.netAmount, 0) || 0;

  // Calculate monthly earnings for chart
  const monthlyEarnings = (() => {
    if (!historyData?.history) return [];
    
    const paidItems = historyData.history.filter(item => item.paymentStatus === 'PAID');
    const monthlyMap = new Map<string, number>();

    paidItems.forEach(item => {
      const date = new Date(item.date);
      const monthKey = format(date, 'MMM yyyy');
      const current = monthlyMap.get(monthKey) || 0;
      monthlyMap.set(monthKey, current + item.netAmount);
    });

    // Convert to array and sort by date
    return Array.from(monthlyMap.entries())
      .map(([month, earnings]) => ({ month, earnings }))
      .sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(-6); // Last 6 months
  })();

  // Check if user has Stripe Connect account
  const { data: stripeAccountStatus } = useQuery<{
    hasAccount: boolean;
    onboardingComplete: boolean;
    chargesEnabled: boolean;
  }>({
    queryKey: ['stripe-account-status', user?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/stripe-connect/account/status');
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Get Stripe Express Dashboard login link (only if user has account)
  const { data: loginLinkData } = useQuery<{ loginUrl: string }>({
    queryKey: ['stripe-login-link', user?.id],
    queryFn: async () => {
      const res = await apiRequest('POST', '/api/stripe-connect/account/login-link');
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to get login link');
      }
      return res.json();
    },
    enabled: !!user?.id && stripeAccountStatus?.hasAccount === true,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: false, // Don't retry on 404
  });

  const handlePayoutNow = async () => {
    if (!balanceData || balanceData.available <= 0) {
      toast({
        title: "No Balance Available",
        description: "You have no available balance to payout.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Payout Initiated",
      description: `A payout of ${formatCurrency(balanceData.available)} will be processed. Funds typically arrive in 2-3 business days.`,
      variant: "default",
    });
    // TODO: Implement actual payout API call when backend endpoint is ready
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Paid') {
      return (
        <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Paid
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
          <Clock className="h-3 w-3 mr-1" />
          Processing
        </Badge>
      );
    }
  };

  if (isLoadingBalance || isLoadingHistory) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-steel-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const available = balanceData?.available || 0;
  const pending = balanceData?.pending || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Available for Payout */}
        <Card className="border-2 border-green-500/20 bg-gradient-to-br from-green-500/5 to-green-500/10">
          <CardHeader className="pb-3">
            <CardDescription className="text-sm font-medium">Available for Payout</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-4xl font-bold text-foreground">
                  {formatCurrency(available)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Ready to withdraw</p>
              </div>
              <div className="rounded-full bg-green-500/20 p-3">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Clearing */}
        <Card className="border-2 border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-amber-500/10">
          <CardHeader className="pb-3">
            <CardDescription className="text-sm font-medium">Pending Clearing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-4xl font-bold text-foreground">
                  {formatCurrency(pending)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">From recent shifts</p>
              </div>
              <div className="rounded-full bg-amber-500/20 p-3">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Earnings */}
        <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-blue-500/10">
          <CardHeader className="pb-3">
            <CardDescription className="text-sm font-medium">Total Earnings (All Time)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-4xl font-bold text-foreground">
                  {formatCurrency(totalEarnings)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Lifetime on platform</p>
              </div>
              <div className="rounded-full bg-blue-500/20 p-3">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 flex-wrap">
        <Button
          onClick={handlePayoutNow}
          disabled={available <= 0}
          className="steel-button"
        >
          <ArrowUpRight className="h-4 w-4 mr-2" />
          Payout Now
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            if (onNavigateToPayouts) {
              onNavigateToPayouts();
            } else {
              // Default behavior: navigate to professional dashboard payouts tab
              navigate('/professional-dashboard?view=payouts');
            }
          }}
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Stripe Payouts
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            if (loginLinkData?.loginUrl) {
              window.open(loginLinkData.loginUrl, '_blank');
            } else if (!stripeAccountStatus?.hasAccount) {
              toast({
                title: "Stripe Account Required",
                description: "Please set up your Stripe Connect account in Payouts to access the Express Dashboard.",
                variant: "default",
              });
              // Navigate to payouts to set up account
              if (onNavigateToPayouts) {
                onNavigateToPayouts();
              } else {
                navigate('/professional-dashboard?view=payouts');
              }
            } else {
              toast({
                title: "Loading...",
                description: "Please wait while we generate your dashboard link.",
                variant: "default",
              });
            }
          }}
          disabled={!stripeAccountStatus?.hasAccount}
          title={!stripeAccountStatus?.hasAccount ? "Set up Stripe Connect account in Payouts to access this feature" : undefined}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Stripe Express Dashboard
        </Button>
      </div>

      {/* Monthly Earnings Chart */}
      {monthlyEarnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Earnings by Month
            </CardTitle>
            <CardDescription>Your earnings over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyEarnings}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    className="text-xs"
                    tick={{ fill: 'currentColor' }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'currentColor' }}
                    tickFormatter={(value) => `$${value.toFixed(0)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Bar
                    dataKey="earnings"
                    fill="hsl(var(--primary))"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your completed shifts and payment status</CardDescription>
        </CardHeader>
        <CardContent>
          {!historyData?.history || historyData.history.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No transactions yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Completed shifts will appear here once payments are processed
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Shop</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Net Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyData.history.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {format(new Date(item.date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>{item.shopName}</TableCell>
                      <TableCell>{item.hours}h</TableCell>
                      <TableCell>{formatCurrency(item.hourlyRate)}/hr</TableCell>
                      <TableCell className="font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(item.netAmount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
