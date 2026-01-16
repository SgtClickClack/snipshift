import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  responseTime?: number;
  error?: string;
}

interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: HealthCheckResult[];
  uptime: number;
}

// Service name mapping for display
const serviceDisplayNames: Record<string, string> = {
  database: 'Marketplace Database',
  pusher: 'Real-time Notifications (Pusher)',
  stripe: 'Payment Processing (Stripe)',
};

// Fetch health status (public endpoint, no auth required)
async function fetchHealthStatus(): Promise<HealthCheckResponse> {
  const response = await fetch('/api/health', {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch health status: ${response.status}`);
  }

  return response.json();
}

export default function StatusPage() {
  const { data, isLoading, error, dataUpdatedAt } = useQuery<HealthCheckResponse>({
    queryKey: ['/api/health'],
    queryFn: fetchHealthStatus,
    refetchInterval: 60000, // Refresh every 60 seconds
    retry: 3,
    retryDelay: 2000,
  });

  // Determine if all systems are operational
  const allHealthy = data?.status === 'ok' && data.checks.every(check => check.status === 'healthy');

  // Get status icon and color
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-warning" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-success/20 text-success border-success/30';
      case 'degraded':
        return 'bg-warning/20 text-warning border-warning/30';
      case 'unhealthy':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'Operational';
      case 'degraded':
        return 'Degraded';
      case 'unhealthy':
        return 'Down';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 md:py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
            System Status
          </h1>
          <p className="text-muted-foreground text-lg">
            Real-time health monitoring for HospoGo services
          </p>
        </div>

        {/* All Systems Operational Banner */}
        {allHealthy && (
          <Card className="mb-6 border-2 border-success/50 bg-success/5 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-success" />
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-success">All Systems Operational</h2>
                  <p className="text-muted-foreground mt-1">
                    All services are running normally
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Service Interruption Warning */}
        {error && (
          <Card className="mb-6 border-2 border-destructive/50 bg-destructive/5 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <XCircle className="h-6 w-6 text-destructive mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-destructive mb-2">
                    Service Interruption
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    We're unable to fetch the current system status. This may indicate a temporary service interruption.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    For support, please contact:{' '}
                    <a
                      href="mailto:info@hospogo.com"
                      className="text-primary hover:underline font-medium"
                    >
                      info@hospogo.com
                    </a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Cards */}
        <Card className="shadow-xl border-2 border-border/50 bg-card/95 backdrop-blur-sm">
          <CardHeader className="border-b border-border/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold text-card-foreground">
                Service Status
              </CardTitle>
              {isLoading && (
                <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin" />
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading && !data ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading system status...</p>
              </div>
            ) : error && !data ? (
              <div className="text-center py-8">
                <XCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
                <p className="text-destructive font-medium mb-2">Failed to load status</p>
                <p className="text-sm text-muted-foreground">
                  Please try refreshing the page or contact support if the issue persists.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* API Gateway Status (always healthy if we can reach the endpoint) */}
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-3">
                    {getStatusIcon('healthy')}
                    <div>
                      <h3 className="font-semibold text-foreground">API Gateway</h3>
                      <p className="text-sm text-muted-foreground">
                        Endpoint accessible
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor('healthy')}`}>
                    {getStatusText('healthy')}
                  </span>
                </div>

                {/* Individual Service Statuses */}
                {data?.checks.map((check) => (
                  <div
                    key={check.service}
                    className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {getStatusIcon(check.status)}
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">
                          {serviceDisplayNames[check.service] || check.service}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {check.message}
                          {check.responseTime && (
                            <span className="ml-2">({check.responseTime}ms)</span>
                          )}
                        </p>
                        {check.error && (
                          <p className="text-xs text-destructive mt-1">
                            Error: {check.error}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(check.status)}`}>
                      {getStatusText(check.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Last Updated Timestamp */}
            {data && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      Last updated:{' '}
                      {dataUpdatedAt
                        ? formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })
                        : 'Just now'}
                    </span>
                  </div>
                  {data.version && (
                    <span className="text-xs">Version {data.version}</span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            Status page automatically refreshes every 60 seconds.
          </p>
          <p className="mt-2">
            For more information, visit{' '}
            <a
              href="https://hospogo.com"
              className="text-primary hover:underline font-medium"
            >
              hospogo.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
