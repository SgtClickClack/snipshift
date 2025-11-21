import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

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
    const colors: Record<string, string> = {
      admin: 'bg-red-600',
      business: 'bg-blue-600',
      professional: 'bg-green-600',
      trainer: 'bg-purple-600',
    };

    return (
      <Badge className={colors[role] || 'bg-gray-600'}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-red-500" />
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-gray-400">Platform management and analytics</p>
            </div>
          </div>
          <Badge variant="destructive" className="text-lg px-4 py-2">
            ADMIN MODE
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total Users</CardTitle>
              <Users className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.totalUsers.toLocaleString() || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Active Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.activeJobs.toLocaleString() || 0}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {statsLoading ? '' : `of ${stats?.totalJobs.toLocaleString() || 0} total`}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">MRR</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${statsLoading ? '...' : stats?.mrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
              <p className="text-xs text-gray-400 mt-1">Monthly Recurring Revenue</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total Volume</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${statsLoading ? '...' : stats?.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
              <p className="text-xs text-gray-400 mt-1">All-time revenue</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger value="stats" className="data-[state=active]:bg-red-600">Stats</TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-red-600">Users</TabsTrigger>
            <TabsTrigger value="jobs" className="data-[state=active]:bg-red-600">Jobs</TabsTrigger>
            <TabsTrigger value="disputes" className="data-[state=active]:bg-red-600">Disputes</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="mt-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Platform Statistics</CardTitle>
                <CardDescription>Real-time platform metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-900 rounded-lg">
                    <p className="text-sm text-gray-400">Total Users</p>
                    <p className="text-2xl font-bold">{stats?.totalUsers.toLocaleString() || 0}</p>
                  </div>
                  <div className="p-4 bg-gray-900 rounded-lg">
                    <p className="text-sm text-gray-400">Total Jobs</p>
                    <p className="text-2xl font-bold">{stats?.totalJobs.toLocaleString() || 0}</p>
                  </div>
                  <div className="p-4 bg-gray-900 rounded-lg">
                    <p className="text-sm text-gray-400">Active Jobs</p>
                    <p className="text-2xl font-bold">{stats?.activeJobs.toLocaleString() || 0}</p>
                  </div>
                  <div className="p-4 bg-gray-900 rounded-lg">
                    <p className="text-sm text-gray-400">Monthly Recurring Revenue</p>
                    <p className="text-2xl font-bold">
                      ${stats?.mrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <Card className="bg-gray-800 border-gray-700">
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
                        <tr className="border-b border-gray-700">
                          <th className="text-left p-3 text-sm font-medium text-gray-300">Name</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-300">Email</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-300">Role</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-300">Rating</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-300">Joined</th>
                          <th className="text-right p-3 text-sm font-medium text-gray-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersData?.data.map((user) => (
                          <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-900">
                            <td className="p-3">{user.name}</td>
                            <td className="p-3 text-gray-400">{user.email}</td>
                            <td className="p-3">{getRoleBadge(user.role)}</td>
                            <td className="p-3">
                              {user.averageRating ? (
                                <span>{user.averageRating.toFixed(1)} ({user.reviewCount})</span>
                              ) : (
                                <span className="text-gray-500">No ratings</span>
                              )}
                            </td>
                            <td className="p-3 text-gray-400">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {usersData && usersData.data.length === 0 && (
                      <div className="text-center py-8 text-gray-400">No users found</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jobs" className="mt-6">
            <Card className="bg-gray-800 border-gray-700">
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
                        <tr className="border-b border-gray-700">
                          <th className="text-left p-3 text-sm font-medium text-gray-300">Title</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-300">Shop</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-300">Pay Rate</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-300">Status</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-300">Date</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-300">Location</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobsData?.data.map((job) => (
                          <tr key={job.id} className="border-b border-gray-700 hover:bg-gray-900">
                            <td className="p-3 font-medium">{job.title}</td>
                            <td className="p-3 text-gray-400">{job.shopName || 'N/A'}</td>
                            <td className="p-3">{job.payRate}</td>
                            <td className="p-3">{getStatusBadge(job.status)}</td>
                            <td className="p-3 text-gray-400">{job.date}</td>
                            <td className="p-3 text-gray-400">{job.location || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {jobsData && jobsData.data.length === 0 && (
                      <div className="text-center py-8 text-gray-400">No jobs found</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="disputes" className="mt-6">
            <Card className="bg-gray-800 border-gray-700">
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
                        <tr className="border-b border-gray-700">
                          <th className="text-left p-3 text-sm font-medium text-gray-300">Reporter</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-300">Reported</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-300">Job</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-300">Reason</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-300">Description</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-300">Status</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-300">Date</th>
                          <th className="text-right p-3 text-sm font-medium text-gray-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportsData?.data.map((report) => (
                          <tr key={report.id} className="border-b border-gray-700 hover:bg-gray-900">
                            <td className="p-3">
                              <div>
                                <p className="font-medium">{report.reporter?.name || 'Unknown'}</p>
                                <p className="text-xs text-gray-400">{report.reporter?.email}</p>
                              </div>
                            </td>
                            <td className="p-3">
                              {report.reported ? (
                                <div>
                                  <p className="font-medium">{report.reported.name}</p>
                                  <p className="text-xs text-gray-400">{report.reported.email}</p>
                                </div>
                              ) : (
                                <span className="text-gray-500">N/A</span>
                              )}
                            </td>
                            <td className="p-3">
                              {report.job ? (
                                <span className="text-sm">{report.job.title}</span>
                              ) : (
                                <span className="text-gray-500">N/A</span>
                              )}
                            </td>
                            <td className="p-3">
                              <Badge variant="outline" className="capitalize">
                                {report.reason.replace('_', ' ')}
                              </Badge>
                            </td>
                            <td className="p-3 max-w-xs">
                              <p className="text-sm text-gray-300 truncate" title={report.description}>
                                {report.description}
                              </p>
                            </td>
                            <td className="p-3">{getStatusBadge(report.status)}</td>
                            <td className="p-3 text-gray-400 text-sm">
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
                                      className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleUpdateReportStatus(report.id, 'dismissed')}
                                      className="bg-gray-600 hover:bg-gray-700 text-white border-gray-600"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                {report.status !== 'pending' && (
                                  <span className="text-xs text-gray-500">
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
                      <div className="text-center py-8 text-gray-400">
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

