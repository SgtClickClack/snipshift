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
import { Plus, Calendar, DollarSign, Users, MessageSquare, MoreVertical, Loader2, Trash2, LayoutDashboard, Briefcase, User } from "lucide-react";
import ProfessionalCalendar from "@/components/calendar/professional-calendar";
import CreateShiftModal from "@/components/calendar/create-shift-modal";
import { TutorialTrigger } from "@/components/onboarding/tutorial-overlay";
import DashboardStats from "@/components/dashboard/dashboard-stats";
import { SEO } from "@/components/seo/SEO";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import ProfileHeader from "@/components/profile/profile-header";
import { format } from "date-fns";
import { createShift, fetchShopShifts, updateShiftStatus } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
} from "@/components/ui/alert-dialog";

type ActiveView = 'overview' | 'jobs' | 'applications' | 'profile' | 'calendar';

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
  const [showCreateShiftModal, setShowCreateShiftModal] = useState(false);
  const [selectedDateForShift, setSelectedDateForShift] = useState<Date | undefined>();
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
    avatarUrl: "",
    bannerUrl: ""
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => {
    if (user && !isEditingProfile) {
      // Only sync from user when not editing to avoid overwriting local changes
      setProfileData({
        displayName: user.displayName || "",
        bio: user.bio || "",
        location: user.location || "",
        avatarUrl: user.avatarUrl || user.profileImageURL || user.profileImage || "",
        bannerUrl: user.bannerUrl || user.bannerImage || ""
      });
    }
  }, [user, isEditingProfile]);

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
      setIsEditingProfile(false);
    },
    onError: (error) => {
      // console.error("Failed to update profile:", error);
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
      // Invalidate shop shifts for this user
      queryClient.invalidateQueries({ queryKey: ['shop-shifts', user?.id] });
      // Also invalidate general jobs lists to refresh the feed
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
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
      // console.error("Failed to post shift:", error);
      toast({
        title: "Error", 
        description: "Failed to post shift. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Mutation for creating shifts (including recurring)
  const createShiftMutation = useMutation({
    mutationFn: async ({ shiftData, recurringShifts }: { shiftData: any; recurringShifts?: any[] }) => {
      if (recurringShifts && recurringShifts.length > 0) {
        // Create all recurring shifts
        const promises = recurringShifts.map((shift) => {
          const payload: any = {
            title: shift.title,
            description: shift.description || shift.requirements || '',
            hourlyRate: shift.hourlyRate,
            startTime: shift.startTime.toISOString(),
            endTime: shift.endTime.toISOString(),
            location: shift.location || '',
            status: shift.status || 'open',
          };
          // Add recurring metadata if present
          if (shift.recurringSeriesId) {
            payload.recurringSeriesId = shift.recurringSeriesId;
          }
          if (shift.isRecurring !== undefined) {
            payload.isRecurring = shift.isRecurring;
          }
          if (shift.recurringIndex !== undefined) {
            payload.recurringIndex = shift.recurringIndex;
          }
          return createShift(payload);
        });
        return Promise.all(promises);
      } else {
        // Single shift
        const payload = {
          title: shiftData.title,
          description: shiftData.description || shiftData.requirements || '',
          hourlyRate: shiftData.hourlyRate,
          startTime: shiftData.startTime.toISOString(),
          endTime: shiftData.endTime.toISOString(),
          location: shiftData.location || '',
          status: shiftData.status || 'open',
        };
        return [await createShift(payload)];
      }
    },
    onSuccess: (results) => {
      const count = results.length;
      toast({
        title: "Success",
        description: count > 1 
          ? `${count} recurring shifts created successfully!`
          : "Shift created successfully!"
      });
      queryClient.invalidateQueries({ queryKey: ['shop-shifts', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      setShowCreateShiftModal(false);
      setSelectedDateForShift(undefined);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create shift(s). Please try again.",
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

  const deleteItemMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'shift' | 'job' }) => {
      const endpoint = type === 'shift' ? `/api/shifts/${id}` : `/api/jobs/${id}`;
      const res = await apiRequest("DELETE", endpoint);
      // Jobs endpoint returns 204 No Content, shifts returns JSON
      if (res.status === 204) {
        return { success: true, type };
      }
      return { ...res.json(), type };
    },
    onSuccess: (data) => {
      // Always invalidate shop shifts
      queryClient.invalidateQueries({ queryKey: ['shop-shifts', user?.id] });
      // If deleting a job, also invalidate jobs lists
      if (data?.type === 'job') {
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
        queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
        queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      }
      toast({
        title: "Deleted",
        description: "The item has been removed and all applications have been cancelled.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: "Could not delete item. Please try again.",
        variant: "destructive",
      });
    },
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
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO title="Business Dashboard" />
      
      {/* Banner/Profile Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardHeader
          bannerImage={user?.bannerUrl || user?.bannerImage}
          profileImage={user?.avatarUrl || user?.photoURL || user?.profileImageURL || user?.profileImage}
          title={user?.displayName || "Business Dashboard"}
          subtitle={user?.email}
          editable={isEditingProfile}
          onBannerUpload={isEditingProfile ? (url) => {
            // DashboardHeader already calls API and saves to DB
            // Just update local state for immediate UI update
            setProfileData(prev => ({ ...prev, bannerUrl: url }));
            // Refresh user in background without blocking
            refreshUser().catch(err => console.error('Failed to refresh user:', err));
          } : undefined}
          onLogoUpload={isEditingProfile ? (url) => {
            // DashboardHeader already calls API and saves to DB
            // Just update local state for immediate UI update
            setProfileData(prev => ({ ...prev, avatarUrl: url }));
            // Refresh user in background without blocking
            refreshUser().catch(err => console.error('Failed to refresh user:', err));
          } : undefined}
        />
      </div>

      {/* Dashboard Header */}
      <div className="bg-card/95 backdrop-blur-sm shadow-lg border-b-2 border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Business Dashboard</h1>
              <p className="text-muted-foreground">{user.displayName || user.email}</p>
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
          <div className="flex justify-between md:justify-start md:space-x-8 pb-2 md:pb-0 mt-4 overflow-x-hidden">
            <button
              onClick={() => setActiveView('overview')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 py-2 px-2 md:px-1 pb-3 border-b-2 font-medium text-sm ${
                activeView === 'overview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-steel-500 hover:text-steel-700 dark:text-steel-400 dark:hover:text-steel-300'
              }`}
              data-testid="tab-overview"
            >
              <LayoutDashboard className="h-5 w-5 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden md:inline">Overview</span>
            </button>
            <button
              onClick={() => setActiveView('jobs')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 py-2 px-2 md:px-1 pb-3 border-b-2 font-medium text-sm ${
                activeView === 'jobs'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-steel-500 hover:text-steel-700 dark:text-steel-400 dark:hover:text-steel-300'
              }`}
              data-testid="tab-jobs"
            >
              <Briefcase className="h-5 w-5 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden md:inline">Jobs</span>
              <span className="hidden md:inline text-muted-foreground">({jobs.length})</span>
            </button>
            <button
              onClick={() => setActiveView('applications')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 py-2 px-2 md:px-1 pb-3 border-b-2 font-medium text-sm ${
                activeView === 'applications'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-steel-500 hover:text-steel-700 dark:text-steel-400 dark:hover:text-steel-300'
              }`}
              data-testid="tab-applications"
            >
              <Users className="h-5 w-5 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden md:inline">Applications</span>
              <span className="hidden md:inline text-muted-foreground">({stats.totalApplications})</span>
            </button>
            <button
              onClick={() => setActiveView('calendar')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 py-2 px-2 md:px-1 pb-3 border-b-2 font-medium text-sm ${
                activeView === 'calendar'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-steel-500 hover:text-steel-700 dark:text-steel-400 dark:hover:text-steel-300'
              }`}
              data-testid="tab-calendar"
            >
              <Calendar className="h-5 w-5 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden md:inline">Calendar</span>
            </button>
            <button
              onClick={() => setActiveView('profile')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 py-2 px-2 md:px-1 pb-3 border-b-2 font-medium text-sm ${
                activeView === 'profile'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-steel-500 hover:text-steel-700 dark:text-steel-400 dark:hover:text-steel-300'
              }`}
              data-testid="tab-profile"
            >
              <User className="h-5 w-5 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden md:inline">Profile</span>
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
            
            <Card className="bg-card rounded-lg border border-border shadow-sm">
              <CardHeader className="bg-card border-b border-border">
                <CardTitle className="text-foreground">Recent Activity</CardTitle>
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
                  <Card className="bg-card rounded-lg border border-border shadow-sm">
                    <CardHeader className="border-b border-border">
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
                <Card className="bg-card rounded-lg border border-border shadow-sm">
                  <CardHeader className="border-b border-border">
                    <CardTitle>Your Posted Jobs {statusFilter !== 'all' && <span className="text-sm font-normal text-muted-foreground capitalize">({statusFilter})</span>}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8" data-testid="text-loading">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
                        <span className="text-muted-foreground">Loading jobs...</span>
                      </div>
                    ) : jobs.filter(job => statusFilter === 'all' || job.status === statusFilter).length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground" data-testid="text-no-jobs">
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
                        {jobs.filter(job => statusFilter === 'all' || job.status === statusFilter).map((job) => {
                          const jobType = (job as any)._type || 'job';
                          const isShift = jobType === 'shift';
                          // Check ownership: shifts use employerId, jobs use businessId
                          const isOwner = isShift 
                            ? (job as any).employerId === user?.id
                            : (job as any).businessId === user?.id;
                          return (
                          <Card key={job.id} className="border border-border" data-testid={`card-job-${job.id}`}>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-3">
                                <h4 
                                  className="font-semibold text-foreground hover:text-primary cursor-pointer transition-colors" 
                                  data-testid={`text-job-title-${job.id}`}
                                  onClick={() => navigate(`/jobs/${job.id}`)}
                                >
                                  {job.title}
                                </h4>
                                <div className="flex items-center gap-2">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-auto p-0 hover:bg-transparent" data-testid={`status-badge-trigger-${job.id}`}>
                                        <span 
                                          className={`px-3 py-1 rounded-full text-sm font-medium cursor-pointer ${
                                            job.status === 'open' ? 'bg-success text-white' : 
                                            job.status === 'filled' ? 'bg-blue-500 text-white' :
                                            'bg-muted text-muted-foreground'
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
                                  {isOwner && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          className="h-8 w-8 p-0"
                                          disabled={deleteItemMutation.isPending && deleteItemMutation.variables?.id === job.id}
                                        >
                                          {deleteItemMutation.isPending && deleteItemMutation.variables?.id === job.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <Trash2 className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This will remove the {isShift ? 'shift' : 'job'} and cancel all applications. This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => deleteItemMutation.mutate({ id: job.id, type: jobType as 'shift' | 'job' })}
                                            className="bg-red-600 hover:bg-red-700"
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </div>
                              </div>
                              <div className="grid sm:grid-cols-3 gap-4 text-sm text-muted-foreground mb-3">
                                <div className="flex items-center">
                                  <Calendar className="mr-2 h-4 w-4 text-primary" />
                                  <span data-testid={`text-job-date-${job.id}`}>
                                    {job.date ? (() => {
                                      try {
                                        const date = new Date(job.date);
                                        return isNaN(date.getTime()) ? 'Date TBD' : format(date, "EEE, MMM d, yyyy");
                                      } catch {
                                        return 'Date TBD';
                                      }
                                    })() : 'Date TBD'}
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
                              <p className="text-sm text-muted-foreground mb-2" data-testid={`text-job-description-${job.id}`}>
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
                          );
                        })}
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
            <Card className="bg-card rounded-lg border border-border shadow-sm">
              <CardHeader className="border-b border-border">
                <CardTitle>Job Applications</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {isLoadingApplications ? (
                   <div className="text-center py-8 text-muted-foreground">Loading applications...</div>
                ) : applications.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mb-4 bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                       <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground">No applications yet</h3>
                    <p className="text-muted-foreground mt-1">When professionals apply to your jobs, they will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                     {applications.map((app: any) => (
                        <div key={app.id} className="border rounded-lg p-4 hover:bg-muted transition-colors">
                           <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                              <div className="flex-1 min-w-0">
                                 <h3 className="font-medium text-lg break-words overflow-hidden">{app.name}</h3>
                                 <p className="text-sm text-muted-foreground break-all">{app.email}</p>
                                 <div className="mt-2 text-sm text-muted-foreground">
                                    Applying for: <span className="font-medium text-foreground break-words">{app.job?.title || app.shift?.title || 'Unknown Position'}</span>
                                 </div>
                                 {(!app.job && !app.shift) && (
                                   <p className="text-xs text-amber-600 mt-1">⚠️ Original job/shift may have been deleted</p>
                                 )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                                  app.status === 'accepted' ? 'bg-green-100 text-green-800' : 
                                  app.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                                  'bg-muted text-foreground'
                                }`}>
                                   {app.status}
                                </span>
                              </div>
                           </div>
                           {app.coverLetter && (
                              <div className="mt-4 text-sm bg-card p-3 rounded border text-muted-foreground italic break-words overflow-hidden">
                                 "{app.coverLetter}"
                              </div>
                           )}
                           <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex justify-between items-center">
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
        
        {/* Calendar Tab */}
        {activeView === 'calendar' && (
          <ProfessionalCalendar
            bookings={jobs.map((job) => {
              // Map job/shift to booking format expected by calendar
              const bookingData: any = {
                id: job.id,
                status: job.status === 'draft' ? 'draft' : 
                        job.status === 'invited' ? 'invited' :
                        job.status === 'open' ? 'pending' : 
                        job.status === 'filled' ? 'confirmed' : 'completed',
                appliedAt: job.createdAt,
              };
              
              // Add job or shift based on type
              if (job._type === 'shift') {
                bookingData.shift = {
                  id: job.id,
                  title: job.title,
                  date: job.date,
                  startTime: job.startTime,
                  endTime: job.endTime,
                  status: job.status,
                  hourlyRate: job.payRate,
                  location: typeof job.location === 'string' ? job.location : job.location?.address || '',
                  assignedStaff: (job as any).assignedStaff || null,
                };
              } else {
                bookingData.job = {
                  id: job.id,
                  title: job.title,
                  date: job.date,
                  startTime: job.startTime,
                  endTime: job.endTime,
                  status: job.status,
                  payRate: job.payRate,
                  address: typeof job.location === 'string' ? job.location : job.location?.address || '',
                  description: job.description,
                  assignedStaff: (job as any).assignedStaff || null,
                };
              }
              
              return bookingData;
            })}
            isLoading={isLoading}
            mode="business"
            onCreateShift={() => {
              setShowCreateShiftModal(true);
            }}
          />
        )}
        
        {/* Profile Tab */}
        {activeView === 'profile' && (
          <div className="max-w-4xl">
            <Card className="bg-card rounded-lg border border-border shadow-sm">
              <CardContent className="p-0">
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  {/* Profile Header with Banner and Avatar */}
                  <div className="relative overflow-visible z-0">
                    <ProfileHeader
                      bannerUrl={profileData.bannerUrl}
                      avatarUrl={profileData.avatarUrl}
                      displayName={profileData.displayName || user?.displayName || 'Business'}
                      editable={isEditingProfile}
                      onBannerUpload={isEditingProfile ? (url) => {
                        // ProfileHeader already calls API and saves to DB
                        // Just update local state for immediate UI update
                        setProfileData(prev => ({ ...prev, bannerUrl: url }));
                        // Refresh user in background without blocking
                        refreshUser().catch(err => console.error('Failed to refresh user:', err));
                      } : undefined}
                      onAvatarUpload={isEditingProfile ? (url) => {
                        // ProfileHeader already calls API and saves to DB
                        // Just update local state for immediate UI update
                        setProfileData(prev => ({ ...prev, avatarUrl: url }));
                        // Refresh user in background without blocking
                        refreshUser().catch(err => console.error('Failed to refresh user:', err));
                      } : undefined}
                    />
                  </div>
                  
                  {/* Title and Edit Button - positioned below banner with padding for avatar */}
                  <div className="px-6 pt-20 md:pt-24 pb-4">
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Profile Settings
                      </CardTitle>
                      <div className="flex gap-2">
                        {!isEditingProfile ? (
                          <Button onClick={() => setIsEditingProfile(true)} variant="outline" data-testid="button-edit-profile">
                            Edit Profile
                          </Button>
                        ) : (
                          <>
                            <Button onClick={() => setIsEditingProfile(false)} variant="outline" data-testid="button-cancel-edit">
                              Cancel
                            </Button>
                            <Button type="submit" disabled={updateProfileMutation.isPending} data-testid="button-save-profile">
                              {updateProfileMutation.isPending ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                'Save'
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Form fields */}
                  <div className="px-6 pb-6">
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="businessName">Business Name</Label>
                        <Input
                          id="businessName"
                          value={profileData.displayName}
                          onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                          placeholder="Enter your business name"
                          disabled={!isEditingProfile}
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
                          disabled={!isEditingProfile}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={profileData.location}
                          onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                          placeholder="e.g., New York, NY"
                          disabled={!isEditingProfile}
                        />
                      </div>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Create Shift Modal */}
      <CreateShiftModal
        isOpen={showCreateShiftModal}
        onClose={() => {
          setShowCreateShiftModal(false);
          setSelectedDateForShift(undefined);
        }}
        onSubmit={(shiftData, recurringShifts) => {
          createShiftMutation.mutate({ shiftData, recurringShifts });
        }}
        initialDate={selectedDateForShift}
        isLoading={createShiftMutation.isPending}
      />
    </div>
  );
}