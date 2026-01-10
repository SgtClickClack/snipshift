import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Shield, Users, Briefcase, DollarSign, AlertTriangle, Trash2, CheckCircle2, XCircle, Ban, UserCheck, TrendingUp, Activity, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface AdminStats {
  totalUsers: number;
  totalJobs: number;
  activeJobs: number;
  totalRevenue: number;
  mrr: number;
}

interface AdminMetrics {
  revenue: {
    totalCommission: number;
    commissionThisMonth: number;
  };
  users: {
    total: number;
    shops: number;
    barbers: number;
  };
  shifts: {
    completed: number;
  };
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  stripeAccountId: string | null;
  stripeOnboardingComplete: boolean;
  createdAt: string;
  averageRating: number | null;
  reviewCount: number;
}

interface Job {
  id: string;
  title: string;
  shopName: string | null;
  payRate: string;
  status: string;
  date: string;
  location: string | undefined;
  businessId: string;
  createdAt: string;
}

interface Report {
  id: string;
  reporterId: string;
  reporter: {
    id: string;
    name: string;
    email: string;
  } | null;
  reportedId: string | null;
  reported: {
    id: string;
    name: string;
    email: string;
  } | null;
  jobId: string | null;
  job: {
    id: string;
    title: string;
  } | null;
  reason: string;
  description: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
  updatedAt: string;
}

interface PendingRsaVerification {
  userId: string;
  email: string;
  name: string;
  rsaExpiry: string | null;
  rsaStateOfIssue: string | null;
  rsaCertUrl: string | null;
  updatedAt: string | null;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('stats');

  // Fetch admin stats (legacy)
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<AdminStats>({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/stats');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch admin metrics (new comprehensive endpoint)
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery<AdminMetrics>({
    queryKey: ['admin', 'metrics'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/metrics');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch users
  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery<{
    data: User[];
    total: number;
    limit: number;
    offset: number;
  }>({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/users?limit=100');
      return response.json();
    },
    enabled: activeTab === 'users',
  });

  // Fetch jobs
  const { data: jobsData, isLoading: jobsLoading, refetch: refetchJobs } = useQuery<{
    data: Job[];
    total: number;
    limit: number;
    offset: number;
  }>({
    queryKey: ['admin', 'jobs'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/jobs?limit=100');
      return response.json();
    },
    enabled: activeTab === 'jobs',
  });

  // Fetch reports
  const { data: reportsData, isLoading: reportsLoading, refetch: refetchReports } = useQuery<{
    data: Report[];
    total: number;
    limit: number;
    offset: number;
  }>({
    queryKey: ['admin', 'reports'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/reports?limit=100');
      return response.json();
    },
    enabled: activeTab === 'disputes',
  });

  const {
    data: rsaData,
    isLoading: rsaLoading,
    refetch: refetchRsa,
  } = useQuery<{
    data: PendingRsaVerification[];
    total: number;
    limit: number;
    offset: number;
  }>({
    queryKey: ['admin', 'rsa', 'pending'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/rsa/pending?limit=100');
      return response.json();
    },
    enabled: activeTab === 'rsa',
  });

  const handleVerifyRsa = async (userId: string, verified: boolean) => {
    try {
      await apiRequest('PATCH', `/api/admin/rsa/${userId}/verify`, { verified });

      toast({
        title: verified ? 'RSA verified' : 'RSA unverified',
        description: verified
          ? 'Staff can now browse shifts.'
          : 'Staff will be locked from browsing shifts.',
      });

      refetchRsa();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update RSA verification.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateReportStatus = async (reportId: string, status: 'resolved' | 'dismissed') => {
    try {
      await apiRequest('PATCH', `/api/admin/reports/${reportId}/status`, { status });

      toast({
        title: 'Report updated',
        description: `Report has been ${status}.`,
      });

      refetchReports();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update report.',
        variant: 'destructive',
      });
    }
  };

  const handleBanUser = async (userId: string) => {
    try {
      await apiRequest('POST', `/api/admin/users/${userId}/ban`);

      toast({
        title: 'User banned',
        description: 'User has been banned and their sessions revoked.',
      });

      refetchUsers();
      refetchMetrics();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to ban user.',
        variant: 'destructive',
      });
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      await apiRequest('POST', `/api/admin/users/${userId}/unban`);

      toast({
        title: 'User unbanned',
        description: 'User has been unbanned successfully.',
      });

      refetchUsers();
      refetchMetrics();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to unban user.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await apiRequest('DELETE', `/api/admin/users/${userId}`);

      toast({
        title: 'User deleted',
        description: 'User has been successfully deleted.',
      });

      refetchUsers();
      refetchStats();
      refetchMetrics();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete user.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      open: 'default',
      filled: 'secondary',
      closed: 'outline',
      completed: 'default',
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      admin: 'destructive',
      business: 'default',
      professional: 'secondary',
      trainer: 'outline',
    };

    return (
      <Badge variant={variants[role] || 'outline'}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Platform management and analytics</p>
            </div>
          </div>
          <Badge variant="destructive" className="text-lg px-4 py-2">
            ADMIN MODE
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-red-500/20 bg-red-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-wrap gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Commission</CardTitle>
              <TrendingUp className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                ${metricsLoading ? '...' : metrics?.revenue.totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">All-time platform revenue</p>
            </CardContent>
          </Card>

          <Card className="border-green-500/20 bg-green-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-wrap gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                ${metricsLoading ? '...' : metrics?.revenue.commissionThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Commission this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-wrap gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metricsLoading ? '...' : metrics?.users.total.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metricsLoading ? '' : `${metrics?.users.shops || 0} shops, ${metrics?.users.barbers || 0} barbers`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-wrap gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed Shifts</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metricsLoading ? '...' : metrics?.shifts.completed.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total completed shifts</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="rsa">
              RSA Review
              {rsaData?.total ? (
                <Badge variant="secondary" className="ml-2">
                  {rsaData.total}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="jobs">Jobs</TabsTrigger>
            <TabsTrigger value="disputes">Disputes</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="mt-6 space-y-6">
            {/* Revenue Pulse Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Revenue Pulse
                </CardTitle>
                <CardDescription>Platform commission growth over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Revenue chart coming soon</p>
                    <p className="text-sm mt-1">Total Commission: ${metrics?.revenue.totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</p>
                    <p className="text-sm">This Month: ${metrics?.revenue.commissionThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Live stream of platform events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <div className="rounded-full bg-green-500/10 p-2">
                      <Users className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">New User Signup</p>
                      <p className="text-xs text-muted-foreground">A new user joined the platform</p>
                      <p className="text-xs text-muted-foreground mt-1">Just now</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <div className="rounded-full bg-blue-500/10 p-2">
                      <Briefcase className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">New Booking</p>
                      <p className="text-xs text-muted-foreground">A shift was completed and payment processed</p>
                      <p className="text-xs text-muted-foreground mt-1">5 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <div className="rounded-full bg-purple-500/10 p-2">
                      <DollarSign className="h-4 w-4 text-purple-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Payout Processed</p>
                      <p className="text-xs text-muted-foreground">Commission earned from completed shift</p>
                      <p className="text-xs text-muted-foreground mt-1">1 hour ago</p>
                    </div>
                  </div>
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Activity feed will show real-time events as they occur
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Platform Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Platform Statistics</CardTitle>
                <CardDescription>Real-time platform metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold">{metrics?.users.total.toLocaleString() || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {metrics?.users.shops || 0} shops, {metrics?.users.barbers || 0} barbers
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Completed Shifts</p>
                    <p className="text-2xl font-bold">{metrics?.shifts.completed.toLocaleString() || 0}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Commission</p>
                    <p className="text-2xl font-bold">
                      ${metrics?.revenue.totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">This Month</p>
                    <p className="text-2xl font-bold">
                      ${metrics?.revenue.commissionThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rsa" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>RSA Verification Queue</CardTitle>
                <CardDescription>
                  Review uploaded RSA certificates and approve staff to browse shifts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {rsaLoading ? (
                  <div className="text-center py-8">Loading RSA submissions...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Name</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Email</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Expiry</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">State</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Certificate</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Submitted</th>
                          <th className="text-right p-3 text-sm font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(rsaData?.data || []).map((item) => (
                          <tr key={item.userId} className="border-b border-border hover:bg-muted/50">
                            <td className="p-3">{item.name}</td>
                            <td className="p-3 text-muted-foreground">{item.email}</td>
                            <td className="p-3 text-muted-foreground">{item.rsaExpiry || '—'}</td>
                            <td className="p-3 text-muted-foreground">{item.rsaStateOfIssue || '—'}</td>
                            <td className="p-3">
                              {item.rsaCertUrl ? (
                                <a
                                  href={item.rsaCertUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-primary hover:underline"
                                >
                                  View <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="p-3 text-muted-foreground text-sm">
                              {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '—'}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-green-600 border-green-600 hover:bg-green-50"
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Approve RSA Verification</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will mark RSA as verified for this staff member and unlock shift browsing.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleVerifyRsa(item.userId, true)}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        Approve
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {rsaData && rsaData.data.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No pending RSA submissions.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View and manage platform users</CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="text-center py-8">Loading users...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Name</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Email</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Role</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Stripe</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Rating</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Joined</th>
                          <th className="text-right p-3 text-sm font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(usersData?.data || []).map((user) => (
                          <tr key={user.id} className="border-b border-border hover:bg-muted/50">
                            <td className="p-3">{user.name}</td>
                            <td className="p-3 text-muted-foreground">{user.email}</td>
                            <td className="p-3">{getRoleBadge(user.role)}</td>
                            <td className="p-3">
                              {user.isActive !== false ? (
                                <Badge variant="default" className="bg-green-500">Active</Badge>
                              ) : (
                                <Badge variant="destructive">Banned</Badge>
                              )}
                            </td>
                            <td className="p-3">
                              {user.stripeAccountId ? (
                                <Badge variant={user.stripeOnboardingComplete ? "default" : "secondary"}>
                                  {user.stripeOnboardingComplete ? 'Connected' : 'Pending'}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">Not connected</span>
                              )}
                            </td>
                            <td className="p-3">
                              {user.averageRating ? (
                                <span>{user.averageRating?.toFixed(1) ?? 'N/A'} ({user.reviewCount ?? 0})</span>
                              ) : (
                                <span className="text-muted-foreground">No ratings</span>
                              )}
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {user.isActive !== false ? (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-orange-600 border-orange-600 hover:bg-orange-50"
                                      >
                                        <Ban className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Ban User</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will ban the user and revoke their current sessions. They will not be able to access the platform.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleBanUser(user.id)}
                                          className="bg-orange-600 hover:bg-orange-700"
                                        >
                                          Ban User
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUnbanUser(user.id)}
                                    className="text-green-600 border-green-600 hover:bg-green-50"
                                  >
                                    <UserCheck className="h-4 w-4" />
                                  </Button>
                                )}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete the user account. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteUser(user.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete User
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {usersData && usersData.data.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">No users found</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jobs" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Job Management</CardTitle>
                <CardDescription>View and manage all job postings</CardDescription>
              </CardHeader>
              <CardContent>
                {jobsLoading ? (
                  <div className="text-center py-8">Loading jobs...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Title</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Shop</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Pay Rate</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Date</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Location</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(jobsData?.data || []).map((job) => (
                          <tr key={job.id} className="border-b border-border hover:bg-muted/50">
                            <td className="p-3 font-medium">{job.title}</td>
                            <td className="p-3 text-muted-foreground">{job.shopName || 'N/A'}</td>
                            <td className="p-3">{job.payRate}</td>
                            <td className="p-3">{getStatusBadge(job.status)}</td>
                            <td className="p-3 text-muted-foreground">{job.date}</td>
                            <td className="p-3 text-muted-foreground">{job.location || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {jobsData && jobsData.data.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">No jobs found</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="disputes" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Disputes & Reports</CardTitle>
                <CardDescription>Manage reported jobs and user disputes</CardDescription>
              </CardHeader>
              <CardContent>
                {reportsLoading ? (
                  <div className="text-center py-8">Loading reports...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Reporter</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Reported</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Job</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Reason</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Description</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Date</th>
                          <th className="text-right p-3 text-sm font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(reportsData?.data || []).map((report) => (
                          <tr key={report.id} className="border-b border-border hover:bg-muted/50">
                            <td className="p-3">
                              <div>
                                <p className="font-medium">{report.reporter?.name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">{report.reporter?.email}</p>
                              </div>
                            </td>
                            <td className="p-3">
                              {report.reported ? (
                                <div>
                                  <p className="font-medium">{report.reported.name}</p>
                                  <p className="text-xs text-muted-foreground">{report.reported.email}</p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </td>
                            <td className="p-3">
                              {report.job ? (
                                <span className="text-sm">{report.job.title}</span>
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </td>
                            <td className="p-3">
                              <Badge variant="outline" className="capitalize">
                                {report.reason.replace('_', ' ')}
                              </Badge>
                            </td>
                            <td className="p-3 max-w-xs">
                              <p className="text-sm text-muted-foreground truncate" title={report.description}>
                                {report.description}
                              </p>
                            </td>
                            <td className="p-3">{getStatusBadge(report.status)}</td>
                            <td className="p-3 text-muted-foreground text-sm">
                              {new Date(report.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {report.status === 'pending' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleUpdateReportStatus(report.id, 'resolved')}
                                      className="text-green-600 border-green-600 hover:bg-green-50"
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleUpdateReportStatus(report.id, 'dismissed')}
                                      className="text-muted-foreground border-muted-foreground hover:bg-muted"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                {report.status !== 'pending' && (
                                  <span className="text-xs text-muted-foreground">
                                    {report.status === 'resolved' ? 'Resolved' : 'Dismissed'}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {reportsData && reportsData.data.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No reports at this time</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

