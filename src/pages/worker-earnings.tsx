import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EarningsDashboardSkeleton } from '@/components/ui/skeletons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Download, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { SEO } from '@/components/seo/SEO';

interface PayoutHistoryItem {
  id: string;
  shiftId: string;
  amountCents: number;
  amountDollars: string;
  hourlyRate: number;
  hoursWorked: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processedAt: string | null;
  createdAt: string;
  shift: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    location: string | null;
  } | null;
  venue: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

interface EarningsData {
  totalEarnedCents: number;
  totalEarnedDollars: string;
  filteredTotalCents: number;
  filteredTotalDollars: string;
  period: 'current_month' | 'last_3_months' | 'all_time';
  payoutHistory: PayoutHistoryItem[];
  payoutCount: number;
}

/**
 * WorkerEarningsView - Financial dashboard for hospitality workers
 */
export default function WorkerEarningsView() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<'current_month' | 'last_3_months' | 'all_time'>('all_time');

  // Fetch earnings data
  const { data: earningsData, isLoading } = useQuery<EarningsData>({
    queryKey: ['worker-earnings', period],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (period !== 'all_time') {
        params.append('period', period);
      }
      const res = await apiRequest('GET', `/api/worker/earnings?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch earnings');
      }
      return res.json();
    },
    enabled: !!user,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  // Export to CSV
  const handleExportCSV = () => {
    if (!earningsData || earningsData.payoutHistory.length === 0) {
      return;
    }

    // Create CSV headers
    const headers = [
      'Date',
      'Shift Title',
      'Venue',
      'Hours Worked',
      'Hourly Rate',
      'Amount',
      'Status',
      'Processed At',
    ];

    // Create CSV rows
    const rows = earningsData.payoutHistory.map((payout) => {
      const date = new Date(payout.createdAt);
      return [
        format(date, 'yyyy-MM-dd'),
        payout.shift?.title || 'N/A',
        payout.venue?.name || 'N/A',
        payout.hoursWorked.toFixed(2),
        `$${payout.hourlyRate.toFixed(2)}`,
        `$${payout.amountDollars}`,
        payout.status,
        payout.processedAt ? format(new Date(payout.processedAt), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
      ];
    });

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `earnings-${period}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Instant-load pattern: Return skeleton immediately if loading or no user
  // This ensures the App Shell (sidebar/header) is never blocked by data fetching
  if (isLoading || !user?.id) {
    return <EarningsDashboardSkeleton />;
  }

  if (!earningsData) {
    return (
      <>
        <SEO title="Earnings | Worker Dashboard" />
        <div className="min-h-screen bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Failed to load earnings data</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO title="Earnings | Worker Dashboard" />
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Earnings</h1>
              <p className="text-muted-foreground">
                View your total earnings and payout history
              </p>
            </div>
            {earningsData.payoutHistory.length > 0 && (
              <Button onClick={handleExportCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>

          {/* Total Earned Stat Card */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Lifetime Earnings</p>
                  <p className="text-4xl font-bold">
                    ${earningsData.totalEarnedDollars}
                  </p>
                  {period !== 'all_time' && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {period === 'current_month' ? 'This month' : 'Last 3 months'}: ${earningsData.filteredTotalDollars}
                    </p>
                  )}
                </div>
                <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Period Filter Tabs */}
          <Tabs value={period} onValueChange={(value) => setPeriod(value as typeof period)} className="mb-6">
            <TabsList>
              <TabsTrigger value="all_time">All Time</TabsTrigger>
              <TabsTrigger value="last_3_months">Last 3 Months</TabsTrigger>
              <TabsTrigger value="current_month">This Month</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Payout History Table */}
          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
            </CardHeader>
            <CardContent>
              {earningsData.payoutHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No payouts yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Completed shifts will appear here once payouts are processed
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Shift</TableHead>
                        <TableHead>Venue</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {earningsData.payoutHistory.map((payout) => {
                        const date = new Date(payout.createdAt);
                        return (
                          <TableRow key={payout.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {format(date, 'MMM d, yyyy')}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(date, 'h:mm a')}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {payout.shift?.title || 'N/A'}
                                </span>
                                {payout.shift?.location && (
                                  <span className="text-xs text-muted-foreground">
                                    {payout.shift.location}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {payout.venue?.name || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {payout.hoursWorked.toFixed(2)}h
                            </TableCell>
                            <TableCell>
                              ${payout.hourlyRate.toFixed(2)}/hr
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              ${payout.amountDollars}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  payout.status === 'completed'
                                    ? 'default'
                                    : payout.status === 'failed'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                                className={
                                  payout.status === 'completed'
                                    ? 'bg-green-500 text-white'
                                    : payout.status === 'failed'
                                    ? 'bg-red-500 text-white'
                                    : ''
                                }
                              >
                                {payout.status === 'completed'
                                  ? 'Paid'
                                  : payout.status === 'pending'
                                  ? 'Pending'
                                  : payout.status === 'processing'
                                  ? 'Processing'
                                  : 'Failed'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
