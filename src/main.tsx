import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
// Import react-big-calendar CSS globally to ensure it loads
import "react-big-calendar/lib/css/react-big-calendar.css";
// Pro Dashboard Kill-Switch: Critical fix for white-container glitch in dark mode demos
import "@/styles/pro-dashboard-overrides.css";
import { StartupErrorBoundary } from "@/components/error/StartupErrorBoundary";
import { initializeGTM } from "@/lib/analytics";
import { logger } from "@/lib/logger";

// Global GTM Guard: Define dummy gtag function if blocked by ad-blockers/privacy extensions
// This prevents 'undefined' errors throughout the app when tracking scripts are blocked
try {
  if (typeof window !== 'undefined') {
    // Initialize dataLayer if it doesn't exist
    window.dataLayer = window.dataLayer || [];
    
    // Define gtag function if it doesn't exist (blocked by ad-blocker)
    if (typeof window.gtag === 'undefined') {
      window.gtag = function() {
        // Dummy function that does nothing - prevents errors when tracking is blocked
        // Arguments are ignored silently to maintain API compatibility
      };
      console.debug('[Analytics] gtag function not available (likely blocked), using dummy implementation');
    }
  }
} catch (error) {
  // Never block app startup if analytics initialization fails
  console.debug('[Analytics] Failed to initialize gtag guard:', error);
}

// TEMP (Local Dev): Clear legacy session ghosts on localhost.
// Note: We can't place this *before* imports in an ES module; this is the earliest safe spot.
try {
  if (window.location.hostname === "localhost") {
    logger.debug("Main", "Clearing legacy session ghosts...");
    localStorage.removeItem("firebase:previous_external_idp_params");
    
    // Hard-reset legacy session data that may cause 401s
    const lastClear = localStorage.getItem("hospogo_auth_reset");
    if (!lastClear) {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("hospogo_auth_reset", Date.now().toString());
      logger.debug("Main", "Local storage purged to resolve auth conflicts.");
    }
  }
} catch {
  // ignore storage access issues
}

// Version indicator removed for production

// Global error handler for chunk loading failures (common in SPAs after deployment)
// This automatically reloads the page if a user tries to load a lazy-loaded chunk that no longer exists on the server
window.addEventListener('error', (e) => {
  // Check for common chunk load error messages
  const isChunkError = 
    /Loading chunk [\d]+ failed/.test(e.message) || 
    /Failed to fetch dynamically imported module/.test(e.message) ||
    /Importing a module script failed/.test(e.message);

  if (isChunkError) {
    console.error('Chunk load error detected, attempting reload:', e.message);
    
    // Prevent infinite reload loop
    const storageKey = 'chunk_load_error_reload';
    const lastReload = sessionStorage.getItem(storageKey);
    const now = Date.now();

    // Only reload if we haven't done so in the last 10 seconds
    if (!lastReload || now - parseInt(lastReload) > 10000) {
      sessionStorage.setItem(storageKey, now.toString());
      window.location.reload();
    }
  }
});

// Initialize GTM early (non-blocking, resilient to ad-blockers)
try {
  initializeGTM();
} catch (error) {
  // Silently fail - analytics should never block app startup
  console.debug('[Main] GTM initialization failed (non-blocking):', error);
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <StartupErrorBoundary>
      <App />
    </StartupErrorBoundary>
  </React.StrictMode>
);
