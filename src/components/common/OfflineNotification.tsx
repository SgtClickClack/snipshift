/**
 * OfflineNotification - "Logistics Bridge" Network Status Indicator
 * 
 * Shows a subtle, non-intrusive "Local Mode Active" toast when network connectivity is lost.
 * For the Investor Briefing: If Brisbane office Wi-Fi flickers, Rick can say:
 * "The engine is holding state locally; it will sync once we're back."
 * 
 * Features:
 * - Listens to browser online/offline events
 * - Graceful reconnection detection with "Syncing Resumed" message
 * - Non-intrusive toast-style notification with Electric Lime (#BAFF39) branding
 * - Position avoids overlap with Support Bot and bottom nav
 */

import { useState, useEffect } from 'react';
import { Wifi, CloudOff, RefreshCw, CloudUpload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineNotificationProps {
  className?: string;
}

export function OfflineNotification({ className }: OfflineNotificationProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  
  useEffect(() => {
    // Initialize from browser state
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowReconnected(true);
        // Auto-dismiss reconnected message after 4 seconds
        setTimeout(() => {
          setShowReconnected(false);
        }, 4000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  // Show nothing if online and not showing reconnected message
  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 right-4 sm:left-auto sm:right-6 sm:w-auto z-[var(--z-floating)] animate-in slide-in-from-bottom-4 duration-300",
        className
      )}
    >
      {!isOnline ? (
        // LOGISTICS BRIDGE: Offline banner with Electric Lime branding
        // Non-intrusive toast that Rick can reference: "The engine is holding state locally"
        <div 
          className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm border"
          style={{ 
            backgroundColor: 'rgba(186, 255, 57, 0.95)', 
            borderColor: 'rgba(186, 255, 57, 0.6)',
            color: '#0a0a0a'
          }}
        >
          <div className="flex items-center gap-2">
            <CloudOff className="h-5 w-5 animate-pulse" />
            <div className="flex flex-col">
              <span className="font-semibold text-sm">Logistics Engine: Local Mode Active</span>
              <span className="text-xs opacity-80">
                Connection unstable—Syncing paused.
              </span>
            </div>
          </div>
          <RefreshCw className="h-4 w-4 animate-spin ml-2 opacity-60" />
        </div>
      ) : showReconnected ? (
        // Reconnected banner with success messaging
        <div 
          className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm border"
          style={{ 
            backgroundColor: 'rgba(186, 255, 57, 0.95)', 
            borderColor: 'rgba(186, 255, 57, 0.6)',
            color: '#0a0a0a'
          }}
        >
          <CloudUpload className="h-5 w-5" />
          <div className="flex flex-col">
            <span className="font-semibold text-sm">Connection Restored</span>
            <span className="text-xs opacity-80">Syncing resumed.</span>
          </div>
          <Wifi className="h-4 w-4 ml-2 opacity-70" />
        </div>
      ) : null}
    </div>
  );
}

// Hook for components that need offline state
export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
}

