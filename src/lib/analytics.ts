/**
 * Google Tag Manager (GTM) Analytics Integration
 * 
 * This module provides a resilient analytics implementation that gracefully handles
 * ad-blockers and network failures. All analytics calls are wrapped in try-catch
 * blocks to ensure they never block the application flow.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Initialize the dataLayer if it doesn't exist
 */
function ensureDataLayer(): void {
  if (typeof window === 'undefined') return;
  
  if (!window.dataLayer) {
    window.dataLayer = [];
  }
}

/**
 * Safe wrapper for gtag function
 * Creates a no-op dummy gtag function if gtag is not available (blocked by ad-blocker)
 * This prevents 'undefined' errors throughout the app
 */
function ensureGtag(): void {
  if (typeof window === 'undefined') return;
  
  if (!window.gtag) {
    // Dummy function that does nothing - prevents errors when tracking is blocked
    // This is a true no-op to avoid any side effects when ad-blockers block GTM
    window.gtag = function(..._args: unknown[]) {
      // Silently ignore all arguments - this is a no-op stub
      // We don't push to dataLayer here because if gtag is blocked, dataLayer operations may also fail
    };
  }
}

/**
 * Check if GTM is available and not blocked
 * Returns true if GTM appears to be loaded, false otherwise
 */
function isGTMAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    // Check if dataLayer exists and is an array
    if (!window.dataLayer || !Array.isArray(window.dataLayer)) {
      return false;
    }
    
    // Check if gtag function exists
    if (typeof window.gtag !== 'function') {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Track an analytics event with error handling
 * This function will never throw and will silently fail if GTM is blocked
 * IMPORTANT: This is non-blocking - it never awaits and never throws errors
 * 
 * @param eventName - The name of the event (e.g., 'sign_up', 'login')
 * @param eventParams - Optional parameters for the event
 */
export function trackEvent(eventName: string, eventParams?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  
  // Use setTimeout to ensure this runs asynchronously and never blocks
  // This ensures registration flow continues immediately regardless of tracking status
  setTimeout(() => {
    try {
      ensureDataLayer();
      ensureGtag();
      
      // Check if GTM is available before attempting to track
      if (!isGTMAvailable()) {
        // Silently fail - ad-blocker is likely blocking GTM
        console.debug('[Analytics] GTM not available, skipping event:', eventName);
        return;
      }
      
      // Push event to dataLayer - wrapped in try-catch for safety
      if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, eventParams || {});
        console.debug('[Analytics] Event tracked:', eventName, eventParams);
      }
    } catch (error) {
      // Handle ERR_BLOCKED_BY_CLIENT and other errors gracefully
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check for ad-blocker related errors
      if (
        errorMessage.includes('ERR_BLOCKED_BY_CLIENT') ||
        errorMessage.includes('net::ERR_BLOCKED_BY_CLIENT') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError')
      ) {
        console.debug('[Analytics] Event blocked by ad-blocker:', eventName);
      } else {
        // Log unexpected errors for debugging (but don't throw)
        console.warn('[Analytics] Failed to track event:', eventName, error);
      }
    }
  }, 0);
}

/**
 * Track a page view
 * 
 * @param pagePath - The path of the page (e.g., '/signup', '/dashboard')
 * @param pageTitle - Optional page title
 */
export function trackPageView(pagePath: string, pageTitle?: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    ensureDataLayer();
    ensureGtag();
    
    if (!isGTMAvailable()) {
      console.debug('[Analytics] GTM not available, skipping page view:', pagePath);
      return;
    }
    
    const params: Record<string, unknown> = {
      page_path: pagePath,
    };
    
    if (pageTitle) {
      params.page_title = pageTitle;
    }
    
    window.gtag!('config', getGTMId(), params);
    
    console.debug('[Analytics] Page view tracked:', pagePath);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (
      errorMessage.includes('ERR_BLOCKED_BY_CLIENT') ||
      errorMessage.includes('net::ERR_BLOCKED_BY_CLIENT') ||
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('NetworkError')
    ) {
      console.debug('[Analytics] Page view blocked by ad-blocker:', pagePath);
    } else {
      console.warn('[Analytics] Failed to track page view:', pagePath, error);
    }
  }
}

/**
 * Get the GTM ID from environment variables
 * Falls back to empty string if not set (which will cause GTM to not initialize)
 */
function getGTMId(): string {
  // Use VITE_GTM_ID if available, otherwise fall back to VITE_FIREBASE_MEASUREMENT_ID
  // (which is actually a GA4 measurement ID, but can work with GTM)
  const gtmId = import.meta.env.VITE_GTM_ID || import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '';
  
  if (!gtmId) {
    console.warn('[Analytics] GTM ID not configured. Set VITE_GTM_ID or VITE_FIREBASE_MEASUREMENT_ID');
  }
  
  return gtmId;
}

/**
 * Initialize Google Tag Manager
 * This should be called once when the app loads
 * It will gracefully fail if GTM is blocked by an ad-blocker
 */
export function initializeGTM(): void {
  if (typeof window === 'undefined') return;
  
  const gtmId = getGTMId();
  
  if (!gtmId) {
    console.warn('[Analytics] GTM ID not configured, skipping initialization');
    return;
  }
  
  try {
    ensureDataLayer();
    ensureGtag();
    
    // Load GTM script asynchronously with error handling
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gtmId}`;
    
    // Handle script load errors (ad-blockers will trigger this)
    script.onerror = function() {
      console.debug('[Analytics] GTM script blocked by ad-blocker or network error');
      // Don't throw - gracefully degrade
    };
    
    script.onload = function() {
      try {
        // Initialize GTM configuration after script loads
        window.gtag!('js', new Date());
        window.gtag!('config', gtmId, {
          // Send page_view automatically
          send_page_view: true,
        });
        console.debug('[Analytics] GTM initialized successfully with ID:', gtmId);
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        console.debug('[Analytics] GTM configuration error (likely blocked):', error.message);
      }
    };
    
    // Insert script into head
    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }
    
    // Also initialize immediately (in case script loads synchronously or is cached)
    try {
      window.gtag!('js', new Date());
      window.gtag!('config', gtmId, {
        send_page_view: true,
      });
    } catch (e) {
      // Ignore - will be handled by onload/onerror handlers
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (
      errorMessage.includes('ERR_BLOCKED_BY_CLIENT') ||
      errorMessage.includes('net::ERR_BLOCKED_BY_CLIENT') ||
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('NetworkError')
    ) {
      console.debug('[Analytics] GTM initialization blocked by ad-blocker');
    } else {
      console.warn('[Analytics] Failed to initialize GTM:', error);
    }
  }
}

/**
 * Track user registration/signup event
 * This is a convenience function for tracking signups
 * IMPORTANT: This is non-blocking and will never throw errors
 * 
 * @param method - The signup method ('email' or 'google')
 */
export function trackSignup(method: 'email' | 'google'): void {
  // Non-blocking call - registration flow should not await this
  trackEvent('sign_up', {
    method,
  });
}

/**
 * Track user login event
 * 
 * @param method - The login method ('email' or 'google')
 */
export function trackLogin(method: 'email' | 'google'): void {
  trackEvent('login', {
    method,
  });
}
