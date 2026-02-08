import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to handle PWA install prompt.
 * Reads from global store (captured in index.html before React mounts) so the
 * hamburger menu Install button is enabled even when it mounts after the event fires.
 *
 * @returns Object with deferredPrompt state and promptInstall function
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() =>
    typeof window !== 'undefined' && window.__deferredInstallPrompt ? window.__deferredInstallPrompt : null
  );
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handleCaptured = () => {
      if (window.__deferredInstallPrompt) {
        setDeferredPrompt(window.__deferredInstallPrompt);
      }
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const ev = e as BeforeInstallPromptEvent;
      window.__deferredInstallPrompt = ev;
      setDeferredPrompt(ev);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.__deferredInstallPrompt = null;
    };

    window.addEventListener('pwa-install-prompt-captured', handleCaptured);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('pwa-install-prompt-captured', handleCaptured);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<void> => {
    const ev = deferredPrompt ?? window.__deferredInstallPrompt;
    if (!ev) return;

    await ev.prompt();
    const { outcome } = await ev.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    window.__deferredInstallPrompt = null;
  }, [deferredPrompt]);

  const canInstall = (deferredPrompt !== null || (typeof window !== 'undefined' && !!window.__deferredInstallPrompt)) && !isInstalled;

  return {
    deferredPrompt,
    isInstalled,
    promptInstall,
    canInstall,
  };
}
