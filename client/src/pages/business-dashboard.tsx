import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Store, 
  Users, 
  Calendar, 
  TrendingUp, 
  MessageSquare, 
  Plus,
  Briefcase,
  Award,
  BarChart3,
  Settings
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function BusinessDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data - replace with actual API calls
  const [stats, setStats] = useState({
    totalShifts: 12,
    activeApplications: 8,
    completedShifts: 45,
    revenue: 12500,
    rating: 4.8,
    reviews: 127
  });

  const [recentShifts, setRecentShifts] = useState([
    {
      id: '1',
      title: 'Senior Barber - Weekend Shift',
      date: '2024-01-15',
      applicants: 5,
      status: 'open',
      pay: 150
    },
    {
      id: '2', 
      title: 'Stylist - Evening Shift',
      date: '2024-01-14',
      applicants: 3,
      status: 'filled',
      pay: 120
    }
  ]);

  const handlePostShift = () => {
    toast({
      title: "Post New Shift",
      description: "Shift posting functionality will be implemented here.",
    });
  };

  const handleViewApplications = () => {
    toast({
      title: "View Applications", 
      description: "Application management will be implemented here.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-steel-50 via-white to-chrome-light/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-steel-900 mb-2">
                Business Dashboard
              </h1>
              <p className="text-steel-600">
                Welcome back, {user?.displayName || 'Business Owner'}! Manage your shifts and grow your business.
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={handlePostShift}
                className="bg-red-accent hover:bg-red-accent-dark text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Post New Shift
              </Button>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalShifts}</div>
              <p className="text-xs text-muted-foreground">
                +2 from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Applications</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeApplications}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting your review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.revenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rating</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.rating}</div>
              <p className="text-xs text-muted-foreground">
                From {stats.reviews} reviews
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="shifts">Shifts</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Shifts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Recent Shifts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentShifts.map((shift) => (
                      <div key={shift.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{shift.title}</h4>
                          <p className="text-sm text-muted-foreground">{shift.date}</p>
                          <p className="text-sm text-muted-foreground">${shift.pay}/shift</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={shift.status === 'open' ? 'default' : 'secondary'}>
                            {shift.status}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            {shift.applicants} applicants
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full mt-4">
                    View All Shifts
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      onClick={handlePostShift}
                      className="h-20 flex flex-col gap-2"
                      variant="outline"
                    >
                      <Plus className="w-6 h-6" />
                      Post Shift
                    </Button>
                    <Button 
                      onClick={handleViewApplications}
                      className="h-20 flex flex-col gap-2"
                      variant="outline"
                    >
                      <Users className="w-6 h-6" />
                      View Applications
                    </Button>
                    <Button 
                      className="h-20 flex flex-col gap-2"
                      variant="outline"
                    >
                      <MessageSquare className="w-6 h-6" />
                      Messages
                    </Button>
                    <Button 
                      className="h-20 flex flex-col gap-2"
                      variant="outline"
                    >
                      <BarChart3 className="w-6 h-6" />
                      Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="shifts">
            <Card>
              <CardHeader>
                <CardTitle>Manage Shifts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Shift management functionality will be implemented here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications">
            <Card>
              <CardHeader>
                <CardTitle>Application Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Application review and management functionality will be implemented here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Business Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Business analytics and reporting functionality will be implemented here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
