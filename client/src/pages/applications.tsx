import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Clock, User, CheckCircle, XCircle, Clock as ClockIcon } from 'lucide-react';

interface Application {
  id: string;
  shiftTitle: string;
  shopName: string;
  location: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  appliedDate: string;
  coverLetter: string;
  payRate: number;
}

const mockApplications: Application[] = [
  {
    id: '1',
    shiftTitle: 'Senior Barber - Weekend Shift',
    shopName: 'Elite Barbershop',
    location: 'Sydney, NSW',
    date: '2025-01-15',
    status: 'pending',
    appliedDate: '2025-01-10',
    coverLetter: 'I am very interested in this shift opportunity and believe my skills align perfectly with your requirements.',
    payRate: 35
  },
  {
    id: '2',
    shiftTitle: 'Mobile Barber Service',
    shopName: 'Mobile Grooming Co',
    location: 'Melbourne, VIC',
    date: '2025-01-20',
    status: 'approved',
    appliedDate: '2025-01-08',
    coverLetter: 'I have extensive experience in mobile barbering and would love to join your team.',
    payRate: 40
  },
  {
    id: '3',
    shiftTitle: 'Apprentice Opportunity',
    shopName: 'Classic Cuts',
    location: 'Brisbane, QLD',
    date: '2025-01-25',
    status: 'rejected',
    appliedDate: '2025-01-05',
    coverLetter: 'I am eager to learn and grow in the barbering industry.',
    payRate: 25
  }
];

export default function ApplicationsPage() {
  const [applications] = useState<Application[]>(mockApplications);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const handleWithdrawApplication = (application: Application) => {
    setSelectedApplication(application);
    setShowWithdrawModal(true);
  };

  const handleConfirmWithdrawal = () => {
    // Simulate withdrawal
    console.log('Application withdrawn:', selectedApplication?.id);
    setShowWithdrawModal(false);
    setSelectedApplication(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'withdrawn': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <ClockIcon className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'withdrawn': return <XCircle className="h-4 w-4" />;
      default: return <ClockIcon className="h-4 w-4" />;
    }
  };

  if (applications.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50" data-testid="applications-page">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Applications</h1>
            <p className="text-gray-600">Track your shift applications and their status</p>
          </div>
          
          <div className="text-center py-12" data-testid="empty-applications">
            <div className="max-w-md mx-auto">
              <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
              <p className="text-gray-600 mb-4">You haven't applied for any shifts yet. Start browsing the shift feed to find opportunities.</p>
              <Button onClick={() => window.location.href = '/shift-feed'}>
                Browse Shifts
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="applications-page">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Applications</h1>
          <p className="text-gray-600">Track your shift applications and their status</p>
        </div>

        {/* Applications List */}
        <div className="space-y-6">
          {applications.map((application) => (
            <Card key={application.id} className="hover:shadow-lg transition-shadow" data-testid="application-card">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg" data-testid="application-shift-title">{application.shiftTitle}</CardTitle>
                    <p className="text-gray-600" data-testid="application-shop-name">{application.shopName}</p>
                  </div>
                  <Badge className={getStatusColor(application.status)} data-testid="application-status">
                    <div className="flex items-center gap-1">
                      {getStatusIcon(application.status)}
                      {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                    </div>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span data-testid="application-location">{application.location}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span data-testid="application-date">{application.date}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium">${application.payRate}/hr</span>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium text-sm text-gray-700 mb-1">Applied on:</h4>
                  <p className="text-sm text-gray-600">{application.appliedDate}</p>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium text-sm text-gray-700 mb-1">Cover Letter:</h4>
                  <p className="text-sm text-gray-600" data-testid="cover-letter-preview">
                    {application.coverLetter.length > 100 
                      ? `${application.coverLetter.substring(0, 100)}...` 
                      : application.coverLetter}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedApplication(application)}
                    data-testid="button-view-full-application"
                  >
                    View Full Application
                  </Button>
                  {application.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleWithdrawApplication(application)}
                      data-testid="button-withdraw-application"
                    >
                      Withdraw
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Withdrawal Confirmation Modal */}
      {showWithdrawModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" data-testid="modal-confirm-withdrawal">
            <h2 className="text-xl font-bold mb-4">Withdraw Application</h2>
            <div className="mb-4">
              <p className="text-gray-700">
                Are you sure you want to withdraw your application for "{selectedApplication.shiftTitle}"?
              </p>
              <p className="text-sm text-gray-600 mt-2">
                This action cannot be undone.
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmWithdrawal}
                className="flex-1"
                data-testid="button-confirm-withdrawal"
              >
                Confirm Withdrawal
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
