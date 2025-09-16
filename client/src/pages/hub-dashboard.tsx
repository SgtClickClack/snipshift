import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { 
  BarChart3, 
  Plus, 
  Users, 
  User, 
  Settings,
  TrendingUp,
  Calendar,
  MapPin,
  Clock,
  DollarSign,
  Star,
  MessageSquare,
  Edit,
  Trash2,
  Building,
  Phone,
  Mail,
  Shield,
  Award,
  Scissors,
  UserCheck,
  Eye,
  Heart
} from 'lucide-react';

export default function HubDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Mock data - in production this would come from API
  const mockMetrics = {
    totalJobs: 12,
    totalViews: 1840,
    totalApplications: 287,
    responseRate: 78,
    activeProfessionals: 8,
    completedJobs: 45,
    totalRevenue: 15750,
    avgRating: 4.7
  };

  const mockJobs = [
    {
      id: '1',
      title: 'Senior Barber Needed',
      description: 'Looking for an experienced barber to join our team. Must have 3+ years experience.',
      skills: ['Fades', 'Beard Trim', 'Hair Cutting'],
      payRate: 35,
      payType: 'hourly',
      location: 'Sydney, NSW',
      date: '2024-01-15',
      startTime: '9:00 AM',
      endTime: '5:00 PM',
      status: 'open',
      applicationsCount: 8,
      views: 45,
      createdAt: '2024-01-10'
    },
    {
      id: '2',
      title: 'Weekend Barber',
      description: 'Weekend position available for skilled barber. Great opportunity for extra income.',
      skills: ['Hair Cutting', 'Styling', 'Color'],
      payRate: 40,
      payType: 'hourly',
      location: 'Melbourne, VIC',
      date: '2024-01-20',
      startTime: '10:00 AM',
      endTime: '4:00 PM',
      status: 'filled',
      applicationsCount: 12,
      views: 67,
      createdAt: '2024-01-08'
    }
  ];

  const mockTeam = [
    {
      id: '1',
      name: 'Mike Johnson',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      role: 'Senior Barber',
      skills: ['Fades', 'Beard Trim', 'Hair Cutting'],
      rating: 4.8,
      reviewCount: 127,
      joinedDate: '2023-06-15',
      completedJobs: 23,
      earnings: 2450,
      status: 'active'
    },
    {
      id: '2',
      name: 'Sarah Williams',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
      role: 'Stylist',
      skills: ['Hair Cutting', 'Styling', 'Color'],
      rating: 4.6,
      reviewCount: 89,
      joinedDate: '2023-08-20',
      completedJobs: 18,
      earnings: 1890,
      status: 'active'
    }
  ];

  const mockApplications = [
    {
      id: '1',
      professional: {
        name: 'Alex Thompson',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
        rating: 4.9,
        experience: '5+ years',
        skills: ['Fades', 'Beard Trim', 'Hair Cutting']
      },
      jobTitle: 'Senior Barber Needed',
      appliedAt: '2024-01-12',
      message: 'I have extensive experience in modern barbering techniques and would love to join your team.',
      status: 'pending'
    },
    {
      id: '2',
      professional: {
        name: 'Emma Davis',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
        rating: 4.7,
        experience: '3+ years',
        skills: ['Hair Cutting', 'Styling', 'Color']
      },
      jobTitle: 'Weekend Barber',
      appliedAt: '2024-01-11',
      message: 'Available for weekend shifts and have experience with all hair types.',
      status: 'accepted'
    }
  ];

  const mockProfile = {
    businessName: 'Modern Cuts Barbershop',
    businessType: 'Barbershop',
    address: '123 Main Street, Sydney, NSW 2000',
    phone: '+61 2 9876 5432',
    website: 'https://moderncuts.com.au',
    description: 'A modern barbershop offering premium haircuts and grooming services.',
    chairCapacity: '5-6 chairs',
    vibeTags: ['Modern', 'High-end', 'Professional'],
    abn: '12345678901',
    businessInsurance: 'Active',
    shopPhotos: 3
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-steel-50 via-white to-chrome-light/20">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-steel-900 mb-2">
            Welcome back to {mockProfile.businessName}!
          </h1>
          <p className="text-steel-600">
            Manage your barbershop operations and team.
          </p>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Jobs
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-steel-600">Active Jobs</p>
                      <p className="text-2xl font-bold text-steel-900">{mockMetrics.totalJobs}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-red-accent" />
                  </div>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-sm text-green-600">+3 this week</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-steel-600">Total Applications</p>
                      <p className="text-2xl font-bold text-steel-900">{mockMetrics.totalApplications}</p>
                    </div>
                    <UserCheck className="h-8 w-8 text-red-accent" />
                  </div>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-sm text-green-600">+12 this week</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-steel-600">Team Members</p>
                      <p className="text-2xl font-bold text-steel-900">{mockMetrics.activeProfessionals}</p>
                    </div>
                    <Users className="h-8 w-8 text-red-accent" />
                  </div>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-sm text-green-600">+1 this month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-steel-600">Avg Rating</p>
                      <p className="text-2xl font-bold text-steel-900">{mockMetrics.avgRating}</p>
                    </div>
                    <Star className="h-8 w-8 text-red-accent" />
                  </div>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-sm text-green-600">+0.1 this month</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Job Applications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockApplications.slice(0, 3).map((application) => (
                      <div key={application.id} className="flex items-center gap-4 p-3 border rounded-lg">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={application.professional.avatar} />
                          <AvatarFallback>{application.professional.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h4 className="font-medium text-steel-900">{application.professional.name}</h4>
                          <p className="text-sm text-steel-600">{application.jobTitle}</p>
                          <p className="text-xs text-steel-500">{application.appliedAt}</p>
                        </div>
                        <Badge variant={application.status === 'accepted' ? 'default' : 'secondary'}>
                          {application.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Team Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockTeam.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback>{member.name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium text-steel-900">{member.name}</h4>
                            <p className="text-sm text-steel-600">{member.role}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-400 fill-current" />
                            <span className="text-sm font-medium">{member.rating}</span>
                          </div>
                          <p className="text-xs text-steel-500">{member.completedJobs} jobs</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-steel-900">Job Management</h2>
              <Button className="bg-gradient-to-r from-red-accent to-red-accent-dark">
                <Plus className="h-4 w-4 mr-2" />
                Post New Job
              </Button>
            </div>

            {/* Create Job Form */}
            <Card>
              <CardHeader>
                <CardTitle>Post a New Job</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="job-title">Job Title</Label>
                    <Input id="job-title" placeholder="e.g., Senior Barber Needed" />
                  </div>
                  <div>
                    <Label htmlFor="job-location">Location</Label>
                    <Input id="job-location" placeholder="Sydney, NSW" />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="job-description">Job Description</Label>
                  <Textarea 
                    id="job-description" 
                    placeholder="Describe the role and requirements..."
                    className="min-h-[120px]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="pay-rate">Pay Rate</Label>
                    <Input id="pay-rate" placeholder="35" />
                  </div>
                  <div>
                    <Label htmlFor="pay-type">Pay Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select pay type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="commission">Commission</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="job-date">Job Date</Label>
                    <Input id="job-date" type="date" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-time">Start Time</Label>
                    <Input id="start-time" type="time" />
                  </div>
                  <div>
                    <Label htmlFor="end-time">End Time</Label>
                    <Input id="end-time" type="time" />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button className="bg-gradient-to-r from-red-accent to-red-accent-dark">
                    Post Job
                  </Button>
                  <Button variant="outline">Save Draft</Button>
                </div>
              </CardContent>
            </Card>

            {/* Active Jobs */}
            <Card>
              <CardHeader>
                <CardTitle>Active Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockJobs.map((job) => (
                    <div key={job.id} className="p-4 border rounded-lg hover:shadow-lg transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-steel-900">{job.title}</h3>
                          <p className="text-steel-600">{job.description}</p>
                        </div>
                        <Badge variant={job.status === 'open' ? 'default' : 'secondary'}>
                          {job.status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-steel-600 mb-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {job.location}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {job.date}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {job.startTime} - {job.endTime}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          ${job.payRate}/{job.payType}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {job.skills.map((skill) => (
                          <Badge key={skill} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex gap-6 text-sm text-steel-600">
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            {job.views} views
                          </div>
                          <div className="flex items-center gap-1">
                            <UserCheck className="h-4 w-4" />
                            {job.applicationsCount} applications
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-steel-900">Team Management</h2>
              <Button className="bg-gradient-to-r from-red-accent to-red-accent-dark">
                <Plus className="h-4 w-4 mr-2" />
                Invite Professional
              </Button>
            </div>

            <div className="grid gap-6">
              {mockTeam.map((member) => (
                <Card key={member.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4">
                        <Avatar className="w-16 h-16">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>{member.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="text-xl font-semibold text-steel-900">{member.name}</h3>
                          <p className="text-steel-600 font-medium">{member.role}</p>
                          <p className="text-sm text-steel-500">Joined {member.joinedDate}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 mb-2">
                          <Star className="h-5 w-5 text-yellow-400 fill-current" />
                          <span className="font-semibold text-steel-900">{member.rating}</span>
                          <span className="text-sm text-steel-500">({member.reviewCount} reviews)</span>
                        </div>
                        <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                          {member.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex flex-wrap gap-2 mb-4">
                        {member.skills.map((skill) => (
                          <Badge key={skill} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-steel-50 rounded-lg">
                          <div className="text-lg font-semibold text-steel-900">{member.completedJobs}</div>
                          <div className="text-sm text-steel-600">Completed Jobs</div>
                        </div>
                        <div className="text-center p-3 bg-steel-50 rounded-lg">
                          <div className="text-lg font-semibold text-steel-900">${member.earnings}</div>
                          <div className="text-sm text-steel-600">Total Earnings</div>
                        </div>
                        <div className="text-center p-3 bg-steel-50 rounded-lg">
                          <div className="text-lg font-semibold text-steel-900">{member.experience}</div>
                          <div className="text-sm text-steel-600">Experience</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                      <Button variant="outline">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                      <Button variant="outline">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Role
                      </Button>
                      <Button variant="outline">
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Business Info */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Business Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-steel-700">Business Name</label>
                        <p className="text-steel-900">{mockProfile.businessName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-steel-700">Business Type</label>
                        <p className="text-steel-900">{mockProfile.businessType}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-steel-700">Address</label>
                        <p className="text-steel-900">{mockProfile.address}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-steel-700">Phone</label>
                        <p className="text-steel-900">{mockProfile.phone}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-steel-700">Website</label>
                        <p className="text-steel-900">{mockProfile.website}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-steel-700">Chair Capacity</label>
                        <p className="text-steel-900">{mockProfile.chairCapacity}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-steel-700">Description</label>
                      <p className="text-steel-900">{mockProfile.description}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Shop Vibe & Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {mockProfile.vibeTags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Stats & Status */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Business Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-steel-600">Active Jobs</span>
                      <span className="font-semibold text-steel-900">{mockMetrics.totalJobs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-steel-600">Team Members</span>
                      <span className="font-semibold text-steel-900">{mockMetrics.activeProfessionals}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-steel-600">Completed Jobs</span>
                      <span className="font-semibold text-steel-900">{mockMetrics.completedJobs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-steel-600">Total Revenue</span>
                      <span className="font-semibold text-steel-900">${mockMetrics.totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-steel-600">Avg Rating</span>
                      <span className="font-semibold text-steel-900">{mockMetrics.avgRating}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Verification Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Business Insurance</span>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {mockProfile.businessInsurance}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-green-600" />
                        <span className="text-sm">ABN</span>
                      </div>
                      <span className="text-sm text-steel-600">{mockProfile.abn}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Scissors className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Shop Photos</span>
                      </div>
                      <span className="text-sm text-steel-600">{mockProfile.shopPhotos} uploaded</span>
                    </div>
                  </CardContent>
                </Card>

                <Button className="w-full bg-gradient-to-r from-red-accent to-red-accent-dark">
                  Edit Profile
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}