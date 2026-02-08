/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** PWA install prompt event captured early (index.html) for hamburger menu Install button */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  const __BUILD_TIMESTAMP__: string;
  interface Window {
    removeSplash?: () => void;
    user?: import('@/contexts/AuthContext').User | null;
    isPolling?: boolean;
    /** PWA: Deferred install prompt captured before React mounts */
    __deferredInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

export {};
