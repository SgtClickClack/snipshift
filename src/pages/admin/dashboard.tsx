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
import { Shield, Users, Briefcase, DollarSign, AlertTriangle, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminStats {
  totalUsers: number;
  totalJobs: number;
  activeJobs: number;
  totalRevenue: number;
  mrr: number;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
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

export default function AdminDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('stats');

  // Fetch admin stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<AdminStats>({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/stats');
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

  const handleDeleteUser = async (userId: string) => {
    try {
      await apiRequest('DELETE', `/api/admin/users/${userId}`);

      toast({
        title: 'User deleted',
        description: 'User has been successfully deleted.',
      });

      refetchUsers();
      refetchStats();
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-wrap gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.totalUsers.toLocaleString() || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-wrap gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.activeJobs.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {statsLoading ? '' : `of ${stats?.totalJobs.toLocaleString() || 0} total`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-wrap gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">MRR</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${statsLoading ? '...' : stats?.mrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Monthly Recurring Revenue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-wrap gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Volume</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${statsLoading ? '...' : stats?.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">All-time revenue</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="jobs">Jobs</TabsTrigger>
            <TabsTrigger value="disputes">Disputes</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Statistics</CardTitle>
                <CardDescription>Real-time platform metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold">{stats?.totalUsers.toLocaleString() || 0}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Jobs</p>
                    <p className="text-2xl font-bold">{stats?.totalJobs.toLocaleString() || 0}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Active Jobs</p>
                    <p className="text-2xl font-bold">{stats?.activeJobs.toLocaleString() || 0}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Monthly Recurring Revenue</p>
                    <p className="text-2xl font-bold">
                      ${stats?.mrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </p>
                  </div>
                </div>
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
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Rating</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Joined</th>
                          <th className="text-right p-3 text-sm font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersData?.data.map((user) => (
                          <tr key={user.id} className="border-b border-border hover:bg-muted/50">
                            <td className="p-3">{user.name}</td>
                            <td className="p-3 text-muted-foreground">{user.email}</td>
                            <td className="p-3">{getRoleBadge(user.role)}</td>
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
                        {jobsData?.data.map((job) => (
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
                        {reportsData?.data.map((report) => (
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

