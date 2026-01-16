import React, { lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { fetchVenueAnalytics, VenueAnalytics } from "@/lib/api";
import { Loader2, DollarSign, TrendingUp, TrendingDown, Target, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

// Lazy load the chart component to reduce initial bundle
const SpendChart = lazy(() => import("recharts").then(module => ({
  default: ({ data }: { data: { date: string; spend: number }[] }) => {
    const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = module;
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            className="text-xs"
            tick={{ fill: 'currentColor' }}
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
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
            labelFormatter={(label) => {
              const date = new Date(label);
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            }}
          />
          <Line
            type="monotone"
            dataKey="spend"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }
})));

type DateRange = '30d' | '3m' | 'ytd';

interface VenueAnalyticsDashboardProps {
  className?: string;
}

export function VenueAnalyticsDashboard({ className }: VenueAnalyticsDashboardProps) {
  const { toast } = useToast();
  const [dateRange, setDateRange] = React.useState<DateRange>('30d');

  const { data: analytics, isLoading, error } = useQuery<VenueAnalytics>({
    queryKey: ['venue-analytics', dateRange],
    queryFn: () => fetchVenueAnalytics(dateRange),
    staleTime: 2 * 60 * 1000, // Data fresh for 2 minutes
    refetchOnWindowFocus: false,
  });

  if (error) {
    toast({
      title: "Error loading analytics",
      description: error instanceof Error ? error.message : "Failed to load venue analytics",
      variant: "destructive",
    });
  }

  const formatChange = (change: number): { value: string; isPositive: boolean } => {
    const absValue = Math.abs(change);
    const sign = change >= 0 ? '+' : '';
    return {
      value: `${sign}${absValue.toFixed(1)}%`,
      isPositive: change >= 0,
    };
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-center">No analytics data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { metrics, spendOverTime } = analytics;
  const spendChange = formatChange(metrics.totalSpendChange);
  const fillRateChange = formatChange(metrics.fillRateChange);
  const reliabilityChange = formatChange(metrics.reliabilityChange);

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header with Date Range Selector */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Performance Analytics</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Track your venue's key performance indicators
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={dateRange === '30d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange('30d')}
            >
              Last 30 Days
            </Button>
            <Button
              variant={dateRange === '3m' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange('3m')}
            >
              3 Months
            </Button>
            <Button
              variant={dateRange === 'ytd' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange('ytd')}
            >
              Year to Date
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Spend */}
          <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-blue-500/10">
            <CardHeader className="pb-3">
              <CardDescription className="text-sm font-medium">Total Spend</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-4xl font-bold text-foreground">
                    {formatCurrency(metrics.totalSpend)}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    {spendChange.isPositive ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        spendChange.isPositive ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {spendChange.value}
                    </span>
                    <span className="text-xs text-muted-foreground">vs previous period</span>
                  </div>
                </div>
                <div className="rounded-full bg-blue-500/20 p-3">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fill Rate */}
          <Card className="border-2 border-green-500/20 bg-gradient-to-br from-green-500/5 to-green-500/10">
            <CardHeader className="pb-3">
              <CardDescription className="text-sm font-medium">Fill Rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-4xl font-bold text-foreground">
                    {formatPercentage(metrics.fillRate)}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    {fillRateChange.isPositive ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        fillRateChange.isPositive ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {fillRateChange.value}
                    </span>
                    <span className="text-xs text-muted-foreground">vs previous period</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metrics.filledOrCompletedShifts} of {metrics.totalShifts} shifts filled
                  </p>
                </div>
                <div className="rounded-full bg-green-500/20 p-3">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reliability Score */}
          <Card className="border-2 border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-purple-500/10">
            <CardHeader className="pb-3">
              <CardDescription className="text-sm font-medium">Reliability Score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-4xl font-bold text-foreground">
                    {formatPercentage(metrics.reliabilityScore)}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    {reliabilityChange.isPositive ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        reliabilityChange.isPositive ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {reliabilityChange.value}
                    </span>
                    <span className="text-xs text-muted-foreground">vs previous period</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metrics.reliableShifts} of {metrics.shiftsWithActualStart} shifts on time
                  </p>
                </div>
                <div className="rounded-full bg-purple-500/20 p-3">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Spend Over Time Chart */}
        {spendOverTime.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Spend Over Time
              </CardTitle>
              <CardDescription>
                Daily spending breakdown for the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <Suspense fallback={
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                }>
                  <SpendChart data={spendOverTime} />
                </Suspense>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
