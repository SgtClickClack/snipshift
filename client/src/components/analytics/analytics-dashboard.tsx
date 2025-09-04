import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, Eye, Users, Heart, MessageSquare } from "lucide-react";
// Removed legacy auth import; component takes userRole via props

// Mock analytics data - in production, this would come from your analytics API
const mockAnalyticsData = {
  hub: {
    jobViews: [
      { month: "Jan", views: 120, applications: 45 },
      { month: "Feb", views: 180, applications: 67 },
      { month: "Mar", views: 240, applications: 89 },
      { month: "Apr", views: 200, applications: 76 },
      { month: "May", views: 280, applications: 102 }
    ],
    teamPerformance: [
      { name: "Sarah J.", revenue: 4500, clients: 89, rating: 4.8 },
      { name: "Mike R.", revenue: 3800, clients: 76, rating: 4.6 },
      { name: "Alex T.", revenue: 4200, clients: 82, rating: 4.9 }
    ],
    summary: {
      totalJobs: 12,
      totalViews: 1840,
      totalApplications: 287,
      responseRate: 78
    }
  },
  brand: {
    postEngagement: [
      { month: "Jan", reach: 2400, engagement: 340, clicks: 89 },
      { month: "Feb", reach: 3200, engagement: 480, clicks: 142 },
      { month: "Mar", reach: 2800, engagement: 420, clicks: 125 },
      { month: "Apr", reach: 3600, engagement: 560, clicks: 178 },
      { month: "May", reach: 4200, engagement: 680, clicks: 234 }
    ],
    topProducts: [
      { name: "Premium Clippers", orders: 45, revenue: 6750 },
      { name: "Styling Gel", orders: 78, revenue: 2340 },
      { name: "Beard Oil", orders: 62, revenue: 1860 }
    ],
    summary: {
      totalPosts: 24,
      totalReach: 16200,
      avgEngagement: 4.2,
      conversionRate: 12.5
    }
  },
  trainer: {
    contentViews: [
      { month: "Jan", views: 420, purchases: 18, revenue: 540 },
      { month: "Feb", views: 580, purchases: 24, revenue: 720 },
      { month: "Mar", views: 680, purchases: 31, revenue: 930 },
      { month: "Apr", views: 740, purchases: 28, revenue: 840 },
      { month: "May", views: 890, purchases: 39, revenue: 1170 }
    ],
    topCourses: [
      { name: "Advanced Fade Techniques", students: 89, revenue: 2670, rating: 4.9 },
      { name: "Beard Styling Mastery", students: 67, revenue: 2010, rating: 4.7 },
      { name: "Hair Color Fundamentals", students: 54, revenue: 1620, rating: 4.8 }
    ],
    summary: {
      totalStudents: 210,
      totalRevenue: 6300,
      avgRating: 4.8,
      completionRate: 87
    }
  }
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

interface AnalyticsDashboardProps {
  userRole: string;
}

export function AnalyticsDashboard({ userRole }: AnalyticsDashboardProps) {
  const data = mockAnalyticsData[userRole as keyof typeof mockAnalyticsData];
  
  if (!data) return <div className="text-center text-muted-foreground">Analytics dashboard coming soon</div>;

  const renderHubAnalytics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Jobs</p>
                <p className="text-2xl font-bold">{'totalJobs' in data.summary ? data.summary.totalJobs : 0}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Views</p>
                <p className="text-2xl font-bold">{'totalViews' in data.summary ? data.summary.totalViews : 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Applications</p>
                <p className="text-2xl font-bold">{'totalApplications' in data.summary ? data.summary.totalApplications : 0}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Response Rate</p>
                <p className="text-2xl font-bold">{'responseRate' in data.summary ? data.summary.responseRate : 0}%</p>
              </div>
              <MessageSquare className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={'jobViews' in data ? data.jobViews : []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="views" fill="#8884d8" name="Views" />
              <Bar dataKey="applications" fill="#82ca9d" name="Applications" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );

  const renderBrandAnalytics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Posts</p>
                <p className="text-2xl font-bold">{'totalPosts' in data.summary ? data.summary.totalPosts : 0}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Reach</p>
                <p className="text-2xl font-bold">{'totalReach' in data.summary ? data.summary.totalReach.toLocaleString() : '0'}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Engagement</p>
                <p className="text-2xl font-bold">{data.summary.avgEngagement}%</p>
              </div>
              <Heart className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">{data.summary.conversionRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Post Engagement Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.postEngagement}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="reach" stroke="#8884d8" name="Reach" />
              <Line type="monotone" dataKey="engagement" stroke="#82ca9d" name="Engagement" />
              <Line type="monotone" dataKey="clicks" stroke="#ffc658" name="Clicks" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );

  const renderTrainerAnalytics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{data.summary.totalStudents}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${data.summary.totalRevenue}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
                <p className="text-2xl font-bold">{data.summary.avgRating}/5</p>
              </div>
              <Heart className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">{data.summary.completionRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Content Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.contentViews}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="views" fill="#8884d8" name="Views" />
              <Bar dataKey="purchases" fill="#82ca9d" name="Purchases" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6" data-testid="analytics-dashboard">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
      </div>
      
      {userRole === 'hub' && renderHubAnalytics()}
      {userRole === 'brand' && renderBrandAnalytics()}
      {userRole === 'trainer' && renderTrainerAnalytics()}
    </div>
  );
}