/**
 * RevenueForecast - CEO "North Star" Dashboard
 * 
 * Rick's revenue projection engine for the Brisbane 100 campaign:
 * - Projected ARR: (Total Leads * Conversion Rate * $149/month)
 * - 12-month growth projection chart
 * - Key milestone tracking
 * 
 * Access: CEO/Admin only
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  Target,
  Calendar,
  Zap,
  Building2,
  ArrowUpRight,
  Loader2,
  Star
} from 'lucide-react';

// Pricing constants
const MONTHLY_SUBSCRIPTION = 149; // $149/month per venue
const ANNUAL_MULTIPLIER = 12;

// Mock lead data - synced with LeadTracker
const MOCK_LEAD_STATS = {
  totalLeads: 100, // Brisbane 100 target
  currentLeads: 45,
  conversionRate: 40, // 40% conversion rate
  activeVenues: 18,
  onboardingVenues: 12,
  pendingLeads: 15,
};

// Growth assumptions for 12-month projection
const MONTHLY_GROWTH_RATE = 0.15; // 15% month-over-month growth assumption

export default function RevenueForecast() {
  const { user } = useAuth();
  
  // Check for CEO/Admin access
  const isCEO = user?.email === 'rick@hospogo.com' || user?.email === 'rick@snipshift.com.au';
  const isAdmin = user?.roles?.includes('admin');
  const hasAccess = isCEO || isAdmin;

  // Fetch lead stats (from Lead Tracker or mock)
  const { data: leadStats = MOCK_LEAD_STATS, isLoading } = useQuery({
    queryKey: ['revenue-forecast-leads'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/admin/leads/brisbane-100/stats');
        if (!res.ok) throw new Error('Failed to fetch stats');
        return res.json();
      } catch {
        return MOCK_LEAD_STATS;
      }
    },
    enabled: hasAccess,
  });

  // Calculate revenue projections
  const projections = useMemo(() => {
    const { totalLeads, conversionRate, activeVenues } = leadStats;
    
    // Current state
    const currentMRR = activeVenues * MONTHLY_SUBSCRIPTION;
    const currentARR = currentMRR * ANNUAL_MULTIPLIER;
    
    // Projected based on pipeline
    const projectedActiveVenues = Math.round(totalLeads * (conversionRate / 100));
    const projectedMRR = projectedActiveVenues * MONTHLY_SUBSCRIPTION;
    const projectedARR = projectedMRR * ANNUAL_MULTIPLIER;
    
    // Brisbane 100 milestone
    const brisbane100MRR = 100 * MONTHLY_SUBSCRIPTION;
    const brisbane100ARR = brisbane100MRR * ANNUAL_MULTIPLIER;
    
    // 12-month growth projection (compound growth)
    const monthlyProjection = Array.from({ length: 12 }, (_, i) => {
      const month = new Date();
      month.setMonth(month.getMonth() + i);
      const monthName = month.toLocaleString('default', { month: 'short' });
      
      // Calculate venues using compound growth
      const projectedVenues = Math.min(
        Math.round(activeVenues * Math.pow(1 + MONTHLY_GROWTH_RATE, i + 1)),
        100 // Cap at Brisbane 100
      );
      
      const mrr = projectedVenues * MONTHLY_SUBSCRIPTION;
      
      return {
        month: monthName,
        venues: projectedVenues,
        mrr,
        arr: mrr * ANNUAL_MULTIPLIER,
      };
    });
    
    return {
      currentMRR,
      currentARR,
      projectedMRR,
      projectedARR,
      brisbane100MRR,
      brisbane100ARR,
      projectedActiveVenues,
      monthlyProjection,
    };
  }, [leadStats]);

  // Access guard
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-card/95 border-2 border-red-500/30">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <DollarSign className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              Revenue Forecast is only accessible to CEO and Admin users.
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

  // Calculate progress to Brisbane 100
  const brisbaneProgress = (leadStats.activeVenues / 100) * 100;
  
  // Find month when Brisbane 100 is reached
  const brisbane100Month = projections.monthlyProjection.findIndex(m => m.venues >= 100);

  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-[#BAFF39]" />
              Revenue Forecast
            </h1>
            <p className="text-zinc-400 mt-1">
              Brisbane 100 Campaign - Rick's North Star
            </p>
          </div>
          <Badge 
            variant="outline" 
            className="bg-[#BAFF39]/10 text-[#BAFF39] border-[#BAFF39]/30 px-4 py-2"
          >
            <Star className="h-4 w-4 mr-2" />
            ${MONTHLY_SUBSCRIPTION}/venue/month
          </Badge>
        </div>

        {/* Current vs Projected ARR */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Current ARR */}
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardHeader className="pb-2">
              <CardDescription className="text-zinc-500 uppercase tracking-wider text-xs">
                Current ARR
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white">
                  ${(projections.currentARR / 1000).toFixed(1)}K
                </span>
                <span className="text-zinc-500">AUD</span>
              </div>
              <p className="text-sm text-zinc-500 mt-2">
                {leadStats.activeVenues} active venues × ${MONTHLY_SUBSCRIPTION}/mo
              </p>
            </CardContent>
          </Card>

          {/* Pipeline ARR */}
          <Card className="bg-gradient-to-br from-[#BAFF39]/10 to-transparent border-[#BAFF39]/30">
            <CardHeader className="pb-2">
              <CardDescription className="text-[#BAFF39] uppercase tracking-wider text-xs">
                Pipeline ARR
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-[#BAFF39]">
                  ${(projections.projectedARR / 1000).toFixed(1)}K
                </span>
                <span className="text-[#BAFF39]/60">AUD</span>
              </div>
              <p className="text-sm text-zinc-500 mt-2">
                {projections.projectedActiveVenues} venues @ {leadStats.conversionRate}% conversion
              </p>
              <Badge className="mt-3 bg-[#BAFF39]/20 text-[#BAFF39] border-[#BAFF39]/30">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +{Math.round(((projections.projectedARR - projections.currentARR) / projections.currentARR) * 100)}%
              </Badge>
            </CardContent>
          </Card>

          {/* Brisbane 100 Target */}
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardHeader className="pb-2">
              <CardDescription className="text-zinc-500 uppercase tracking-wider text-xs">
                Brisbane 100 Target
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white">
                  ${(projections.brisbane100ARR / 1000).toFixed(0)}K
                </span>
                <span className="text-zinc-500">AUD</span>
              </div>
              <p className="text-sm text-zinc-500 mt-2">
                100 venues × ${MONTHLY_SUBSCRIPTION}/mo × 12
              </p>
              {brisbane100Month >= 0 && (
                <Badge className="mt-3 bg-blue-500/20 text-blue-400 border-blue-500/30">
                  <Calendar className="h-3 w-3 mr-1" />
                  Est. {projections.monthlyProjection[brisbane100Month]?.month}
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Brisbane 100 Progress */}
        <Card className="bg-zinc-900/80 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="h-5 w-5 text-[#BAFF39]" />
              Brisbane 100 Progress
            </CardTitle>
            <CardDescription className="text-zinc-500">
              Venue activation milestone tracker
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Progress stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 rounded-xl bg-zinc-800/50">
                <p className="text-2xl font-black text-[#BAFF39]">{leadStats.activeVenues}</p>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Active</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-zinc-800/50">
                <p className="text-2xl font-black text-blue-400">{leadStats.onboardingVenues}</p>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Onboarding</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-zinc-800/50">
                <p className="text-2xl font-black text-amber-400">{leadStats.pendingLeads}</p>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Leads</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-zinc-800/50">
                <p className="text-2xl font-black text-white">{100 - leadStats.currentLeads}</p>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">To Go</p>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Progress to 100</span>
                <span className="text-[#BAFF39] font-bold">{brisbaneProgress.toFixed(0)}%</span>
              </div>
              <div className="h-4 bg-zinc-800 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-[#BAFF39] transition-all duration-500"
                  style={{ 
                    width: `${(leadStats.activeVenues / 100) * 100}%`,
                    boxShadow: '0 0 10px #BAFF39'
                  }}
                />
                <div 
                  className="h-full bg-blue-500/50"
                  style={{ width: `${(leadStats.onboardingVenues / 100) * 100}%` }}
                />
                <div 
                  className="h-full bg-amber-500/30"
                  style={{ width: `${(leadStats.pendingLeads / 100) * 100}%` }}
                />
              </div>
              <div className="flex gap-4 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#BAFF39]" /> Active
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> Onboarding
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Leads
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 12-Month Projection Chart */}
        <Card className="bg-zinc-900/80 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#BAFF39]" />
              12-Month ARR Projection
            </CardTitle>
            <CardDescription className="text-zinc-500">
              Based on {(MONTHLY_GROWTH_RATE * 100).toFixed(0)}% MoM growth assumption
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* SVG Chart */}
            <div className="relative h-64 w-full">
              <svg 
                viewBox="0 0 600 200" 
                className="w-full h-full"
                preserveAspectRatio="none"
              >
                {/* Grid lines */}
                {[0, 50, 100, 150, 200].map((y) => (
                  <line
                    key={y}
                    x1="40"
                    y1={200 - y}
                    x2="580"
                    y2={200 - y}
                    stroke="#333"
                    strokeDasharray="2 4"
                  />
                ))}
                
                {/* Brisbane 100 target line */}
                <line
                  x1="40"
                  y1={200 - (projections.brisbane100ARR / 1000)}
                  x2="580"
                  y2={200 - (projections.brisbane100ARR / 1000)}
                  stroke="#BAFF39"
                  strokeWidth="2"
                  strokeDasharray="8 4"
                  opacity="0.5"
                />
                <text
                  x="45"
                  y={195 - (projections.brisbane100ARR / 1000)}
                  fill="#BAFF39"
                  fontSize="10"
                  opacity="0.7"
                >
                  Brisbane 100: $178K
                </text>
                
                {/* Area fill */}
                <path
                  d={`
                    M 40 200
                    ${projections.monthlyProjection.map((m, i) => {
                      const x = 40 + (i * 45);
                      const y = 200 - Math.min(m.arr / 1000, 200);
                      return `L ${x} ${y}`;
                    }).join(' ')}
                    L ${40 + ((projections.monthlyProjection.length - 1) * 45)} 200
                    Z
                  `}
                  fill="url(#gradient)"
                  opacity="0.3"
                />
                
                {/* Line */}
                <path
                  d={`
                    M 40 ${200 - Math.min(projections.monthlyProjection[0].arr / 1000, 200)}
                    ${projections.monthlyProjection.map((m, i) => {
                      const x = 40 + (i * 45);
                      const y = 200 - Math.min(m.arr / 1000, 200);
                      return `L ${x} ${y}`;
                    }).join(' ')}
                  `}
                  fill="none"
                  stroke="#BAFF39"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* Data points */}
                {projections.monthlyProjection.map((m, i) => {
                  const x = 40 + (i * 45);
                  const y = 200 - Math.min(m.arr / 1000, 200);
                  return (
                    <g key={i}>
                      <circle
                        cx={x}
                        cy={y}
                        r="5"
                        fill="#BAFF39"
                        stroke="#0a0a0a"
                        strokeWidth="2"
                      />
                      <text
                        x={x}
                        y="215"
                        textAnchor="middle"
                        fill="#666"
                        fontSize="10"
                      >
                        {m.month}
                      </text>
                    </g>
                  );
                })}
                
                {/* Gradient definition */}
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#BAFF39" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#BAFF39" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            
            {/* Summary row */}
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-800">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Starting ARR</p>
                <p className="text-lg font-bold text-white">
                  ${(projections.monthlyProjection[0].arr / 1000).toFixed(1)}K
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">12-Month Growth</p>
                <p className="text-lg font-bold text-[#BAFF39]">
                  +{Math.round(((projections.monthlyProjection[11].arr - projections.monthlyProjection[0].arr) / projections.monthlyProjection[0].arr) * 100)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Projected ARR (12mo)</p>
                <p className="text-lg font-bold text-[#BAFF39]">
                  ${(projections.monthlyProjection[11].arr / 1000).toFixed(1)}K
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Assumptions */}
        <Card className="bg-zinc-900/80 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#BAFF39]" />
              Model Assumptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-zinc-800/50 text-center">
                <p className="text-2xl font-bold text-white">${MONTHLY_SUBSCRIPTION}</p>
                <p className="text-xs text-zinc-500">Monthly Subscription</p>
              </div>
              <div className="p-4 rounded-xl bg-zinc-800/50 text-center">
                <p className="text-2xl font-bold text-white">{leadStats.conversionRate}%</p>
                <p className="text-xs text-zinc-500">Conversion Rate</p>
              </div>
              <div className="p-4 rounded-xl bg-zinc-800/50 text-center">
                <p className="text-2xl font-bold text-white">{(MONTHLY_GROWTH_RATE * 100).toFixed(0)}%</p>
                <p className="text-xs text-zinc-500">MoM Growth Rate</p>
              </div>
              <div className="p-4 rounded-xl bg-zinc-800/50 text-center">
                <p className="text-2xl font-bold text-white">100</p>
                <p className="text-xs text-zinc-500">Brisbane Target</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
