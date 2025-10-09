import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Wifi, 
  WifiOff, 
  Download, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Database
} from "lucide-react";

interface OfflineSupportProps {
  children: React.ReactNode;
}

interface CachedItem {
  id: string;
  data: any;
  timestamp: number;
  url: string;
}

export default function OfflineSupport({ children }: OfflineSupportProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cachedItems, setCachedItems] = useState<CachedItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncCachedData();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load cached items from localStorage
    const cached = localStorage.getItem('offline-cache');
    if (cached) {
      setCachedItems(JSON.parse(cached));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncCachedData = async () => {
    if (cachedItems.length === 0) return;

    setIsSyncing(true);
    setSyncProgress(0);

    try {
      for (let i = 0; i < cachedItems.length; i++) {
        const item = cachedItems[i];
        
        try {
          // Attempt to sync the cached item
          const response = await fetch(item.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(item.data)
          });

          if (response.ok) {
            // Remove successfully synced item
            const updatedItems = cachedItems.filter(cached => cached.id !== item.id);
            setCachedItems(updatedItems);
            localStorage.setItem('offline-cache', JSON.stringify(updatedItems));
          }
        } catch (error) {
          console.error('Failed to sync item:', item.id, error);
        }

        setSyncProgress(((i + 1) / cachedItems.length) * 100);
      }
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
    }
  };

  const cacheData = (url: string, data: any) => {
    const item: CachedItem = {
      id: Date.now().toString(),
      data,
      timestamp: Date.now(),
      url
    };

    const updatedItems = [...cachedItems, item];
    setCachedItems(updatedItems);
    localStorage.setItem('offline-cache', JSON.stringify(updatedItems));
  };

  const getCachedData = (url: string) => {
    return cachedItems.find(item => item.url === url);
  };

  const clearCache = () => {
    setCachedItems([]);
    localStorage.removeItem('offline-cache');
  };

  return (
    <div className="relative">
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white p-2 text-center">
          <div className="flex items-center justify-center space-x-2">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm font-medium">You're offline</span>
          </div>
        </div>
      )}

      {/* Sync Progress */}
      {isSyncing && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-500 text-white p-2">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">Syncing data... {Math.round(syncProgress)}%</span>
          </div>
        </div>
      )}

      {/* Back Online Indicator */}
      {isOnline && cachedItems.length > 0 && !isSyncing && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-green-500 text-white p-2 text-center">
          <div className="flex items-center justify-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Back online - Data synced</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={!isOnline ? 'pt-12' : ''}>
        {children}
      </div>

      {/* Offline Mode Content */}
      {!isOnline && (
        <div className="fixed bottom-4 right-4 z-40">
          <Card className="w-80 shadow-lg" data-testid="mobile-offline-indicator">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <WifiOff className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-lg">Offline Mode</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-steel-600">
                You're currently offline. Some features may be limited.
              </p>
              
              {cachedItems.length > 0 && (
                <Alert>
                  <Database className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        {cachedItems.length} item(s) queued for sync
                      </span>
                      <Badge variant="secondary" className="ml-2">
                        {cachedItems.length}
                      </Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Check Connection
                </Button>
                
                {cachedItems.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={clearCache}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Clear Cache
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Hook for using offline functionality
export function useOfflineSupport() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cachedItems, setCachedItems] = useState<CachedItem[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load cached items
    const cached = localStorage.getItem('offline-cache');
    if (cached) {
      setCachedItems(JSON.parse(cached));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const cacheData = (url: string, data: any) => {
    const item: CachedItem = {
      id: Date.now().toString(),
      data,
      timestamp: Date.now(),
      url
    };

    const updatedItems = [...cachedItems, item];
    setCachedItems(updatedItems);
    localStorage.setItem('offline-cache', JSON.stringify(updatedItems));
  };

  const getCachedData = (url: string) => {
    return cachedItems.find(item => item.url === url);
  };

  return {
    isOnline,
    cachedItems,
    cacheData,
    getCachedData
  };
}

// Component for displaying cached content
export function CachedContentIndicator({ itemCount }: { itemCount: number }) {
  if (itemCount === 0) return null;

  return (
    <div className="flex items-center space-x-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
      <Database className="h-4 w-4 text-yellow-600" />
      <span className="text-sm text-yellow-800" data-testid="mobile-cached-indicator">
        Showing cached content ({itemCount} items)
      </span>
    </div>
  );
}
