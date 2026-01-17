import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, RefreshCw, Database, CreditCard, Radio, Mail, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { Skeleton } from '@/components/ui/skeleton';

interface ServiceHealth {
  service: string;
  status: 'UP' | 'DOWN';
  latency: number;
  message?: string;
  error?: string;
}

interface SystemPulse {
  database: ServiceHealth;
  stripe: ServiceHealth;
  pusher: ServiceHealth;
  resend: ServiceHealth;
  timestamp: string;
}

interface WeeklyMetrics {
  totalTransactionVolume: number;
  shiftCompletionRate: number;
  geofenceFailures: number;
  failedCommunications: number;
  dateRange: {
    start: string;
    end: string;
  };
}

interface SystemLogEntry {
  id: string;
  to: string;
  subject: string;
  from: string | null;
  errorMessage: string | null;
  errorCode: string | null;
  createdAt: string | null;
  recoveredAt: string | null;
}

interface SystemLog {
  logs: SystemLogEntry[];
  count: number;
}

/**
 * Traffic Light Component
 * Shows Green/Yellow/Red status for each service
 */
function TrafficLight({ status, latency }: { status: 'UP' | 'DOWN'; latency: number }) {
  const getColor = () => {
    if (status === 'UP') {
      // Green for UP, but yellow if latency is high (>1000ms)
      if (latency > 1000) {
        return 'bg-yellow-500';
      }
      return 'bg-green-500';
    }
    return 'bg-red-500';
  };

  const getPulse = () => {
    if (status === 'UP' && latency <= 1000) {
      return 'animate-pulse';
    }
    return '';
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded-full ${getColor()} ${getPulse()}`} />
      <span className="text-sm font-medium">{status}</span>
      <span className="text-xs text-muted-foreground">({latency}ms)</span>
    </div>
  );
}

/**
 * Service Status Card
 */
function ServiceCard({ 
  title, 
  icon: Icon, 
  health 
}: { 
  title: string; 
  icon: React.ComponentType<{ className?: string }>; 
  health: ServiceHealth;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <TrafficLight status={health.status} latency={health.latency} />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{health.message || 'No message'}</p>
        {health.error && (
          <p className="text-xs text-red-500 mt-2">{health.error}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function HealthDashboard() {
  const { toast } = useToast();

  // Fetch system pulse
  const { 
    data: systemPulse, 
    isLoading: isLoadingPulse, 
    refetch: refetchPulse 
  } = useQuery<SystemPulse>({
    queryKey: ['admin', 'health', 'pulse'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/health');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch weekly metrics
  const { 
    data: weeklyMetrics, 
    isLoading: isLoadingMetrics 
  } = useQuery<WeeklyMetrics>({
    queryKey: ['admin', 'health', 'weekly-metrics'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/health/weekly-metrics');
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  // Fetch system log
  const { 
    data: systemLog, 
    isLoading: isLoadingLog 
  } = useQuery<SystemLog>({
    queryKey: ['admin', 'health', 'system-log'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/health/system-log');
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const handleRefresh = async () => {
    await Promise.all([
      refetchPulse(),
    ]);
    toast({
      title: 'Refreshed',
      description: 'Health status updated',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Founder's Control Panel
          </h1>
          <p className="text-muted-foreground mt-1">
            Health Check Dashboard - System Status & Metrics
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Service Status Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Service Status</h2>
        {isLoadingPulse ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : systemPulse ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ServiceCard 
              title="Database" 
              icon={Database} 
              health={systemPulse.database} 
            />
            <ServiceCard 
              title="Stripe" 
              icon={CreditCard} 
              health={systemPulse.stripe} 
            />
            <ServiceCard 
              title="Pusher" 
              icon={Radio} 
              health={systemPulse.pusher} 
            />
            <ServiceCard 
              title="Resend" 
              icon={Mail} 
              health={systemPulse.resend} 
            />
          </div>
        ) : null}
      </div>

      {/* Weekly Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Weekly Metrics
        </h2>
        {isLoadingMetrics ? (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </CardContent>
          </Card>
        ) : weeklyMetrics ? (
          <Card>
            <CardHeader>
              <CardDescription>
                Last 7 days: {formatDate(weeklyMetrics.dateRange.start)} - {formatDate(weeklyMetrics.dateRange.end)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Transaction Volume</p>
                  <p className="text-2xl font-bold">{formatCurrency(weeklyMetrics.totalTransactionVolume)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">{formatPercentage(weeklyMetrics.shiftCompletionRate)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Geofence Failures</p>
                  <p className="text-2xl font-bold">{weeklyMetrics.geofenceFailures}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Failed Communications</p>
                  <p className="text-2xl font-bold">{weeklyMetrics.failedCommunications}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* System Log */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          System Log
        </h2>
        {isLoadingLog ? (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </CardContent>
          </Card>
        ) : systemLog ? (
          <Card>
            <CardHeader>
              <CardDescription>
                Most recent {systemLog.count} failed email entries
              </CardDescription>
            </CardHeader>
            <CardContent>
              {systemLog.logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>No failed emails in the system log</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {systemLog.logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {log.createdAt ? formatDate(log.createdAt) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm">{log.to}</TableCell>
                        <TableCell className="text-sm max-w-xs truncate">{log.subject}</TableCell>
                        <TableCell className="text-sm">
                          <div className="max-w-xs">
                            <p className="truncate text-red-500">
                              {log.errorMessage || log.errorCode || 'Unknown error'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.recoveredAt ? (
                            <Badge variant="default" className="bg-green-500">
                              Recovered
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              Failed
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
