import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, CheckCircle, XCircle } from 'lucide-react';

export function GoogleAuthDemo() {
  const hasGoogleClient = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;
  
  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Google Authentication Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Google Authentication Implementation Complete!</strong> 
            To enable Google login, you need to set up a Google OAuth Client ID.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <h4 className="font-medium">Domain Verification Needed</h4>
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
            <p><strong>Client ID is correct</strong> but still getting OAuth error. This suggests a domain mismatch.</p>
            <p className="mt-2"><strong>Double-check Google Cloud Console:</strong></p>
            <div className="mt-2 p-2 bg-gray-100 rounded font-mono text-xs break-all">
              https://b9c30b6a-0bb9-491f-8312-4ea2996a1e40-00-1z5x1ywkgc76h.picard.replit.dev
            </div>
            <ul className="list-disc pl-4 mt-2 space-y-1">
              <li>Must be in "Authorized JavaScript origins"</li>
              <li>No extra spaces or trailing slashes</li>
              <li>Exact match required</li>
            </ul>
            
            <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded">
              <p className="font-medium text-sm">Alternative: Try localhost testing</p>
              <p className="text-xs mt-1">Add http://localhost:5000 to authorized origins for immediate testing</p>
            </div>
            
            <div className="mt-3 flex gap-2">
              <a href="https://console.cloud.google.com/apis/credentials" className="bg-orange-600 text-white px-3 py-2 rounded text-sm hover:bg-orange-700" target="_blank">
                Check Domain Setup
              </a>
              <button 
                onClick={() => window.location.reload()} 
                className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Current Status:</h4>
          <div className="flex items-center gap-2">
            {hasGoogleClient ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-green-600">Google Client ID configured</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-orange-600" />
                <span className="text-orange-600">Google Client ID not found - using demo mode</span>
              </>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Features Implemented:</h4>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>Google OAuth integration with @react-oauth/google</li>
            <li>Automatic user profile creation from Google data</li>
            <li>Seamless integration with existing authentication system</li>
            <li>Role-based dashboard routing after login</li>
            <li>Error handling and user feedback</li>
            <li>Demo mode when Client ID is not configured</li>
          </ul>
        </div>

        {!hasGoogleClient && (
          <Alert>
            <AlertDescription>
              <strong>Demo Mode:</strong> The Google sign-in buttons will work as a demonstration, 
              creating mock user accounts. Add your Google Client ID to enable real Google authentication.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}