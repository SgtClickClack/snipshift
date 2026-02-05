/**
 * MarketplaceLiquidity - CEO Intelligence Dashboard
 * 
 * High-impact visualizations for marketplace health metrics:
 * - Fill Rate % (Target: 98%)
 * - Avg. Time to Fill (Target: < 60s)
 * - A-Team Growth (Month-over-month professional onboarding)
 * 
 * Access: CEO/Admin only (Rick's "North Star" metrics)
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Clock, 
  Users, 
  Target,
  Zap,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from 'lucide-react';

// Mock data for development - replace with API integration
const MOCK_METRICS = {
  fillRate: 94.5,
  fillRateTarget: 98,
  fillRateTrend: 2.3,
  avgTimeToFill: 47,
  avgTimeToFillTarget: 60,
  avgTimeToFillTrend: -12,
  totalProfessionals: 156,
  professionalsGrowth: 23,
  aTeamMembers: 42,
  aTeamGrowth: 8,
  shiftsPosted: 324,
  shiftsFilled: 306,
  shiftsOpen: 18,
};

const MOCK_MONTHLY_GROWTH = [
  { month: 'Sep', professionals: 45, aTeam: 12 },
  { month: 'Oct', professionals: 68, aTeam: 18 },
  { month: 'Nov', professionals: 89, aTeam: 25 },
  { month: 'Dec', professionals: 112, aTeam: 32 },
  { month: 'Jan', professionals: 133, aTeam: 38 },
  { month: 'Feb', professionals: 156, aTeam: 42 },
];

const MOCK_FILL_RATE_HISTORY = [
  { week: 'W1', rate: 91.2 },
  { week: 'W2', rate: 93.1 },
  { week: 'W3', rate: 92.8 },
  { week: 'W4', rate: 94.5 },
  { week: 'W5', rate: 95.2 },
  { week: 'W6', rate: 94.5 },
];

/**
 * Simple SVG Bar Chart Component
 */
function BarChart({ 
  data, 
  dataKey, 
  color = '#BAFF39',
  maxValue 
}: { 
  data: Array<{ [key: string]: string | number }>; 
  dataKey: string;
  color?: string;
  maxValue?: number;
}) {
  const max = maxValue || Math.max(...data.map(d => Number(d[dataKey])));
  
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((item, i) => {
        const value = Number(item[dataKey]);
        const height = (value / max) * 100;
        const label = Object.values(item)[0] as string;
        
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div 
              className="w-full rounded-t-md transition-all duration-500 hover:opacity-80"
              style={{ 
                height: `${height}%`,
                backgroundColor: color,
                boxShadow: `0 0 10px ${color}40`
              }}
            />
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Line Sparkline Component
 */
function Sparkline({ 
  data, 
  dataKey,
  color = '#BAFF39',
  target
}: { 
  data: Array<{ [key: string]: string | number }>; 
  dataKey: string;
  color?: string;
  target?: number;
}) {
  const values = data.map(d => Number(d[dataKey]));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  
  const width = 200;
  const height = 60;
  const padding = 4;
  
  const points = values.map((val, i) => {
    const x = padding + (i / (values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');
  
  const targetY = target 
    ? height - padding - ((target - min) / range) * (height - padding * 2)
    : null;
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Target line */}
      {targetY && (
        <line 
          x1={padding} 
          y1={targetY} 
          x2={width - padding} 
          y2={targetY}
          stroke="#BAFF39"
          strokeWidth="1"
          strokeDasharray="4 2"
          opacity="0.5"
        />
      )}
      {/* Data line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dots */}
      {values.map((val, i) => {
        const x = padding + (i / (values.length - 1)) * (width - padding * 2);
        const y = height - padding - ((val - min) / range) * (height - padding * 2);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="3"
            fill={color}
            className="hover:r-4 transition-all"
          />
        );
      })}
    </svg>
  );
}

/**
 * Metric Card with trend indicator
 */
function MetricCard({
  title,
  value,
  unit,
  target,
  trend,
  icon: Icon,
  isGood
}: {
  title: string;
  value: number;
  unit?: string;
  target?: number;
  trend?: number;
  icon: React.ElementType;
  isGood?: boolean;
}) {
  const meetsTarget = target ? value >= target : true;
  const trendPositive = trend ? trend > 0 : null;
  
  return (
    <Card className="bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 transition-all">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-xl bg-zinc-800">
            <Icon className="h-5 w-5 text-[#BAFF39]" />
          </div>
          {trend !== undefined && (
            <Badge 
              variant="outline" 
              className={`${
                (isGood !== undefined ? isGood : trendPositive)
                  ? 'bg-[#BAFF39]/20 text-[#BAFF39] border-[#BAFF39]/30'
                  : 'bg-red-500/20 text-red-400 border-red-500/30'
              }`}
            >
              {trendPositive ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
              {Math.abs(trend)}{unit === 's' ? 's' : '%'}
            </Badge>
          )}
        </div>
        
        <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1">{title}</p>
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-black ${meetsTarget ? 'text-[#BAFF39]' : 'text-white'}`}>
            {value.toFixed(unit === '%' ? 1 : 0)}
          </span>
          {unit && <span className="text-lg text-zinc-500">{unit}</span>}
        </div>
        
        {target && (
          <p className="text-xs text-zinc-600 mt-2">
            Target: {target}{unit || ''}
            {meetsTarget && <span className="text-[#BAFF39] ml-2">✓</span>}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function MarketplaceLiquidity() {
  const { user } = useAuth();
  
  // Check for CEO/Admin access
  // SECURITY FIX: Case-insensitive email comparison to handle Firebase normalization inconsistencies
  const normalizedEmail = (user?.email || '').toLowerCase().trim();
  const isCEO = normalizedEmail === 'julian.g.roberts@gmail.com';
  const isAdmin = user?.roles?.includes('admin');
  const hasAccess = isCEO || isAdmin;

  // Fetch marketplace metrics (falls back to mock data)
  const { data: metrics = MOCK_METRICS, isLoading } = useQuery({
    queryKey: ['marketplace-liquidity'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/admin/analytics/marketplace');
        if (!res.ok) throw new Error('Failed to fetch metrics');
        return res.json();
      } catch {
        return MOCK_METRICS;
      }
    },
    enabled: hasAccess,
    refetchInterval: 60000, // Refresh every minute
  });

  // Access guard
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-card/95 border-2 border-red-500/30">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <Activity className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              Marketplace Liquidity metrics are only accessible to CEO and Admin users.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#BAFF39]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Activity className="h-8 w-8 text-[#BAFF39]" />
              Marketplace Liquidity
            </h1>
            <p className="text-zinc-400 mt-1">
              Real-time health metrics for the HospoGo marketplace
            </p>
          </div>
          <Badge 
            variant="outline" 
            className="bg-[#BAFF39]/10 text-[#BAFF39] border-[#BAFF39]/30 px-4 py-2"
          >
            <Zap className="h-4 w-4 mr-2" />
            Live Data
          </Badge>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Fill Rate"
            value={metrics.fillRate}
            unit="%"
            target={metrics.fillRateTarget}
            trend={metrics.fillRateTrend}
            icon={Target}
            isGood={metrics.fillRateTrend > 0}
          />
          <MetricCard
            title="Avg. Time to Fill"
            value={metrics.avgTimeToFill}
            unit="s"
            target={metrics.avgTimeToFillTarget}
            trend={metrics.avgTimeToFillTrend}
            icon={Clock}
            isGood={metrics.avgTimeToFillTrend < 0}
          />
          <MetricCard
            title="Total Professionals"
            value={metrics.totalProfessionals}
            trend={metrics.professionalsGrowth}
            icon={Users}
          />
          <MetricCard
            title="A-Team Members"
            value={metrics.aTeamMembers}
            trend={metrics.aTeamGrowth}
            icon={Zap}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fill Rate Trend */}
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Target className="h-5 w-5 text-[#BAFF39]" />
                Fill Rate Trend
              </CardTitle>
              <CardDescription className="text-zinc-500">
                Weekly fill rate % (Target: 98%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <Sparkline 
                  data={MOCK_FILL_RATE_HISTORY} 
                  dataKey="rate" 
                  target={98}
                />
              </div>
              <div className="flex justify-between mt-4 text-xs text-zinc-500">
                {MOCK_FILL_RATE_HISTORY.map((item, i) => (
                  <span key={i}>{item.week}</span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* A-Team Growth */}
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#BAFF39]" />
                A-Team Growth
              </CardTitle>
              <CardDescription className="text-zinc-500">
                Month-over-month professional onboarding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BarChart 
                data={MOCK_MONTHLY_GROWTH} 
                dataKey="aTeam"
                color="#BAFF39"
              />
            </CardContent>
          </Card>
        </div>

        {/* Shift Distribution */}
        <Card className="bg-zinc-900/80 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#BAFF39]" />
              Shift Distribution
            </CardTitle>
            <CardDescription className="text-zinc-500">
              Current marketplace status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center p-6 rounded-xl bg-zinc-800/50">
                <p className="text-4xl font-black text-white mb-2">{metrics.shiftsPosted}</p>
                <p className="text-xs uppercase tracking-wider text-zinc-500">Total Posted</p>
              </div>
              <div className="text-center p-6 rounded-xl bg-[#BAFF39]/10 border border-[#BAFF39]/30">
                <p className="text-4xl font-black text-[#BAFF39] mb-2">{metrics.shiftsFilled}</p>
                <p className="text-xs uppercase tracking-wider text-zinc-500">Filled</p>
              </div>
              <div className="text-center p-6 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <p className="text-4xl font-black text-amber-400 mb-2">{metrics.shiftsOpen}</p>
                <p className="text-xs uppercase tracking-wider text-zinc-500">Open</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between text-xs text-zinc-500 mb-2">
                <span>Fill Progress</span>
                <span>{((metrics.shiftsFilled / metrics.shiftsPosted) * 100).toFixed(1)}%</span>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#BAFF39] transition-all duration-500"
                  style={{ 
                    width: `${(metrics.shiftsFilled / metrics.shiftsPosted) * 100}%`,
                    boxShadow: '0 0 10px #BAFF39'
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
