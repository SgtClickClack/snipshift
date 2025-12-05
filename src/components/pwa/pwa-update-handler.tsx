import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * PWA Update Handler Component
 * 
 * Automatically detects and applies service worker updates.
 * When a new version is available, it immediately reloads the page
 * to ensure users always see the latest version.
 * 
 * This component is invisible and runs in the background.
 */
export function PwaUpdateHandler() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Check for updates every 1 minute
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      // Auto-update immediately when new version is ready
      updateServiceWorker(true);
    }
  }, [needRefresh, updateServiceWorker]);

  // Invisible component - no UI
  return null;
}

