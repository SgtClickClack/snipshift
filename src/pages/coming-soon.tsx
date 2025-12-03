import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction, ArrowLeft } from 'lucide-react';

export default function ComingSoonPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-steel-50 to-white flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-yellow-100 rounded-full">
              <Construction className="h-12 w-12 text-yellow-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-steel-900">Coming Soon</CardTitle>
          <CardDescription className="text-base mt-2">
            This feature is currently under development and will be available in a future release.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-steel-600">
            We're working hard to bring you this feature. In the meantime, explore our core features:
          </p>
          <div className="flex flex-col gap-2">
            <Button 
              onClick={() => navigate('/dashboard')}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/jobs')}
              className="w-full"
            >
              Browse Jobs
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}





