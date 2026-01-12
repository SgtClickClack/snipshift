import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
// Import react-big-calendar CSS globally to ensure it loads
import "react-big-calendar/lib/css/react-big-calendar.css";
import { StartupErrorBoundary } from "@/components/error/StartupErrorBoundary";

// TEMP (Local Dev): Clear legacy session ghosts on localhost.
// Note: We can't place this *before* imports in an ES module; this is the earliest safe spot.
try {
  if (window.location.hostname === "localhost") {
    console.log("Clearing legacy session ghosts...");
    localStorage.removeItem("firebase:previous_external_idp_params");
    
    // Hard-reset legacy session data that may cause 401s
    const lastClear = localStorage.getItem("hospogo_auth_reset");
    if (!lastClear) {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("hospogo_auth_reset", Date.now().toString());
      console.log("Local storage purged to resolve auth conflicts.");
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

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <StartupErrorBoundary>
      <App />
    </StartupErrorBoundary>
  </React.StrictMode>
);
