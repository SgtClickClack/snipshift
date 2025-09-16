import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  DollarSign, 
  Star, 
  MessageSquare, 
  User, 
  Settings,
  Scissors,
  TrendingUp,
  Shield,
  CreditCard,
  Instagram,
  Phone,
  Mail
} from 'lucide-react';

export default function ProfessionalDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('shifts');

  // Mock data - in production this would come from API
  const mockShifts = [
    {
      id: '1',
      title: 'Senior Barber Needed',
      shop: 'Modern Cuts Barbershop',
      location: 'Sydney, NSW',
      date: '2024-01-15',
      time: '9:00 AM - 5:00 PM',
      pay: '$35/hour',
      skills: ['Fades', 'Beard Trim', 'Hair Cutting'],
      description: 'Looking for an experienced barber to join our team. Must have 3+ years experience.',
      shopImage: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&h=300&fit=crop',
      applied: false
    },
    {
      id: '2',
      title: 'Weekend Barber',
      shop: 'Classic Barbers',
      location: 'Melbourne, VIC',
      date: '2024-01-20',
      time: '10:00 AM - 4:00 PM',
      pay: '$40/hour',
      skills: ['Hair Cutting', 'Styling', 'Color'],
      description: 'Weekend position available for skilled barber. Great opportunity for extra income.',
      shopImage: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&h=300&fit=crop',
      applied: true
    }
  ];

  const mockFeed = [
    {
      id: '1',
      author: 'BarberPro Tools',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      content: 'New professional clippers just dropped! Get 20% off with code BARBER20',
      image: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=500&h=300&fit=crop',
      likes: 45,
      comments: 12,
      timestamp: '2 hours ago',
      type: 'promotion'
    },
    {
      id: '2',
      author: 'Hair Academy',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      content: 'Master the art of fade cutting with our new online course. Limited time offer!',
      image: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=500&h=300&fit=crop',
      likes: 78,
      comments: 23,
      timestamp: '5 hours ago',
      type: 'education'
    }
  ];

  const mockMessages = [
    {
      id: '1',
      sender: 'Modern Cuts Barbershop',
      avatar: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=100&h=100&fit=crop',
      lastMessage: 'Thanks for applying! We\'d like to schedule an interview.',
      timestamp: '1 hour ago',
      unread: true
    },
    {
      id: '2',
      sender: 'Classic Barbers',
      avatar: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=100&h=100&fit=crop',
      lastMessage: 'Your shift for this weekend is confirmed.',
      timestamp: '3 hours ago',
      unread: false
    }
  ];

  const mockProfile = {
    name: user?.displayName || 'John Doe',
    email: user?.email || 'john@example.com',
    phone: '+61 400 123 456',
    location: 'Sydney, NSW',
    rating: 4.8,
    reviewCount: 127,
    skills: ['Fades', 'Beard Trim', 'Hair Cutting', 'Styling'],
    experience: '5+ years',
    instagram: '@johndoebarber',
    insuranceStatus: 'Active',
    stripeConnected: true,
    earnings: '$2,450',
    completedJobs: 23
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-steel-50 via-white to-chrome-light/20">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-steel-900 mb-2">
            Welcome back, {mockProfile.name.split(' ')[0]}!
          </h1>
          <p className="text-steel-600">
            Ready to find your next opportunity?
          </p>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm">
            <TabsTrigger value="shifts" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Shifts
            </TabsTrigger>
            <TabsTrigger value="feed" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Feed
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          {/* Shifts Tab */}
          <TabsContent value="shifts" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-steel-900">Available Shifts</h2>
              <Button className="bg-gradient-to-r from-red-accent to-red-accent-dark">
                <MapPin className="h-4 w-4 mr-2" />
                Filter by Location
              </Button>
            </div>

            <div className="grid gap-6">
              {mockShifts.map((shift) => (
                <Card key={shift.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 rounded-lg overflow-hidden bg-steel-100">
                        <img 
                          src={shift.shopImage} 
                          alt={shift.shop}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-xl font-semibold text-steel-900 mb-1">
                              {shift.title}
                            </h3>
                            <p className="text-steel-600 font-medium">{shift.shop}</p>
                          </div>
                          {shift.applied && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Applied
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-steel-600 mb-3">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {shift.location}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {shift.date}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {shift.time}
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {shift.pay}
                          </div>
                        </div>

                        <p className="text-steel-700 mb-4">{shift.description}</p>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {shift.skills.map((skill) => (
                            <Badge key={skill} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex gap-3">
                          <Button 
                            variant={shift.applied ? "outline" : "default"}
                            className={shift.applied ? "" : "bg-gradient-to-r from-red-accent to-red-accent-dark"}
                            disabled={shift.applied}
                          >
                            {shift.applied ? 'Applied' : 'Apply Now'}
                          </Button>
                          <Button variant="outline">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Message Shop
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Feed Tab */}
          <TabsContent value="feed" className="space-y-6">
            <h2 className="text-2xl font-bold text-steel-900">Community Feed</h2>
            
            <div className="space-y-6">
              {mockFeed.map((post) => (
                <Card key={post.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex gap-4 mb-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={post.avatar} />
                        <AvatarFallback>{post.author[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold text-steel-900">{post.author}</h3>
                        <p className="text-sm text-steel-500">{post.timestamp}</p>
                      </div>
                      <Badge variant={post.type === 'promotion' ? 'default' : 'secondary'}>
                        {post.type === 'promotion' ? 'Promotion' : 'Education'}
                      </Badge>
                    </div>

                    <p className="text-steel-700 mb-4">{post.content}</p>

                    {post.image && (
                      <div className="mb-4 rounded-lg overflow-hidden">
                        <img 
                          src={post.image} 
                          alt="Post content"
                          className="w-full h-64 object-cover"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-6 text-steel-600">
                      <button className="flex items-center gap-2 hover:text-red-accent transition-colors">
                        <Star className="h-4 w-4" />
                        {post.likes}
                      </button>
                      <button className="flex items-center gap-2 hover:text-red-accent transition-colors">
                        <MessageSquare className="h-4 w-4" />
                        {post.comments}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-6">
            <h2 className="text-2xl font-bold text-steel-900">Messages</h2>
            
            <div className="space-y-4">
              {mockMessages.map((message) => (
                <Card key={message.id} className={`hover:shadow-lg transition-shadow ${message.unread ? 'ring-2 ring-red-accent/20' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={message.avatar} />
                        <AvatarFallback>{message.sender[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-semibold text-steel-900">{message.sender}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-steel-500">{message.timestamp}</span>
                            {message.unread && (
                              <div className="w-2 h-2 bg-red-accent rounded-full"></div>
                            )}
                          </div>
                        </div>
                        <p className="text-steel-700">{message.lastMessage}</p>
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
              {/* Profile Info */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-steel-700">Full Name</label>
                        <p className="text-steel-900">{mockProfile.name}</p>
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
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Scissors className="h-5 w-5" />
                      Professional Skills
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {mockProfile.skills.map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
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
                      <Star className="h-5 w-5" />
                      Rating & Reviews
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-steel-900 mb-1">
                        {mockProfile.rating}
                      </div>
                      <div className="flex justify-center mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`h-5 w-5 ${i < Math.floor(mockProfile.rating) ? 'text-yellow-400 fill-current' : 'text-steel-300'}`} 
                          />
                        ))}
                      </div>
                      <p className="text-sm text-steel-600">
                        {mockProfile.reviewCount} reviews
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Earnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-steel-600">This Month</span>
                        <span className="font-semibold text-steel-900">{mockProfile.earnings}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-steel-600">Completed Jobs</span>
                        <span className="font-semibold text-steel-900">{mockProfile.completedJobs}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Account Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Insurance</span>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {mockProfile.insuranceStatus}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Stripe</span>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Connected
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Instagram className="h-4 w-4 text-pink-600" />
                        <span className="text-sm">Instagram</span>
                      </div>
                      <span className="text-sm text-steel-600">{mockProfile.instagram}</span>
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