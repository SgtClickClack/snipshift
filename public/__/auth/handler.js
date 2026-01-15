/**
 * Firebase Auth Handler for Custom Domain (hospogo.com)
 * 
 * This handler receives the OAuth redirect from Google/Firebase and redirects
 * the user back to the main app with the authentication result preserved in the URL.
 * 
 * Firebase's getRedirectResult() will then process the auth result from the URL hash.
 */

(function() {
  'use strict';

  // Extract the current URL components
  var origin = window.location.origin;
  var hash = window.location.hash;
  var search = window.location.search;
  
  // Build redirect URL to main app root
  // Preserve hash and query params so Firebase SDK can process them
  var redirectUrl = origin;
  
  // Add query params first (if any)
  if (search) {
    redirectUrl += search;
  }
  
  // Add hash fragment (Firebase Auth uses this for the auth result)
  if (hash) {
    redirectUrl += hash;
  }
  
  // If we're on the handler path, redirect to root with auth params preserved
  // This allows Firebase's getRedirectResult() to process the auth result
  if (window.location.pathname.includes('/__/auth/handler')) {
    // Small delay to ensure any pending operations complete
    setTimeout(function() {
      window.location.replace(redirectUrl);
    }, 100);
  } else {
    // Already on root or unexpected path, redirect to root
    window.location.replace(origin);
  }
})();
