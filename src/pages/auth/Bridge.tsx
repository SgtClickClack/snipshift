import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { auth } from '@/lib/firebase';
import { logger } from '@/lib/logger';

const AUTH_BRIDGE_COOKIE_NAME = 'hospogo_auth_bridge';
const AUTH_BRIDGE_TOKEN_KEY = 'hospogo_bridge_token';
const MAX_COOKIE_AGE_SECONDS = 120;

const setBridgeCookie = (uid: string) => {
  if (typeof document === 'undefined') return;

  const payload = encodeURIComponent(JSON.stringify({ uid, ts: Date.now() }));
  const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${AUTH_BRIDGE_COOKIE_NAME}=${payload}; Path=/; Max-Age=${MAX_COOKIE_AGE_SECONDS}; SameSite=Lax${secureFlag}`;
};

export default function AuthBridgePage() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleBridge = async () => {
      const uid = searchParams.get('uid');

      if (uid) {
        // Set cookie (existing behavior)
        setBridgeCookie(uid);
        
        // MULTI-CHANNEL BRIDGE: Also write token to localStorage as fallback
        // This ensures auth works even if popup is blocked or cookie fails
        try {
          const currentUser = auth.currentUser;
          if (currentUser && currentUser.uid === uid) {
            // Get fresh token from Firebase
            const token = await currentUser.getIdToken();
            const tokenPayload = JSON.stringify({ token, uid, ts: Date.now() });
            localStorage.setItem(AUTH_BRIDGE_TOKEN_KEY, tokenPayload);
            logger.debug('Bridge', '[Bridge] Token written to localStorage as fallback');
          } else {
            // Fallback: store uid only if we can't get token
            const fallbackPayload = JSON.stringify({ uid, ts: Date.now() });
            localStorage.setItem(AUTH_BRIDGE_TOKEN_KEY, fallbackPayload);
            logger.debug('Bridge', '[Bridge] UID written to localStorage (token unavailable)');
          }
        } catch (error) {
          console.warn('[Bridge] Failed to get token, storing uid only', error);
          // Still store uid as fallback
          const fallbackPayload = JSON.stringify({ uid, ts: Date.now() });
          localStorage.setItem(AUTH_BRIDGE_TOKEN_KEY, fallbackPayload);
        }
      }

      // Close immediately; the opener will handle the redirect after it sees the cookie/token.
      // COOP header 'same-origin-allow-popups' allows window.close() to work
      try {
        window.close();
      } catch (closeError) {
        // COOP may block window.close() in some cases, but cookie/token are already set
        console.debug('[Bridge] window.close() blocked (non-critical)', closeError);
      }
    };

    handleBridge();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        Completing sign-in...
      </div>
    </div>
  );
}
