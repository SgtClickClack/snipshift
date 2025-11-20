import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UserDashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-steel-900">
            Welcome back, {user?.displayName || user?.name || 'User'}
          </h1>
          <p className="text-steel-600 mt-2">Manage your profile and settings</p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Profile Summary */}
          <Card className="card-chrome">
            <CardHeader>
              <CardTitle className="text-xl text-steel-900">Profile Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-4">
                <div className="h-16 w-16 rounded-full bg-steel-200 flex items-center justify-center text-2xl font-bold text-steel-600">
                  {(user?.displayName || user?.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-steel-900">{user?.displayName || user?.name || 'User'}</p>
                  <p className="text-sm text-steel-500">{user?.email}</p>
                </div>
              </div>
              <Link to="/profile/edit">
                <Button variant="chrome" className="w-full">Edit Profile</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Activity Placeholder */}
          <Card className="card-chrome">
            <CardHeader>
              <CardTitle className="text-xl text-steel-900">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-steel-500 italic">No recent activity found.</p>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="card-chrome">
            <CardHeader>
              <CardTitle className="text-xl text-steel-900">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">View Messages</Button>
              <Button variant="outline" className="w-full justify-start">Account Settings</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

