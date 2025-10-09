import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, Users, Shield, BarChart3, Palette } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect if not admin
  if (!user || user.currentRole !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 py-8" data-testid="admin-dashboard">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900" data-testid="dashboard-title">
            Admin Dashboard
          </h1>
          <p className="text-neutral-600">
            Welcome back, <span data-testid="user-name">{user.displayName || user.email}</span>!
          </p>
        </div>

        {/* Admin Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600 mb-4">Manage user accounts and permissions</p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/admin/users')}
                data-testid="button-manage-users"
              >
                Manage Users
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                Content Moderation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600 mb-4">Review and moderate user content</p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/admin/content-moderation')}
                data-testid="nav-content-moderation"
              >
                Content Moderation
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600 mb-4">View platform analytics and metrics</p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/admin/analytics')}
                data-testid="button-view-analytics"
              >
                View Analytics
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-orange-600" />
                System Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600 mb-4">Configure system settings and preferences</p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/admin/settings')}
                data-testid="button-system-settings"
              >
                System Settings
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-pink-600" />
                Design System
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600 mb-4">View and test design system components</p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/design-showcase')}
                data-testid="nav-design-showcase"
              >
                Design Showcase
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Admin Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className="font-medium">User account approved</p>
                  <p className="text-sm text-neutral-600">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Content moderation review completed</p>
                  <p className="text-sm text-neutral-600">4 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-lg">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div>
                  <p className="font-medium">System settings updated</p>
                  <p className="text-sm text-neutral-600">1 day ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
