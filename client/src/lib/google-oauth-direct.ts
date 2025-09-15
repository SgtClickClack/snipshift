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

  public async signIn(): Promise<void> {
    const authUrl = await this.buildAuthUrl();
    if (import.meta.env?.MODE !== 'production') console.log('🔧 Redirecting to Google OAuth');
    window.location.href = authUrl;
  }

  private async buildAuthUrl(): Promise<string> {
    // Generate PKCE code verifier and challenge for security
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    const state = this.generateSecureState();
    
    // Store for verification after callback
    sessionStorage.setItem('oauth_code_verifier', codeVerifier);
    sessionStorage.setItem('oauth_state', state);
    
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    return btoa(String.fromCharCode.apply(null, Array.from(hashArray)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private generateSecureState(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}

export const googleOAuth = new GoogleOAuthDirect();