import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from '@/hooks/useToast';
import { ToastAction } from '@/components/ui/toast';

/**
 * PWA Update Handler
 *
 * Registers the service worker, polls for updates every 60 s,
 * and shows a persistent toast with a "Refresh Now" button when
 * a new version is waiting. The button sends SKIP_WAITING to the
 * waiting SW and reloads the page.
 */
export function PwaUpdateHandler() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | undefined>();

  const {
    needRefresh: [needRefresh],
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      registrationRef.current = r;
      if (r) {
        intervalRef.current = setInterval(() => {
          r.update();
        }, 60 * 1000);
      }
    },
    onRegisterError(error: Error) {
      console.error('SW registration error', error);
    },
  });

  useEffect(() => {
    if (!needRefresh) return;

    const handleRefresh = () => {
      registrationRef.current?.waiting?.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    };

    toast({
      title: 'Update available',
      description: 'A new version of HospoGo is ready.',
      duration: 0, // persistent until dismissed or acted on
      action: (
        <ToastAction altText="Refresh now to apply update" onClick={handleRefresh}>
          Refresh Now
        </ToastAction>
      ),
    });
  }, [needRefresh]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return null;
}
