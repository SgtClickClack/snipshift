import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Store, 
  Users, 
  Calendar, 
  TrendingUp, 
  MessageSquare, 
  Plus,
  Briefcase,
  Award,
  BarChart3,
  Settings
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import ShiftPostingModal from '@/components/shift-posting-modal';

export default function HubDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showBarberProfileModal, setShowBarberProfileModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);

  // Mock data - replace with actual API calls
  const [stats, setStats] = useState({
    totalShifts: 12,
    activeApplications: 8,
    completedShifts: 45,
    revenue: 12500,
    rating: 4.8,
    reviews: 127
  });

  const [recentShifts, setRecentShifts] = useState([
    {
      id: '1',
      title: 'Senior Barber - Weekend Shift',
      date: '2024-01-15',
      applicants: 5,
      status: 'open',
      pay: 150
    },
    {
      id: '2', 
      title: 'Stylist - Evening Shift',
      date: '2024-01-14',
      applicants: 3,
      status: 'filled',
      pay: 120
    }
  ]);

  const handlePostShift = () => {
    setIsShiftModalOpen(true);
  };

  const handleViewApplications = () => {
    setActiveTab('applications');
  };

  const handleApproveApplication = (application: any) => {
    setSelectedApplication(application);
    setShowApprovalModal(true);
  };

  const handleRejectApplication = (applicationId: string) => {
    toast({
      title: "Application rejected",
      description: "The professional has been notified of the rejection.",
    });
  };

  const handleMessageApplicant = (application: any) => {
    setSelectedApplication(application);
    setShowMessageModal(true);
  };

  const handleViewBarberProfile = (application: any) => {
    setSelectedApplication(application);
    setShowBarberProfileModal(true);
  };

  const handleConfirmApproval = () => {
    toast({
      title: "Application approved successfully",
      description: "The professional has been notified of the approval.",
    });
    setShowApprovalModal(false);
    setSelectedApplication(null);
  };

  const handleSendMessage = () => {
    toast({
      title: "Message sent successfully",
      description: "Your message has been sent to the applicant.",
    });
    setShowMessageModal(false);
    setSelectedApplication(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-steel-50 via-white to-chrome-light/20" data-testid="hub-dashboard">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-steel-900 mb-2" data-testid="heading-dashboard">
                Hub Dashboard
              </h1>
              <p className="text-steel-600">
                Welcome back, {user?.displayName || 'Hub Owner'}! Manage your shifts and grow your business.
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={handlePostShift}
                className="bg-red-accent hover:bg-red-accent-dark text-white"
                data-testid="button-post-shift"
              >
                <Plus className="w-4 h-4 mr-2" />
                Post New Shift
              </Button>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalShifts}</div>
              <p className="text-xs text-muted-foreground">
                +2 from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Applications</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeApplications}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting your review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.revenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rating</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.rating}</div>
              <p className="text-xs text-muted-foreground">
                From {stats.reviews} reviews
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="shifts" data-testid="tab-posted-shifts">Shifts</TabsTrigger>
            <TabsTrigger value="applications" data-testid="tab-applications">Applications</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Shifts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Recent Shifts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentShifts.map((shift) => (
                      <div key={shift.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{shift.title}</h4>
                          <p className="text-sm text-muted-foreground">{shift.date}</p>
                          <p className="text-sm text-muted-foreground">${shift.pay}/shift</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={shift.status === 'open' ? 'default' : 'secondary'}>
                            {shift.status}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            {shift.applicants} applicants
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full mt-4">
                    View All Shifts
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      onClick={handlePostShift}
                      className="h-20 flex flex-col gap-2"
                      variant="outline"
                    >
                      <Plus className="w-6 h-6" />
                      Post Shift
                    </Button>
                    <Button 
                      onClick={handleViewApplications}
                      className="h-20 flex flex-col gap-2"
                      variant="outline"
                    >
                      <Users className="w-6 h-6" />
                      View Applications
                    </Button>
                    <Button 
                      className="h-20 flex flex-col gap-2"
                      variant="outline"
                    >
                      <MessageSquare className="w-6 h-6" />
                      Messages
                    </Button>
                    <Button 
                      className="h-20 flex flex-col gap-2"
                      variant="outline"
                    >
                      <BarChart3 className="w-6 h-6" />
                      Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="shifts">
            <Card>
              <CardHeader>
                <CardTitle>Manage Shifts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentShifts.map((shift) => (
                    <div key={shift.id} className="border rounded-lg p-4" data-testid="shift-card">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium" data-testid="shift-title">{shift.title}</h4>
                          <p className="text-sm text-muted-foreground" data-testid="shift-date">{shift.date}</p>
                          <p className="text-sm text-muted-foreground" data-testid="shift-location">Sydney, NSW</p>
                          <p className="text-sm font-medium" data-testid="shift-pay-rate">${shift.pay}/shift</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={shift.status === 'open' ? 'default' : 'secondary'}>
                            {shift.status}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1" data-testid="applicant-count">
                            {shift.applicants} applicants
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button variant="outline" size="sm" data-testid="button-edit-shift">
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" data-testid="button-cancel-shift">
                          Cancel
                        </Button>
                        <Button variant="outline" size="sm" data-testid="button-view-applications">
                          View Applications
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications">
            <Card>
              <CardHeader>
                <CardTitle>Application Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4" data-testid="applications-section">
                  {/* Mock applications */}
                  <div className="border rounded-lg p-4" data-testid="application-card">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium" data-testid="barber-name">John Smith</h4>
                        <p className="text-sm text-muted-foreground" data-testid="barber-rating">⭐ 4.8 (127 reviews)</p>
                        <p className="text-sm text-muted-foreground" data-testid="application-date">Applied 2 hours ago</p>
                        <p className="text-sm" data-testid="cover-letter-preview">I have 5+ years of experience in barbering...</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="default">Pending</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        data-testid="button-view-full-application"
                        onClick={() => handleViewBarberProfile({ id: '1', name: 'John Smith' })}
                      >
                        View Full Application
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        data-testid="button-view-barber-profile"
                        onClick={() => handleViewBarberProfile({ id: '1', name: 'John Smith' })}
                      >
                        View Profile
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        data-testid="button-approve-application"
                        onClick={() => handleApproveApplication({ id: '1', name: 'John Smith' })}
                      >
                        Approve
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        data-testid="button-message-applicant"
                        onClick={() => handleMessageApplicant({ id: '1', name: 'John Smith' })}
                      >
                        Message
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Business Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Business analytics and reporting functionality will be implemented here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Shift Posting Modal */}
      <ShiftPostingModal 
        isOpen={isShiftModalOpen} 
        onClose={() => setIsShiftModalOpen(false)} 
      />

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" data-testid="modal-approve-application">
            <h2 className="text-xl font-bold mb-4">Approve Application</h2>
            <p className="text-gray-600 mb-4">
              Are you sure you want to approve {selectedApplication?.name}'s application?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Approval Message (Optional)
              </label>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-md resize-none"
                rows={3}
                placeholder="Welcome to our team! Please arrive 15 minutes early for orientation."
                data-testid="textarea-approval-message"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowApprovalModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmApproval}
                className="flex-1"
                data-testid="button-confirm-approval"
              >
                Confirm Approval
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" data-testid="modal-send-message">
            <h2 className="text-xl font-bold mb-4">Send Message</h2>
            <p className="text-gray-600 mb-4">
              Send a message to {selectedApplication?.name}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-md resize-none"
                rows={4}
                placeholder="Hi, I have a few questions about your availability. Can we schedule a quick call?"
                data-testid="textarea-message"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowMessageModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendMessage}
                className="flex-1"
                data-testid="button-send-message"
              >
                Send Message
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Barber Profile Modal */}
      {showBarberProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" data-testid="modal-barber-profile">
            <h2 className="text-xl font-bold mb-4">Barber Profile</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold" data-testid="barber-name">{selectedApplication?.name}</h3>
                <p className="text-gray-600">Professional Barber</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Experience</h4>
                <p data-testid="barber-experience">5+ years of professional barbering experience</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Skills</h4>
                <div className="flex flex-wrap gap-2" data-testid="barber-skills">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">Hair Cutting</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">Fade Techniques</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">Beard Styling</span>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Certifications</h4>
                <div data-testid="barber-certifications">
                  <p>• Master Barber Certification (2020)</p>
                  <p>• Advanced Fade Techniques Course (2021)</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Portfolio</h4>
                <div className="grid grid-cols-3 gap-2" data-testid="barber-portfolio">
                  <div className="aspect-square bg-gray-200 rounded"></div>
                  <div className="aspect-square bg-gray-200 rounded"></div>
                  <div className="aspect-square bg-gray-200 rounded"></div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Reviews</h4>
                <div data-testid="barber-reviews">
                  <p>⭐ 4.8/5 (127 reviews)</p>
                  <p className="text-sm text-gray-600">"Excellent work! Very professional and skilled."</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowBarberProfileModal(false)}
                className="flex-1"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setShowBarberProfileModal(false);
                  handleMessageApplicant(selectedApplication);
                }}
                className="flex-1"
              >
                Send Message
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
