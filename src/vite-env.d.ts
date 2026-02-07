/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare global {
  const __BUILD_TIMESTAMP__: string;
  interface Window {
    removeSplash?: () => void;
    user?: import('@/contexts/AuthContext').User | null;
    isPolling?: boolean;
  }
}

export {};
