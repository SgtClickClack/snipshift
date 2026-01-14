import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

const logoUrl = '/hospogo-navbar-banner.png';

export function LoadingScreen() {
  const { refreshUser } = useAuth();
  const [showForceSync, setShowForceSync] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Show "Force Sync" button after 5 seconds of loading
  // This helps users stuck in the infinite loading loop
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowForceSync(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      await refreshUser();
      // Give it a moment to process
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Force sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background dark:bg-steel-900 transition-opacity duration-300" data-testid="loading-screen">
      <div className="flex items-center justify-center mb-6 min-h-36">
        <img
          src={logoUrl} 
          alt="HospoGo" 
          className="w-72 max-w-[85vw] h-auto object-contain animate-pulse"
          style={{
            imageRendering: 'auto',
            filter: 'drop-shadow(0 0 14px rgba(50,205,50,0.45))',
            WebkitFontSmoothing: 'antialiased',
          }}
          loading="eager"
          width={256}
          height={256}
        />
      </div>
      <div className="w-10 h-10 border-4 border-border dark:border-white/10 border-t-primary dark:border-t-blue-500 rounded-full animate-spin"></div>
      <div className="mt-4 text-sm text-muted-foreground dark:text-white/80 tracking-wide font-sans">Loading...</div>
      
      {showForceSync && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <p className="text-xs text-muted-foreground dark:text-white/60 text-center max-w-xs">
            Taking longer than expected? Try syncing your session.
          </p>
          <Button
            onClick={handleForceSync}
            disabled={isSyncing}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Force Sync'}
          </Button>
        </div>
      )}
    </div>
  );
}

