// Direct Google OAuth implementation using your Google Console configuration
export class GoogleOAuthDirect {
  private clientId: string;
  private redirectUri: string;
  
  constructor() {
    // Require environment configuration - no hardcoded fallbacks for security
    this.clientId = import.meta.env?.VITE_GOOGLE_CLIENT_ID;
    if (!this.clientId) {
      throw new Error('VITE_GOOGLE_CLIENT_ID environment variable is required');
    }
    
    // Default to /oauth/callback which is registered in routing
    const defaultRedirect = `${window.location.origin}/oauth/callback`;
    this.redirectUri = import.meta.env?.VITE_GOOGLE_REDIRECT_URI || defaultRedirect;
    
    if (import.meta.env?.MODE !== 'production') {
      console.log('OAuth setup', { clientId: this.clientId.substring(0, 10) + '...', redirectUri: this.redirectUri });
    }
  }

  public signIn(): void {
    const authUrl = this.buildAuthUrl();
    if (import.meta.env?.MODE !== 'production') console.log('🔧 Redirecting to Google OAuth');
    window.location.href = authUrl;
  }

  private buildAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
      state: Math.random().toString(36).substring(2, 15),
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }
}

export const googleOAuth = new GoogleOAuthDirect();