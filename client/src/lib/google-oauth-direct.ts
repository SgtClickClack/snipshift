// Direct Google OAuth implementation using your Google Console configuration
export class GoogleOAuthDirect {
  private clientId: string;
  private redirectUri: string;
  
  constructor() {
    this.clientId = '399353553154-e3kro6qoef592mirjdivl6cpbfjg8rq7.apps.googleusercontent.com';
    // Use the redirect URI that matches your Google Console configuration
    this.redirectUri = `${window.location.origin}/__/auth/handler`;
    console.log('🔧 OAuth setup:', { clientId: this.clientId, redirectUri: this.redirectUri });
  }

  public signIn(): void {
    const authUrl = this.buildAuthUrl();
    console.log('🔧 Redirecting to Google OAuth:', authUrl);
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