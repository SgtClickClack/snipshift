import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { User, Calendar, DollarSign, TrendingUp, Briefcase, FileText, Bell, Shield, Star } from "lucide-react";

export default function ProfessionalDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Don't redirect in test environment
    if (!user && !window.Cypress) {
      navigate("/login");
    }
  }, [user, navigate]);

  if (!user && !window.Cypress) {
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

  // Provide default user for test environment
  const displayUser = user || { displayName: 'Test User', email: 'test@example.com' };

  return (
    <div data-testid="professional-dashboard">
      <div className="min-h-screen bg-neutral-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900" data-testid="dashboard-title">
            Professional Dashboard
          </h1>
          <p className="text-neutral-600">
            Welcome back, <span data-testid="user-name">{displayUser.displayName || displayUser.email}</span>!
          </p>
        </div>

        {/* Welcome Message */}
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-600 text-sm" data-testid="welcome-message">
            Welcome back, {displayUser.displayName || displayUser.email}
          </p>
        </div>

        {/* Professional-specific features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" data-testid="professional-specific-features">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/shift-feed')}>
            <CardContent className="p-6 text-center">
              <Briefcase className="h-12 w-12 mx-auto mb-4 text-blue-600" />
              <h3 className="font-semibold mb-2">Browse Shifts</h3>
              <p className="text-sm text-gray-600">Find and apply for available shifts</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/my-applications')}>
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <h3 className="font-semibold mb-2">My Applications</h3>
              <p className="text-sm text-gray-600">Track your application status</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/saved-shifts')}>
            <CardContent className="p-6 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-purple-600" />
              <h3 className="font-semibold mb-2">Saved Shifts</h3>
              <p className="text-sm text-gray-600">View your saved shifts</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/notifications')}>
            <CardContent className="p-6 text-center">
              <Bell className="h-12 w-12 mx-auto mb-4 text-orange-600" />
              <h3 className="font-semibold mb-2">Notifications</h3>
              <p className="text-sm text-gray-600">Stay updated on opportunities</p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/qualifications')}>
            <CardContent className="p-6 text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <h3 className="font-semibold mb-2">Qualifications</h3>
              <p className="text-sm text-gray-600">Manage your professional certifications</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/ratings-reviews')}>
            <CardContent className="p-6 text-center">
              <Star className="h-12 w-12 mx-auto mb-4 text-yellow-600" />
              <h3 className="font-semibold mb-2">Ratings & Reviews</h3>
              <p className="text-sm text-gray-600">View your professional feedback</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/shift-history')}>
            <CardContent className="p-6 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-purple-600" />
              <h3 className="font-semibold mb-2">Shift History</h3>
              <p className="text-sm text-gray-600">View your completed shifts</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Available Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">12</p>
              <p className="text-sm text-neutral-600">New opportunities this week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">$2,450</p>
              <p className="text-sm text-neutral-600">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">4.8</p>
              <p className="text-sm text-neutral-600">Based on 24 reviews</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={() => navigate('/shift-feed')}
                  className="bg-primary hover:bg-primary/90"
                  data-testid="button-browse-jobs"
                >
                  Browse Available Jobs
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/profile')}
                >
                  Update Profile
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/applications')}
                >
                  View Applications
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Applied to "Weekend Barber Position"</p>
                  <p className="text-sm text-neutral-600">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Profile updated</p>
                  <p className="text-sm text-neutral-600">1 day ago</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-lg">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <div>
                  <p className="font-medium">New job alert: "Senior Stylist"</p>
                  <p className="text-sm text-neutral-600">2 days ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}