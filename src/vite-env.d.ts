/// <reference types="vite/client" />

declare global {
  interface Window {
    removeSplash?: () => void;
  }
}

export {};
