import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-steel-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-steel-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-steel-600 mb-6">
            Oops! We can't find that page. Head back to the home page to get started.
          </p>

          <Link to="/">
            <Button className="w-full bg-steel-600 hover:bg-steel-700 text-white">
              <Home className="h-4 w-4 mr-2" />
              Go to Home Page
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
