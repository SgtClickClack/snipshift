/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare global {
  interface Window {
    removeSplash?: () => void;
    user?: import('@/contexts/AuthContext').User | null;
    isPolling?: boolean;
  }
}

export {};
