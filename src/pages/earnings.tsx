import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { EarningsDashboardSkeleton } from '@/components/ui/skeletons';
import { 
  Wallet, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  CreditCard, 
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SEO } from '@/components/seo/SEO';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  amount: number;
  type: 'earning' | 'withdrawal';
  invoiceUrl?: string;
}

export interface MonthlyEarnings {
  month: string;
  year: number;
  earnings: number;
}

export interface WalletData {
  currentBalance: number;
  pending: number;
  totalEarnings: number;
  bankAccountConnected: boolean;
  bankAccountLast4?: string;
  transactions: Transaction[];
  monthlyEarnings: MonthlyEarnings[];
}

export default function EarningsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Fetch wallet data
  // TODO: Replace with actual API call when wallet API is implemented
  const { data: walletData, isLoading } = useQuery<WalletData>({
    queryKey: ['wallet-data'],
    queryFn: async () => {
      // Placeholder - replace with actual API call
      return {
        currentBalance: 0,
        pending: 0,
        totalEarnings: 0,
        bankAccountConnected: false,
        transactions: [],
        monthlyEarnings: [],
      };
    },
    enabled: !!user,
  });

  const handleWithdraw = async () => {
    if (!walletData || walletData.currentBalance <= 0) {
      toast({
        title: 'Cannot Withdraw',
        description: 'You have no available balance to withdraw.',
        variant: 'destructive',
      });
      return;
    }

    if (!walletData.bankAccountConnected) {
      toast({
        title: 'Bank Account Required',
        description: 'Please connect a bank account before withdrawing funds.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsWithdrawing(true);
      // TODO: Implement actual withdrawal API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: 'Withdrawal Initiated',
        description: `$${walletData.currentBalance.toFixed(2)} will be transferred to your bank account within 2-3 business days.`,
      });
    } catch (error: any) {
      toast({
        title: 'Withdrawal Failed',
        description: error.message || 'Failed to process withdrawal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleDownloadInvoice = (invoiceUrl: string, transactionId: string) => {
    // TODO: Implement actual invoice download
    toast({
      title: 'Downloading Invoice',
      description: `Invoice for transaction ${transactionId} will be downloaded.`,
    });
    // In production, this would trigger a download
  };

  const getStatusBadge = (status: 'completed' | 'pending' | 'failed') => {
    const config = {
      completed: { variant: 'default' as const, icon: CheckCircle2, label: 'Completed' },
      pending: { variant: 'secondary' as const, icon: Clock, label: 'Pending' },
      failed: { variant: 'destructive' as const, icon: XCircle, label: 'Failed' },
    };

    const { variant, icon: Icon, label } = config[status];

    return (
      <Badge variant={variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Instant-load pattern: Return skeleton immediately if loading or no user
  // This ensures the App Shell (sidebar/header) is never blocked by data fetching
  if (isLoading || !user?.id) {
    return <EarningsDashboardSkeleton />;
  }

  if (!user || user.currentRole !== 'professional') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">This page is only available for professionals.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = walletData || {
    currentBalance: 0,
    pending: 0,
    totalEarnings: 0,
    bankAccountConnected: false,
    transactions: [],
    monthlyEarnings: [],
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Earnings - Wallet" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight">Wallet (Earnings)</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            View your earnings, track payouts, and manage your bank details
          </p>
        </div>

        {/* Earnings Overview Hero Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Current Balance */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="pb-3">
              <CardDescription className="text-sm font-medium">Current Balance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-4xl font-bold text-foreground">
                    {formatCurrency(data.currentBalance)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Available for payout</p>
                </div>
                <div className="rounded-full bg-primary/20 p-3">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending */}
          <Card className="border-2 border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-orange-500/10">
            <CardHeader className="pb-3">
              <CardDescription className="text-sm font-medium">Pending</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-4xl font-bold text-foreground">
                    {formatCurrency(data.pending)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">From recent shifts</p>
                </div>
                <div className="rounded-full bg-orange-500/20 p-3">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Earnings */}
          <Card className="border-2 border-green-500/20 bg-gradient-to-br from-green-500/5 to-green-500/10">
            <CardHeader className="pb-3">
              <CardDescription className="text-sm font-medium">Total Earnings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-4xl font-bold text-foreground">
                    {formatCurrency(data.totalEarnings)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Lifetime on platform</p>
                </div>
                <div className="rounded-full bg-green-500/20 p-3">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Withdraw Funds Button */}
        <div className="mb-8">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="lg"
                className="w-full md:w-auto"
                disabled={data.currentBalance <= 0 || isWithdrawing}
              >
                <ArrowUpRight className="mr-2 h-4 w-4" />
                {isWithdrawing ? 'Processing...' : 'Withdraw Funds'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Withdraw Funds</AlertDialogTitle>
                <AlertDialogDescription>
                  You are about to withdraw {formatCurrency(data.currentBalance)} to your bank account
                  {data.bankAccountLast4 && ` ending in ${data.bankAccountLast4}`}.
                  The transfer will be processed within 2-3 business days.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleWithdraw} disabled={isWithdrawing}>
                  Confirm Withdrawal
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Payout Methods Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payout Methods
            </CardTitle>
            <CardDescription>Manage your bank accounts for receiving payouts</CardDescription>
          </CardHeader>
          <CardContent>
            {data.bankAccountConnected ? (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-green-500/20 p-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Bank Account Connected</p>
                    <p className="text-sm text-muted-foreground">
                      {data.bankAccountLast4 
                        ? `Account ending in ${data.bankAccountLast4}`
                        : 'Account connected via Stripe Connect'}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-orange-500/20 p-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-semibold">No Bank Account Connected</p>
                    <p className="text-sm text-muted-foreground">
                      Connect a bank account to receive payouts
                    </p>
                  </div>
                </div>
                <Button size="sm">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Setup Payouts
                </Button>
              </div>
            )}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                <strong>Note:</strong> Payouts are processed via Stripe Connect. Your bank account information
                is securely stored and encrypted.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Earnings Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Earnings per Month
            </CardTitle>
            <CardDescription>Your earnings over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyEarnings}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs"
                    tick={{ fill: 'currentColor' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'currentColor' }}
                    tickFormatter={(value) => `$${value}`}
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

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>All your financial movements and transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center">Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Wallet className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">No transactions yet</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">
                          {format(new Date(transaction.date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                        <TableCell className={`text-right font-semibold ${
                          transaction.amount > 0 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {transaction.amount > 0 ? '+' : ''}
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell className="text-center">
                          {transaction.invoiceUrl ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadInvoice(transaction.invoiceUrl!, transaction.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Download className="h-4 w-4" />
                              <span className="sr-only">Download invoice</span>
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">â€”</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

