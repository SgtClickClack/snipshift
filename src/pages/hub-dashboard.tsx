import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Calendar, DollarSign, Users, MessageSquare, MoreVertical, Loader2 } from "lucide-react";
import { TutorialTrigger } from "@/components/onboarding/tutorial-overlay";
import DashboardStats from "@/components/dashboard/dashboard-stats";
import QuickActions from "@/components/dashboard/quick-actions";
import { format } from "date-fns";
import { createShift, fetchShopShifts, updateShiftStatus } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ActiveView = 'overview' | 'jobs' | 'applications' | 'profile';

export default function HubDashboard() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = (searchParams.get('view') as ActiveView) || 'overview';
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'filled' | 'completed'>('all');
  
  const setActiveView = (view: ActiveView) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('view', view);
      return newParams;
    });
  };

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: { city: "", state: "", address: "" },
    payRate: "",
    schedule: "",
    requirements: "",
    date: "",
    startTime: "",
    skillsRequired: ""
  });

  const [profileData, setProfileData] = useState({
    displayName: "",
    bio: "",
    location: "",
    avatarUrl: ""
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        displayName: user.displayName || "",
        bio: user.bio || "",
        location: user.location || "",
        avatarUrl: user.avatarUrl || user.profileImageURL || user.profileImage || ""
      });
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      const res = await apiRequest("PUT", "/api/me", data);
      return res.json();
    },
    onSuccess: async () => {
      toast({
        title: "Profile updated successfully",
        description: "Your shop profile information has been updated."
      });
      await refreshUser();
    },
    onError: (error) => {
      console.error("Failed to update profile:", error);
      toast({
        title: "Update Failed",
        description: "Could not update profile information",
        variant: "destructive"
      });
    }
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const { data: applications = [], isLoading: isLoadingApplications } = useQuery({
    queryKey: ['/api/applications'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/applications");
      return res.json();
    },
    enabled: activeView === 'applications'
  });

  const { data: jobs = [], isLoading } = useQuery<any[]>({
    queryKey: ['shop-shifts', user?.id],
    queryFn: () => fetchShopShifts(user!.id),
    enabled: !!user?.id,
  });

  const createJobMutation = useMutation({
    mutationFn: async (jobData: any) => {
      // Transform data for Shift API compatibility
      // Construct ISO timestamps for start and end
      const dateStr = jobData.date;
      const startTimeStr = jobData.startTime;
      
      let startTimeISO = new Date().toISOString();
      let endTimeISO = new Date().toISOString();

      if (dateStr && startTimeStr) {
        const start = new Date(`${dateStr}T${startTimeStr}`);
        startTimeISO = start.toISOString();
        // Default to 8 hour shift
        const end = new Date(start.getTime() + 8 * 60 * 60 * 1000);
        endTimeISO = end.toISOString();
      }

      const payload = {
        title: jobData.title,
        description: jobData.description,
        hourlyRate: jobData.payRate,
        startTime: startTimeISO,
        endTime: endTimeISO,
        location: [jobData.location.address, jobData.location.city, jobData.location.state].filter(Boolean).join(', '),
        status: 'open',
        // Legacy/Additional fields if needed by backend wrapper, 
        // but createShift in api.ts handles the raw request
      };

      return createShift(payload);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shift posted successfully!"
      });
      queryClient.invalidateQueries({ queryKey: ['shop-shifts', user?.id] });
      setFormData({
        title: "",
        description: "",
        location: { city: "", state: "", address: "" },
        payRate: "",
        schedule: "",
        requirements: "",
        date: "",
        startTime: "",
        skillsRequired: ""
      });
      setShowForm(false);
    },
    onError: (error) => {
      console.error("Failed to post shift:", error);
      toast({
        title: "Error", 
        description: "Failed to post shift. Please try again.",
        variant: "destructive"
      });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'open' | 'filled' | 'completed' }) => {
      return updateShiftStatus(id, status);
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "Shift status has been updated successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['shop-shifts', user?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update status.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    createJobMutation.mutate(formData);
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'post-job':
        // Switch to the 'jobs' view first
        setActiveView('jobs');
        setStatusFilter('all');
        // Then open the form
        setShowForm(true);
        break;
      case 'view-applications':
        setActiveView('applications');
        break;
      case 'manage-jobs':
        setActiveView('jobs');
        setStatusFilter('all');
        break;
      case 'open-messages':
        // Messages is a separate page in the app router
        window.location.href = '/messages';
        break;
      case 'profile-settings':
        setActiveView('profile');
        break;
      default:
        break;
    }
  };

  const handleStatClick = (action: string) => {
    switch (action) {
      case 'jobs':
        setActiveView('jobs');
        setStatusFilter('open');
        break;
      case 'applications':
        setActiveView('applications');
        break;
      case 'messages':
        window.location.href = '/messages';
        break;
      case 'hires':
        setActiveView('jobs');
        break;
      default:
        break;
    }
  };

  const { data: dashboardStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/analytics/dashboard");
      return res.json();
    },
    enabled: !!user,
  });

  // Use API data for stats, but prefer local jobs calculation for consistency with the list view
  const openJobsCount = jobs.filter(job => job.status === 'open').length;
  
  const stats = {
    ...(dashboardStats?.summary || {}),
    openJobs: openJobsCount, // Override with local calculation
    totalApplications: dashboardStats?.summary?.totalApplications ?? jobs.reduce((sum, job) => sum + (job.applicationCount || 0), 0),
    unreadMessages: dashboardStats?.summary?.unreadMessages ?? 0,
    monthlyHires: dashboardStats?.summary?.monthlyHires ?? 0
  };

  if (!user || (user.currentRole !== "hub" && user.currentRole !== "business")) {
    return <div>Access denied</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard Header */}
      <div className="bg-white/95 backdrop-blur-sm shadow-lg border-b-2 border-steel-300/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-steel-900">Business Dashboard</h1>
              <p className="text-steel-600">{user.displayName || user.email}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <TutorialTrigger />
              <Button 
                onClick={() => handleQuickAction('open-messages')}
                className="bg-gradient-to-r from-steel-700 to-steel-800 hover:from-steel-800 hover:to-steel-900 text-white shadow-md hover:shadow-lg transition-all duration-200"
                data-testid="button-open-messages"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Messages
              </Button>
              <Button 
                onClick={() => handleQuickAction('post-job')}
                className="bg-gradient-to-r from-red-accent to-red-accent-dark hover:from-red-accent-light hover:to-red-accent text-white shadow-lg hover:shadow-xl transition-all duration-200"
                data-testid="button-post-job"
              >
                <Plus className="mr-2 h-4 w-4" />
                Post New Job
              </Button>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex space-x-8 mt-4">
            <button
              onClick={() => setActiveView('overview')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                activeView === 'overview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
              data-testid="tab-overview"
            >
              Overview
            </button>
            <button
              onClick={() => setActiveView('jobs')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                activeView === 'jobs'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
              data-testid="tab-jobs"
            >
              Jobs ({jobs.length})
            </button>
            <button
              onClick={() => setActiveView('applications')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                activeView === 'applications'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
              data-testid="tab-applications"
            >
              Applications ({stats.totalApplications})
            </button>
            <button
              onClick={() => setActiveView('profile')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                activeView === 'profile'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
              data-testid="tab-profile"
            >
              Profile
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeView === 'overview' && (
          <div className="space-y-6">
            {/* Dashboard Stats */}
            <DashboardStats role="hub" stats={stats} onStatClick={handleStatClick} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {/* Quick Actions */}
              <QuickActions role="hub" onAction={handleQuickAction} />
              
              <div className="lg:col-span-2">
                <Card className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  <CardHeader className="bg-white border-b border-gray-100">
                    <CardTitle className="text-gray-900">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {jobs.slice(0, 3).map((job) => (
                        <div 
                          key={job.id} 
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => navigate(`/jobs/${job.id}`)}
                        >
                          <div>
                            <h4 className="font-medium">{job.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {job.applicants?.length || 0} applications • Posted {format(new Date(job.createdAt), "MMM d")}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            job.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-steel-100 text-steel-800'
                          }`}>
                            {job.status}
                          </span>
                        </div>
                      ))}
                      {jobs.length === 0 && (
                        <p className="text-muted-foreground text-center py-4">
                          No recent activity. Post your first job to get started!
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
        
        {/* Jobs Tab */}
        {activeView === 'jobs' && (
          <div>
            {!showForm && (
              <div className="mb-6 flex justify-between items-center">
                <div className="flex gap-2">
                  <Button 
                    variant={statusFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('all')}
                    size="sm"
                  >
                    All
                  </Button>
                  <Button 
                    variant={statusFilter === 'open' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('open')}
                    size="sm"
                    className={statusFilter === 'open' ? 'bg-green-600 hover:bg-green-700' : ''}
                  >
                    Open
                  </Button>
                  <Button 
                    variant={statusFilter === 'filled' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('filled')}
                    size="sm"
                  >
                    Filled
                  </Button>
                  <Button 
                    variant={statusFilter === 'completed' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('completed')}
                    size="sm"
                  >
                    Completed
                  </Button>
                </div>
                <Button 
                  onClick={() => setShowForm(true)}
                  className="bg-primary hover:bg-blue-700"
                  data-testid="button-show-job-form"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Post New Job
                </Button>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
              {/* Post Job Form */}
              {showForm && (
                <div className="lg:col-span-1">
                  <Card className="bg-white rounded-lg border border-gray-200 shadow-sm">
                    <CardHeader className="border-b border-gray-100">
                      <div className="flex justify-between items-center">
                        <CardTitle>Post a New Job</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowForm(false)}
                          data-testid="button-close-job-form"
                        >
                          ✕
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="title">Job Title</Label>
                          <Input
                            id="title"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., Weekend Barber Needed"
                            data-testid="input-job-title"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe the role and requirements..."
                            data-testid="input-job-description"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="date">Date</Label>
                            <Input
                              id="date"
                              type="date"
                              required
                              value={formData.date}
                              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                              data-testid="input-job-date"
                            />
                          </div>
                          <div>
                            <Label htmlFor="startTime">Start Time</Label>
                            <Input
                              id="startTime"
                              type="time"
                              required
                              value={formData.startTime}
                              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                              data-testid="input-job-start-time"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="skills">Skills Required (comma-separated)</Label>
                          <Input
                            id="skills"
                            value={formData.skillsRequired}
                            onChange={(e) => setFormData({ ...formData, skillsRequired: e.target.value })}
                            placeholder="e.g., Hair cutting, Beard trimming, Color"
                            data-testid="input-job-skills"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="payRate">Pay Rate</Label>
                            <Input
                              id="payRate"
                              type="number"
                              step="0.01"
                              required
                              value={formData.payRate}
                              onChange={(e) => setFormData({ ...formData, payRate: e.target.value })}
                              placeholder="0.00"
                              data-testid="input-job-pay"
                            />
                          </div>
                          <div>
                            <Label htmlFor="city">City</Label>
                            <Input
                              id="city"
                              required
                              value={formData.location.city}
                              onChange={(e) => setFormData({ 
                                ...formData, 
                                location: { ...formData.location, city: e.target.value }
                              })}
                              placeholder="City"
                              data-testid="input-job-city"
                            />
                          </div>
                        </div>
                        
                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={createJobMutation.isPending}
                          data-testid="button-submit-job"
                        >
                          {createJobMutation.isPending ? "Posting..." : "Post Job"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Posted Jobs List */}
              <div className={showForm ? "lg:col-span-2" : "lg:col-span-3"}>
                <Card className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  <CardHeader className="border-b border-gray-100">
                    <CardTitle>Your Posted Jobs {statusFilter !== 'all' && <span className="text-sm font-normal text-muted-foreground capitalize">({statusFilter})</span>}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {isLoading ? (
                      <div data-testid="text-loading">Loading jobs...</div>
                    ) : jobs.filter(job => statusFilter === 'all' || job.status === statusFilter).length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-neutral-600" data-testid="text-no-jobs">
                          {statusFilter === 'all' ? "No jobs posted yet." : `No ${statusFilter} jobs found.`}
                        </p>
                        {statusFilter === 'all' && (
                          <Button 
                            onClick={() => setShowForm(true)}
                            className="mt-4"
                            variant="outline"
                            data-testid="button-post-first-job"
                          >
                            Post Your First Job
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {jobs.filter(job => statusFilter === 'all' || job.status === statusFilter).map((job) => (
                          <Card key={job.id} className="border border-neutral-200" data-testid={`card-job-${job.id}`}>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-3">
                                <h4 
                                  className="font-semibold text-neutral-900 hover:text-primary cursor-pointer transition-colors" 
                                  data-testid={`text-job-title-${job.id}`}
                                  onClick={() => navigate(`/jobs/${job.id}`)}
                                >
                                  {job.title}
                                </h4>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-auto p-0 hover:bg-transparent" data-testid={`status-badge-trigger-${job.id}`}>
                                      <span 
                                        className={`px-3 py-1 rounded-full text-sm font-medium cursor-pointer ${
                                          job.status === 'open' ? 'bg-success text-white' : 
                                          job.status === 'filled' ? 'bg-blue-500 text-white' :
                                          'bg-neutral-200 text-neutral-700'
                                        }`}
                                        data-testid={`status-job-${job.id}`}
                                      >
                                        {job.status}
                                      </span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: job.id, status: 'open' })}>
                                      Mark as Open
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: job.id, status: 'filled' })}>
                                      Mark as Filled
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: job.id, status: 'completed' })}>
                                      Mark as Completed
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              <div className="grid sm:grid-cols-3 gap-4 text-sm text-neutral-600 mb-3">
                                <div className="flex items-center">
                                  <Calendar className="mr-2 h-4 w-4 text-primary" />
                                  <span data-testid={`text-job-date-${job.id}`}>
                                    {format(new Date(job.date), "EEE, MMM d, yyyy")}
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <DollarSign className="mr-2 h-4 w-4 text-primary" />
                                  <span data-testid={`text-job-pay-${job.id}`}>
                                    ${job.payRate}/hr
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <Users className="mr-2 h-4 w-4 text-primary" />
                                  <span data-testid={`text-job-applicants-${job.id}`}>
                                    {job.applicationCount || 0} applicants
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm text-neutral-600 mb-2" data-testid={`text-job-description-${job.id}`}>
                                {job.description}
                              </p>
                              {job.skillsRequired && job.skillsRequired.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {job.skillsRequired.map((skill: any, index: number) => (
                                    <span 
                                      key={`${skill}-${index}`}
                                      className="bg-primary/10 text-primary px-2 py-1 rounded text-xs"
                                      data-testid={`tag-skill-${job.id}-${index}`}
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
        
        {/* Applications Tab */}
        {activeView === 'applications' && (
          <div className="space-y-6">
            <Card className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-100">
                <CardTitle>Job Applications</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {isLoadingApplications ? (
                   <div className="text-center py-8 text-muted-foreground">Loading applications...</div>
                ) : applications.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mb-4 bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                       <Users className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No applications yet</h3>
                    <p className="text-muted-foreground mt-1">When professionals apply to your jobs, they will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                     {applications.map((app: any) => (
                        <div key={app.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                           <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                              <div>
                                 <h3 className="font-medium text-lg">{app.name}</h3>
                                 <p className="text-sm text-muted-foreground">{app.email}</p>
                                 <div className="mt-2 text-sm text-muted-foreground">
                                    Applying for: <span className="font-medium text-foreground">{app.job?.title || app.shift?.title || 'Unknown Position'}</span>
                                 </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                                  app.status === 'accepted' ? 'bg-green-100 text-green-800' : 
                                  app.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                   {app.status}
                                </span>
                              </div>
                           </div>
                           {app.coverLetter && (
                              <div className="mt-4 text-sm bg-white p-3 rounded border text-gray-700 italic">
                                 "{app.coverLetter}"
                              </div>
                           )}
                           <div className="mt-3 pt-3 border-t text-xs text-gray-400 flex justify-between items-center">
                              <span>Applied on {new Date(app.appliedAt).toLocaleDateString()}</span>
                              {/* Future: Add Accept/Reject buttons here */}
                           </div>
                        </div>
                     ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Profile Tab */}
        {activeView === 'profile' && (
          <div className="max-w-4xl">
            <Card className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-100">
                <CardTitle>Profile Settings</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business Name</Label>
                      <Input
                        id="businessName"
                        value={profileData.displayName}
                        onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                        placeholder="Enter your business name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio / Description</Label>
                      <Textarea
                        id="bio"
                        value={profileData.bio}
                        onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                        placeholder="Tell us about your business..."
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={profileData.location}
                        onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                        placeholder="e.g., New York, NY"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="avatarUrl">Profile Image URL</Label>
                      <Input
                        id="avatarUrl"
                        value={profileData.avatarUrl}
                        onChange={(e) => setProfileData({ ...profileData, avatarUrl: e.target.value })}
                        placeholder="https://..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Provide a URL for your business logo or profile image.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button 
                      type="submit" 
                      disabled={updateProfileMutation.isPending}
                      className="min-w-[120px]"
                    >
                      {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}