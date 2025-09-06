import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, MessageCircle, Calendar, DollarSign, Users } from "lucide-react";
import { TutorialTrigger } from "@/components/onboarding/tutorial-overlay";
import { format } from "date-fns";
// Remove missing component imports - will implement inline

type ActiveView = 'overview' | 'jobs' | 'applications' | 'profile';

export default function HubDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<ActiveView>('overview');
  const [showJobPostingModal, setShowJobPostingModal] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);
  const [editingJob, setEditingJob] = useState<any | null>(null);
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

  const { data: jobs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/jobs/hub", user?.id],
    enabled: !!user?.id,
  });

  const createJobMutation = useMutation({
    mutationFn: async (jobData: any) => {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...jobData,
          hubId: user?.id,
          status: "open",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Job posted successfully!"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/hub"] });
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
      toast({
        title: "Error", 
        description: "Failed to post job. Please try again.",
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
        setShowJobPostingModal(true);
        break;
      case 'view-applications':
        setActiveView('applications');
        break;
      case 'manage-jobs':
        setActiveView('jobs');
        break;
      case 'open-messages':
        setShowMessaging(true);
        break;
      default:
        break;
    }
  };

  // Mock stats for demonstration
  const stats = {
    openJobs: jobs.filter(job => job.status === 'open').length,
    totalApplications: jobs.reduce((sum, job) => sum + (job.applicants?.length || 0), 0),
    unreadMessages: 3, // This would come from messaging service
    monthlyHires: 8
  };

  if (!user || user.currentRole !== "hub") {
    return <div>Access denied</div>;
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: 'var(--bg-hub)'}}>
      {/* Dashboard Header */}
      <div className="bg-white/95 backdrop-blur-sm shadow-lg border-b-2 border-steel-300/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-steel-900" data-testid="heading-dashboard">Hub Dashboard</h1>
              <p className="text-steel-600">{user.displayName || user.email}</p>
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <TutorialTrigger />
              <Button 
                onClick={() => handleQuickAction('open-messages')}
                className="w-full md:w-auto bg-gradient-to-r from-steel-700 to-steel-800 hover:from-steel-800 hover:to-steel-900 text-white shadow-md hover:shadow-lg transition-all duration-200"
                data-testid="button-open-messages"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Messages
              </Button>
              <Button 
                onClick={() => handleQuickAction('post-job')}
                className="w-full md:w-auto bg-gradient-to-r from-red-accent to-red-accent-dark hover:from-red-accent-light hover:to-red-accent text-white shadow-lg hover:shadow-xl transition-all duration-200"
                data-testid="button-post-job"
              >
                <Plus className="mr-2 h-4 w-4" />
                Post New Job
              </Button>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex gap-4 mt-4 overflow-x-auto">
            <button
              onClick={() => setActiveView('overview')}
              className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${
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
              className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${
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
              className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${
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
              className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-2 border-steel-300/50 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="rounded-lg bg-gradient-to-br from-green-500 to-green-600 p-3 shadow-md">
                      <Plus className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Open Jobs</p>
                      <p className="text-2xl font-bold">{stats.openJobs}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-2 border-steel-300/50 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-3 shadow-md">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Applications</p>
                      <p className="text-2xl font-bold">{stats.totalApplications}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-2 border-steel-300/50 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 p-3 shadow-md">
                      <MessageCircle className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Messages</p>
                      <p className="text-2xl font-bold">{stats.unreadMessages}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-2 border-steel-300/50 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="rounded-lg bg-gradient-to-br from-red-accent to-red-accent-hover p-3 shadow-md">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Monthly Hires</p>
                      <p className="text-2xl font-bold">{stats.monthlyHires}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-2 border-steel-300/50">
                <CardHeader className="bg-gradient-to-b from-steel-50 to-white rounded-t-lg border-b border-steel-200/50">
                  <CardTitle className="text-steel-900">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button 
                      onClick={() => handleQuickAction('post-job')}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Post New Job
                    </Button>
                    <Button 
                      onClick={() => handleQuickAction('view-applications')}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      View Applications
                    </Button>
                    <Button 
                      onClick={() => handleQuickAction('open-messages')}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Open Messages
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <div className="lg:col-span-2">
                <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-2 border-steel-300/50">
                  <CardHeader className="bg-gradient-to-b from-steel-50 to-white rounded-t-lg border-b border-steel-200/50">
                    <CardTitle className="text-steel-900">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {jobs.slice(0, 3).map((job) => (
                        <div key={job.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <h4 className="font-medium">{job.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {job.applicants?.length || 0} applications • Posted {format(new Date(job.createdAt), "MMM d")}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            job.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
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
              <div className="mb-6">
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
            
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Post Job Form */}
              {showForm && (
                <div className="lg:col-span-1">
                  <Card>
                    <CardHeader>
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
                <Card>
                  <CardHeader>
                    <CardTitle>Your Posted Jobs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div data-testid="text-loading">Loading jobs...</div>
                    ) : jobs.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-neutral-600" data-testid="text-no-jobs">No jobs posted yet.</p>
                        <Button 
                          onClick={() => setShowForm(true)}
                          className="mt-4"
                          variant="outline"
                          data-testid="button-post-first-job"
                        >
                          Post Your First Job
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {jobs.map((job) => (
                          <Card key={job.id} className="border border-neutral-200" data-testid={`card-job-${job.id}`}>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-3">
                                <h4 className="font-semibold text-neutral-900" data-testid={`text-job-title-${job.id}`}>
                                  {job.title}
                                </h4>
                                <span 
                                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    job.status === 'open' ? 'bg-success text-white' : 'bg-neutral-200 text-neutral-700'
                                  }`}
                                  data-testid={`status-job-${job.id}`}
                                >
                                  {job.status}
                                </span>
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
                                    ${job.payRate}/{job.payType}
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <Users className="mr-2 h-4 w-4 text-primary" />
                                  <span data-testid={`text-job-applicants-${job.id}`}>
                                    {job.applicants?.length || 0} applicants
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
                                      key={index}
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
            <Card>
              <CardHeader>
                <CardTitle>Job Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-4">
                  Applications will be displayed here when available.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Profile Tab */}
        {activeView === 'profile' && (
          <div className="max-w-4xl">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Profile management features will be available here.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}