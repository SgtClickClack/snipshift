/**
 * EarningsOverview - Lightweight earnings summary card for Professional Dashboard
 * 
 * Features:
 * - Total earnings display
 * - Simple SVG line chart with #BAFF39 color and glow effect
 * - Recent earnings trend
 * - Quick link to full earnings dashboard
 */

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { DollarSign, TrendingUp, ArrowRight, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

interface EarningsData {
  totalEarnedCents: number;
  totalEarnedDollars: string;
  filteredTotalCents: number;
  filteredTotalDollars: string;
  period: string;
  payoutHistory: Array<{
    id: string;
    amountCents: number;
    amountDollars: string;
    createdAt: string;
    status: string;
  }>;
  payoutCount: number;
}

// Simple SVG Line Chart Component with glow effect
interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

function SparklineChart({ 
  data, 
  width = 200, 
  height = 60, 
  color = '#BAFF39' 
}: SparklineChartProps) {
  if (!data || data.length === 0) {
    return (
      <svg width={width} height={height} className="overflow-visible">
        <text 
          x={width / 2} 
          y={height / 2} 
          textAnchor="middle" 
          className="fill-muted-foreground text-xs"
        >
          No data yet
        </text>
      </svg>
    );
  }

  // Calculate path from data points
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const padding = 4;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  
  // Generate path points
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * chartWidth;
    const y = padding + chartHeight - ((value - min) / range) * chartHeight;
    return { x, y };
  });
  
  // Create SVG path
  const pathD = points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x},${point.y}`;
    return `${path} L ${point.x},${point.y}`;
  }, '');
  
  // Create area fill path
  const areaD = `${pathD} L ${points[points.length - 1].x},${height - padding} L ${padding},${height - padding} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Glow filter */}
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      
      {/* Area fill */}
      <path
        d={areaD}
        fill="url(#areaGradient)"
      />
      
      {/* Line with glow */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#glow)"
      />
      
      {/* Line without glow (sharper) */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* End point dot */}
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="4"
          fill={color}
          filter="url(#glow)"
        />
      )}
    </svg>
  );
}

interface EarningsOverviewProps {
  className?: string;
  onViewAll?: () => void;
}

export function EarningsOverview({ className, onViewAll }: EarningsOverviewProps) {
  const { user } = useAuth();

  // Fetch earnings data from worker earnings endpoint
  const { data: earningsData, isLoading, error } = useQuery<EarningsData>({
    queryKey: ['worker-earnings', user?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/worker/earnings?period=last_3_months');
      if (!res.ok) {
        // If endpoint doesn't exist, return mock data
        return {
          totalEarnedCents: 0,
          totalEarnedDollars: '0.00',
          filteredTotalCents: 0,
          filteredTotalDollars: '0.00',
          period: 'last_3_months',
          payoutHistory: [],
          payoutCount: 0,
        };
      }
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: false,
  });

  // Calculate chart data from payout history
  const chartData = useMemo(() => {
    if (!earningsData?.payoutHistory || earningsData.payoutHistory.length === 0) {
      // Return sample trend data if no history
      return [0];
    }

    // Group by week and sum earnings
    const weeklyEarnings: Record<string, number> = {};
    
    earningsData.payoutHistory
      .filter((p) => p.status === 'completed')
      .forEach((payout) => {
        const date = new Date(payout.createdAt);
        const weekKey = `${date.getFullYear()}-W${Math.floor(date.getDate() / 7)}`;
        weeklyEarnings[weekKey] = (weeklyEarnings[weekKey] || 0) + payout.amountCents / 100;
      });

    const values = Object.values(weeklyEarnings);
    return values.length > 0 ? values : [0];
  }, [earningsData?.payoutHistory]);

  // Calculate trend percentage
  const trendPercentage = useMemo(() => {
    if (chartData.length < 2) return 0;
    const current = chartData[chartData.length - 1];
    const previous = chartData[chartData.length - 2];
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }, [chartData]);

  const totalEarnings = earningsData?.totalEarnedCents 
    ? earningsData.totalEarnedCents / 100 
    : 0;

  const recentEarnings = earningsData?.filteredTotalCents 
    ? earningsData.filteredTotalCents / 100 
    : 0;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5 text-[#BAFF39]" />
            Earnings Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-[#BAFF39]" />
              Earnings Overview
            </CardTitle>
            <CardDescription>Last 3 months</CardDescription>
          </div>
          {onViewAll && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewAll}
              className="text-sm"
            >
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Total Earnings */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Total Earned
            </p>
            <p className="text-2xl font-bold text-[#BAFF39]">
              {formatCurrency(totalEarnings)}
            </p>
          </div>
          
          {/* Recent Period */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Last 3 Months
            </p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">
                {formatCurrency(recentEarnings)}
              </p>
              {trendPercentage !== 0 && (
                <span className={`flex items-center text-xs font-medium ${
                  trendPercentage > 0 ? 'text-[#BAFF39]' : 'text-red-500'
                }`}>
                  <TrendingUp className={`h-3 w-3 mr-0.5 ${
                    trendPercentage < 0 ? 'rotate-180' : ''
                  }`} />
                  {Math.abs(trendPercentage)}%
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Chart */}
        <div className="pt-2">
          <SparklineChart 
            data={chartData} 
            width={280} 
            height={80} 
            color="#BAFF39"
          />
        </div>
        
        {/* Recent payouts count */}
        {earningsData && earningsData.payoutCount > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {earningsData.payoutCount} completed payment{earningsData.payoutCount !== 1 ? 's' : ''}
          </p>
        )}
        
        {/* Empty state */}
        {(!earningsData || earningsData.payoutCount === 0) && (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground">
              Complete shifts to start earning!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default EarningsOverview;
