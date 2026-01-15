import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const AUTH_BRIDGE_COOKIE_NAME = 'hospogo_auth_bridge';
const MAX_COOKIE_AGE_SECONDS = 120;

const setBridgeCookie = (uid: string) => {
  if (typeof document === 'undefined') return;

  const payload = encodeURIComponent(JSON.stringify({ uid, ts: Date.now() }));
  const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${AUTH_BRIDGE_COOKIE_NAME}=${payload}; Path=/; Max-Age=${MAX_COOKIE_AGE_SECONDS}; SameSite=Lax${secureFlag}`;
};

export default function AuthBridgePage() {
  const [searchParams] = useSearchParams();

  // EMERGENCY EXIT: Alert at the very top to confirm bridge page is reached
  useEffect(() => {
    window.alert("BRIDGE PAGE REACHED");
  }, []);

  useEffect(() => {
    const uid = searchParams.get('uid');

    if (uid) {
      setBridgeCookie(uid);
      // EMERGENCY EXIT: Alert after cookie is set to confirm cookie was written
      window.alert("COOKIE SET: " + document.cookie);
    }

    // Close immediately; the opener will handle the redirect after it sees the cookie.
    window.close();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        Completing sign-in...
      </div>
    </div>
  );
}
