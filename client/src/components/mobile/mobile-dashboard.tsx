import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  DollarSign, 
  Calendar, 
  TrendingUp,
  Users,
  Clock,
  Award,
  Target
} from "lucide-react";

interface DashboardStats {
  totalEarnings: number;
  completedJobs: number;
  activeJobs: number;
  rating: number;
  totalHours: number;
  monthlyGoal: number;
  monthlyProgress: number;
}

interface RecentActivity {
  id: string;
  type: 'job_completed' | 'payment_received' | 'rating_received' | 'goal_achieved';
  title: string;
  description: string;
  timestamp: string;
  amount?: number;
}

export default function MobileDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'earnings' | 'profile'>('overview');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/dashboard/stats');
      return response.json();
    }
  });

  const { data: recentActivity = [], isLoading: activityLoading } = useQuery({
    queryKey: ['/api/dashboard/activity'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/dashboard/activity');
      return response.json();
    }
  });

  const { data: earningsData = [], isLoading: earningsLoading } = useQuery({
    queryKey: ['/api/dashboard/earnings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/dashboard/earnings');
      return response.json();
    }
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'job_completed':
        return <Award className="h-4 w-4 text-green-600" />;
      case 'payment_received':
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'rating_received':
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case 'goal_achieved':
        return <Target className="h-4 w-4 text-purple-600" />;
      default:
        return <Clock className="h-4 w-4 text-steel-600" />;
    }
  };

  const renderOverview = () => (
    <div className="space-y-6" data-testid="mobile-dashboard">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-steel-600 to-steel-700 text-white rounded-lg" data-testid="mobile-dashboard-header">
        <h1 className="text-2xl font-bold">Welcome back, {user?.firstName}!</h1>
        <p className="text-steel-200">Here's your performance overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4" data-testid="mobile-metrics-cards">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-steel-600">Total Earnings</p>
                <p className="text-2xl font-bold text-green-600">
                  ${stats?.totalEarnings?.toLocaleString() || '0'}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-steel-600">Completed Jobs</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats?.completedJobs || 0}
                </p>
              </div>
              <Award className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-steel-600">Active Jobs</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats?.activeJobs || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-steel-600">Rating</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats?.rating || 0}/5
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Goal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Monthly Goal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-steel-600">Progress</span>
              <span className="text-sm font-medium">
                ${stats?.monthlyProgress || 0} / ${stats?.monthlyGoal || 0}
              </span>
            </div>
            <Progress 
              value={((stats?.monthlyProgress || 0) / (stats?.monthlyGoal || 1)) * 100} 
              className="h-2"
            />
            <p className="text-xs text-steel-600">
              {Math.round(((stats?.monthlyProgress || 0) / (stats?.monthlyGoal || 1)) * 100)}% of monthly goal
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activityLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-steel-600 mx-auto"></div>
                <p className="mt-2 text-steel-600">Loading activity...</p>
              </div>
            ) : recentActivity.length === 0 ? (
              <p className="text-steel-600 text-center py-4">No recent activity</p>
            ) : (
              recentActivity.slice(0, 5).map((activity: RecentActivity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 bg-steel-50 rounded-lg">
                  {getActivityIcon(activity.type)}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{activity.title}</p>
                    <p className="text-xs text-steel-600">{activity.description}</p>
                    {activity.amount && (
                      <p className="text-xs font-medium text-green-600">+${activity.amount}</p>
                    )}
                    <p className="text-xs text-steel-500">
                      {new Date(activity.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderJobs = () => (
    <div className="space-y-4" data-testid="mobile-jobs-section">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Haircut at Downtown Salon</h4>
                <Badge variant="secondary">In Progress</Badge>
              </div>
              <p className="text-sm text-steel-600">Today at 2:00 PM</p>
              <p className="text-sm font-medium text-green-600">$45</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderEarnings = () => (
    <div className="space-y-4" data-testid="mobile-earnings-section">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Earnings Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-steel-600">This Month</span>
              <span className="font-bold text-green-600">$1,250</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-steel-600">Last Month</span>
              <span className="font-bold">$1,100</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-steel-600">Total</span>
              <span className="font-bold">$5,420</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Earnings Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 bg-steel-50 rounded-lg flex items-center justify-center" data-testid="mobile-earnings-chart">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-steel-400 mx-auto mb-2" />
              <p className="text-steel-600">Chart would be displayed here</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-4" data-testid="mobile-profile-section">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-steel-600">Experience</span>
              <span className="font-medium">5+ years</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-steel-600">Specialties</span>
              <span className="font-medium">Haircuts, Styling</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-steel-600">Rating</span>
              <span className="font-medium">4.8/5 (127 reviews)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="flex border-b bg-white">
        <Button
          variant={activeTab === 'overview' ? 'default' : 'ghost'}
          className="flex-1 rounded-none"
          onClick={() => setActiveTab('overview')}
          data-testid="mobile-tab-overview"
        >
          Overview
        </Button>
        <Button
          variant={activeTab === 'jobs' ? 'default' : 'ghost'}
          className="flex-1 rounded-none"
          onClick={() => setActiveTab('jobs')}
          data-testid="mobile-tab-jobs"
        >
          Jobs
        </Button>
        <Button
          variant={activeTab === 'earnings' ? 'default' : 'ghost'}
          className="flex-1 rounded-none"
          onClick={() => setActiveTab('earnings')}
          data-testid="mobile-tab-earnings"
        >
          Earnings
        </Button>
        <Button
          variant={activeTab === 'profile' ? 'default' : 'ghost'}
          className="flex-1 rounded-none"
          onClick={() => setActiveTab('profile')}
          data-testid="mobile-tab-profile"
        >
          Profile
        </Button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'jobs' && renderJobs()}
        {activeTab === 'earnings' && renderEarnings()}
        {activeTab === 'profile' && renderProfile()}
      </div>
    </div>
  );
}
