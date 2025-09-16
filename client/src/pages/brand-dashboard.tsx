import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { 
  BarChart3, 
  Plus, 
  Users, 
  User, 
  Settings,
  TrendingUp,
  Eye,
  Heart,
  MessageSquare,
  Share,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  Target,
  Award,
  Building,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Youtube
} from 'lucide-react';

export default function BrandDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Mock data - in production this would come from API
  const mockMetrics = {
    totalReach: 12500,
    engagement: 4.2,
    subscribers: 234,
    conversionRate: 12.5,
    totalPosts: 24,
    avgEngagement: 4.2,
    sales: 45,
    revenue: 6750
  };

  const mockContent = [
    {
      id: '1',
      title: 'New Professional Clippers Launch',
      type: 'product',
      content: 'Introducing our latest professional clippers with advanced technology...',
      image: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=500&h=300&fit=crop',
      engagement: { likes: 45, comments: 12, shares: 8 },
      reach: 2400,
      clicks: 89,
      timestamp: '2 hours ago',
      status: 'published'
    },
    {
      id: '2',
      title: 'Barbering Tips: Perfect Fade Techniques',
      type: 'education',
      content: 'Master the art of fade cutting with these professional techniques...',
      image: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=500&h=300&fit=crop',
      engagement: { likes: 78, comments: 23, shares: 15 },
      reach: 3200,
      clicks: 142,
      timestamp: '1 day ago',
      status: 'published'
    }
  ];

  const mockSubscribers = [
    {
      id: '1',
      name: 'Mike Johnson',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      role: 'Professional Barber',
      location: 'Sydney, NSW',
      subscribedAt: '2024-01-10',
      engagement: 'High',
      lastActive: '2 hours ago'
    },
    {
      id: '2',
      name: 'Sarah Williams',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
      role: 'Barbershop Owner',
      location: 'Melbourne, VIC',
      subscribedAt: '2024-01-08',
      engagement: 'Medium',
      lastActive: '1 day ago'
    }
  ];

  const mockProfile = {
    companyName: 'BarberPro Tools',
    contactName: user?.displayName || 'John Smith',
    email: user?.email || 'john@barberpro.com',
    phone: '+61 400 123 456',
    location: 'Sydney, NSW',
    website: 'https://barberpro.com',
    businessType: 'Product Brand',
    description: 'Leading provider of professional barbering tools and equipment.',
    socialMedia: {
      instagram: '@barberprotools',
      facebook: 'BarberPro Tools',
      youtube: 'BarberPro Channel'
    },
    productCategories: ['Hair Care Products', 'Styling Tools', 'Barber Tools'],
    partnershipGoals: ['Product Trials', 'Brand Ambassadors', 'Event Sponsorship'],
    targetAudience: ['Professional Barbers', 'Barbershop Owners', 'Hair Stylists']
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-steel-50 via-white to-chrome-light/20">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-steel-900 mb-2">
            Welcome back, {mockProfile.contactName.split(' ')[0]}!
          </h1>
          <p className="text-steel-600">
            Manage your brand presence and connect with the barbering community.
          </p>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="subscribers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Subscribers
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
                      <p className="text-sm font-medium text-steel-600">Total Reach</p>
                      <p className="text-2xl font-bold text-steel-900">{mockMetrics.totalReach.toLocaleString()}</p>
                    </div>
                    <Eye className="h-8 w-8 text-red-accent" />
                  </div>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-sm text-green-600">+12% from last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-steel-600">Engagement Rate</p>
                      <p className="text-2xl font-bold text-steel-900">{mockMetrics.engagement}%</p>
                    </div>
                    <Heart className="h-8 w-8 text-red-accent" />
                  </div>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-sm text-green-600">+0.3% from last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-steel-600">Subscribers</p>
                      <p className="text-2xl font-bold text-steel-900">{mockMetrics.subscribers}</p>
                    </div>
                    <Users className="h-8 w-8 text-red-accent" />
                  </div>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-sm text-green-600">+18 this week</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-steel-600">Conversion Rate</p>
                      <p className="text-2xl font-bold text-steel-900">{mockMetrics.conversionRate}%</p>
                    </div>
                    <Target className="h-8 w-8 text-red-accent" />
                  </div>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-sm text-green-600">+2.1% from last month</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Content Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Content Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockContent.map((post) => (
                    <div key={post.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex gap-4">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-steel-100">
                          <img 
                            src={post.image} 
                            alt={post.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h3 className="font-semibold text-steel-900">{post.title}</h3>
                          <p className="text-sm text-steel-600">{post.timestamp}</p>
                          <Badge variant={post.type === 'product' ? 'default' : 'secondary'} className="mt-1">
                            {post.type === 'product' ? 'Product' : 'Education'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-6 text-sm text-steel-600">
                        <div className="text-center">
                          <div className="font-semibold text-steel-900">{post.reach.toLocaleString()}</div>
                          <div>Reach</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-steel-900">{post.engagement.likes}</div>
                          <div>Likes</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-steel-900">{post.clicks}</div>
                          <div>Clicks</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-steel-900">Content Management</h2>
              <Button className="bg-gradient-to-r from-red-accent to-red-accent-dark">
                <Plus className="h-4 w-4 mr-2" />
                Create New Post
              </Button>
            </div>

            {/* Create Post Form */}
            <Card>
              <CardHeader>
                <CardTitle>Create New Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="post-title">Post Title</Label>
                    <Input id="post-title" placeholder="Enter post title" />
                  </div>
                  <div>
                    <Label htmlFor="post-type">Content Type</Label>
                    <select id="post-type" className="w-full p-2 border rounded-md">
                      <option value="product">Product Promotion</option>
                      <option value="education">Educational Content</option>
                      <option value="event">Event/Workshop</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="post-content">Content</Label>
                  <Textarea 
                    id="post-content" 
                    placeholder="Write your post content here..."
                    className="min-h-[120px]"
                  />
                </div>

                <div>
                  <Label htmlFor="post-image">Image</Label>
                  <Input id="post-image" type="file" accept="image/*" />
                </div>

                <div className="flex gap-3">
                  <Button className="bg-gradient-to-r from-red-accent to-red-accent-dark">
                    Publish Post
                  </Button>
                  <Button variant="outline">Save Draft</Button>
                </div>
              </CardContent>
            </Card>

            {/* Existing Posts */}
            <Card>
              <CardHeader>
                <CardTitle>Your Posts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockContent.map((post) => (
                    <div key={post.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex gap-4">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-steel-100">
                          <img 
                            src={post.image} 
                            alt={post.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h3 className="font-semibold text-steel-900">{post.title}</h3>
                          <p className="text-sm text-steel-600">{post.timestamp}</p>
                          <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                            {post.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Share className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscribers Tab */}
          <TabsContent value="subscribers" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-steel-900">Subscribers</h2>
              <div className="flex gap-3">
                <Button variant="outline">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Export List
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              {mockSubscribers.map((subscriber) => (
                <Card key={subscriber.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={subscriber.avatar} />
                          <AvatarFallback>{subscriber.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-steel-900">{subscriber.name}</h3>
                          <p className="text-sm text-steel-600">{subscriber.role}</p>
                          <p className="text-sm text-steel-500">{subscriber.location}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={subscriber.engagement === 'High' ? 'default' : 'secondary'}>
                          {subscriber.engagement} Engagement
                        </Badge>
                        <p className="text-sm text-steel-500 mt-1">Joined {subscriber.subscribedAt}</p>
                        <p className="text-sm text-steel-500">Last active {subscriber.lastActive}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Company Info */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Company Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-steel-700">Company Name</label>
                        <p className="text-steel-900">{mockProfile.companyName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-steel-700">Contact Name</label>
                        <p className="text-steel-900">{mockProfile.contactName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-steel-700">Email</label>
                        <p className="text-steel-900">{mockProfile.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-steel-700">Phone</label>
                        <p className="text-steel-900">{mockProfile.phone}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-steel-700">Location</label>
                        <p className="text-steel-900">{mockProfile.location}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-steel-700">Website</label>
                        <p className="text-steel-900">{mockProfile.website}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-steel-700">Business Description</label>
                      <p className="text-steel-900">{mockProfile.description}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Business Focus
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-steel-700">Product Categories</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {mockProfile.productCategories.map((category) => (
                          <Badge key={category} variant="secondary">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-steel-700">Partnership Goals</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {mockProfile.partnershipGoals.map((goal) => (
                          <Badge key={goal} variant="outline">
                            {goal}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-steel-700">Target Audience</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {mockProfile.targetAudience.map((audience) => (
                          <Badge key={audience} variant="outline">
                            {audience}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Social Media & Stats */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Share className="h-5 w-5" />
                      Social Media
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Instagram className="h-5 w-5 text-pink-600" />
                      <span className="text-sm text-steel-600">{mockProfile.socialMedia.instagram}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Facebook className="h-5 w-5 text-blue-600" />
                      <span className="text-sm text-steel-600">{mockProfile.socialMedia.facebook}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Youtube className="h-5 w-5 text-red-600" />
                      <span className="text-sm text-steel-600">{mockProfile.socialMedia.youtube}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Brand Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-steel-600">Total Posts</span>
                      <span className="font-semibold text-steel-900">{mockMetrics.totalPosts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-steel-600">Subscribers</span>
                      <span className="font-semibold text-steel-900">{mockMetrics.subscribers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-steel-600">Avg Engagement</span>
                      <span className="font-semibold text-steel-900">{mockMetrics.avgEngagement}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-steel-600">Total Sales</span>
                      <span className="font-semibold text-steel-900">{mockMetrics.sales}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-steel-600">Revenue</span>
                      <span className="font-semibold text-steel-900">${mockMetrics.revenue.toLocaleString()}</span>
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