/// <reference types="vite/client" />

declare global {
  interface Window {
    removeSplash?: () => void;
    user?: import('@/contexts/AuthContext').User | null;
    isPolling?: boolean;
  }
}

export {};
