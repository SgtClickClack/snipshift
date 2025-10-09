import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Package, TrendingUp, Users, MessageSquare } from "lucide-react";

export default function BrandDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Please log in to access your dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 py-8" data-testid="brand-dashboard">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900" data-testid="dashboard-title">
            Brand Dashboard
          </h1>
          <p className="text-neutral-600">
            Welcome back, <span data-testid="user-name">{user.displayName || user.email}</span>!
          </p>
        </div>

        {/* Welcome Message */}
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-600 text-sm" data-testid="welcome-message">
            Welcome back, {user.displayName || user.email}
          </p>
        </div>

        {/* Brand-specific features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8" data-testid="brand-specific-features">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">24</p>
              <p className="text-sm text-neutral-600">Active listings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Reach
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">1,247</p>
              <p className="text-sm text-neutral-600">Professionals reached</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Engagement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">89%</p>
              <p className="text-sm text-neutral-600">Post engagement rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => navigate("/brand/create-post")}
                className="h-20 flex flex-col items-center justify-center gap-2"
              >
                <MessageSquare className="h-6 w-6" />
                <span>Create Post</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/brand/manage-products")}
                className="h-20 flex flex-col items-center justify-center gap-2"
              >
                <Package className="h-6 w-6" />
                <span>Manage Products</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className="font-medium">New product "Premium Styling Gel" added</p>
                  <p className="text-sm text-neutral-600">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Post "Summer Collection Launch" published</p>
                  <p className="text-sm text-neutral-600">1 day ago</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-lg">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <div>
                  <p className="font-medium">15 new professionals followed your brand</p>
                  <p className="text-sm text-neutral-600">2 days ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}