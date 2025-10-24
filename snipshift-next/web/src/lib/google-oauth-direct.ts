// Direct Google OAuth implementation using your Google Console configuration
export class GoogleOAuthDirect {
  private clientId: string;
  private redirectUri: string;
  private isInitialized: boolean = false;
  
  constructor() {
    // Initialize immediately to avoid delays on first click
    this.clientId = import.meta.env?.VITE_GOOGLE_CLIENT_ID || '';
    this.redirectUri = import.meta.env?.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/oauth/callback`;
    this.isInitialized = true;
  }

  public async signIn(): Promise<void> {
    // Show immediate feedback - open popup right away
    if (import.meta.env?.MODE !== 'production') console.log('🔧 Starting Google OAuth with PKCE');
    
    // Generate PKCE challenge and verifier
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    
    // Store verifier for later use
    sessionStorage.setItem('pkce_verifier', codeVerifier);
    
    // Open popup immediately for instant feedback
    const popup = this.openPopup();
    
    // Generate auth URL with PKCE
    const authUrl = this.buildAuthUrlWithPKCE(codeChallenge);
    
    // Navigate popup to Google OAuth immediately
    popup.location.href = authUrl;
  }

  private openPopup(): Window {
    const width = 500;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    return window.open(
      'about:blank',
      'google-auth',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    )!;
  }

  private buildAuthUrlWithPKCE(codeChallenge: string): string {
    // Generate simple state for security
    const state = this.generateSimpleState();
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
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private generateSimpleState(): string {
    // Use Math.random for speed instead of crypto.getRandomValues
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15) +
           Date.now().toString(36);
  }
}

export const googleOAuth = new GoogleOAuthDirect();