import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IntegrationErrorBoundary } from '@/components/common/IntegrationErrorBoundary';
import { apiRequest } from '@/lib/queryClient';
import { Link2, Loader2, Unlink } from 'lucide-react';

export default function XeroIntegrationCard() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<{ connected: boolean; tenantName?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchStatus() {
      try {
        const res = await apiRequest('GET', '/api/integrations/xero/status');
        const data = await res.json();
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled) setStatus({ connected: false });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    fetchStatus();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const xeroParam = searchParams.get('xero');
    if (xeroParam === 'connected') {
      toast({
        title: 'Connected to Xero',
        description: 'Your Xero account is now linked. Timesheet sync will be available in a future update.',
      });
      searchParams.delete('xero');
      setSearchParams(searchParams, { replace: true });
    } else if (xeroParam === 'error' || xeroParam === 'invalid_state' || xeroParam === 'no_tenant') {
      toast({
        title: 'Xero connection failed',
        description:
          xeroParam === 'invalid_state'
            ? 'Connection expired. Please try again.'
            : xeroParam === 'no_tenant'
              ? 'No Xero organisation was selected.'
              : 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
      searchParams.delete('xero');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, toast]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const res = await apiRequest('GET', '/api/integrations/xero/connect');
      const { authUrl } = await res.json();
      if (authUrl) {
        window.location.href = authUrl;
      } else {
        throw new Error('No auth URL returned');
      }
    } catch (err) {
      toast({
        title: 'Connection failed',
        description: err instanceof Error ? err.message : 'Could not start Xero connection.',
        variant: 'destructive',
      });
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await apiRequest('DELETE', '/api/integrations/xero');
      setStatus({ connected: false });
      toast({
        title: 'Disconnected',
        description: 'Your Xero account has been disconnected.',
      });
    } catch (err) {
      toast({
        title: 'Disconnect failed',
        description: err instanceof Error ? err.message : 'Could not disconnect Xero.',
        variant: 'destructive',
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <IntegrationErrorBoundary>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Xero Integration
          </CardTitle>
          <CardDescription>
            Connect your Xero account to sync timesheets. This is a read-only connection for now.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Checking connection...</span>
            </div>
          ) : status?.connected ? (
            <div className="flex items-center justify-between" data-testid="xero-status-connected">
              <div>
                <p className="font-medium">Connected to {status.tenantName ?? 'Xero'}</p>
                <p className="text-sm text-muted-foreground">Connection successful</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="gap-2"
                data-testid="xero-disconnect-button"
              >
                {isDisconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unlink className="h-4 w-4" />
                )}
                Disconnect
              </Button>
            </div>
          ) : (
            <div data-testid="xero-status-disconnected">
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="gap-2"
                data-testid="xero-connect-button"
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                Connect to Xero
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </IntegrationErrorBoundary>
  );
}
