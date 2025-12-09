import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if app was previously installed
    if (window.localStorage.getItem('pwa-installed') === 'true') {
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
      window.localStorage.setItem('pwa-installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
      setIsVisible(false);
      window.localStorage.setItem('pwa-installed', 'true');
    }

    // Clear the deferred prompt
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Don't show again permanently (use localStorage instead of sessionStorage)
    window.localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    if (isVisible && deferredPrompt) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        window.localStorage.setItem('pwa-prompt-dismissed', 'true');
      }, 10000); // 10 seconds
      return () => clearTimeout(timer);
    }
  }, [isVisible, deferredPrompt]);

  // Don't show if already installed or dismissed
  if (isInstalled || !isVisible || !deferredPrompt) {
    return null;
  }

  if (window.localStorage.getItem('pwa-prompt-dismissed') === 'true') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-overlay animate-in slide-in-from-bottom-5 pointer-events-none">
      <div className="bg-card dark:bg-steel-900 text-card-foreground dark:text-white rounded-lg shadow-xl border border-border dark:border-steel-700 p-3 flex items-center gap-2 pointer-events-auto">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-xs mb-0.5 text-card-foreground dark:text-white truncate">Install Snipshift</p>
          <p className="text-xs text-muted-foreground dark:text-steel-300 line-clamp-1">
            Add to home screen
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button
            size="sm"
            onClick={handleInstallClick}
            className="bg-gradient-to-r from-red-accent to-red-accent-dark hover:from-red-accent-light hover:to-red-accent text-white font-semibold h-8 px-3 text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            Install
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="text-foreground dark:text-white hover:bg-muted dark:hover:bg-steel-800 h-7 w-7 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

