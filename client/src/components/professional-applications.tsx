import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Calendar, MapPin, DollarSign, Clock, X } from 'lucide-react';

interface Application {
  id: string;
  shiftTitle: string;
  shopName: string;
  location: string;
  payRate: number;
  date: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  appliedAt: string;
  coverLetter?: string;
}

const mockApplications: Application[] = [
  {
    id: '1',
    shiftTitle: 'Senior Barber - Weekend Shift',
    shopName: 'Elite Barbershop',
    location: 'Sydney, NSW',
    payRate: 35,
    date: '2024-01-15',
    status: 'pending',
    appliedAt: '2024-01-10',
    coverLetter: 'I have 5+ years of experience in barbering and specialize in fade techniques...'
  },
  {
    id: '2',
    shiftTitle: 'Mobile Barber Service',
    shopName: 'Mobile Grooming Co',
    location: 'Melbourne, VIC',
    payRate: 40,
    date: '2024-01-20',
    status: 'approved',
    appliedAt: '2024-01-08',
    coverLetter: 'I am very interested in this mobile barbering opportunity...'
  },
  {
    id: '3',
    shiftTitle: 'Apprentice Opportunity',
    shopName: 'Classic Cuts',
    location: 'Brisbane, QLD',
    payRate: 25,
    date: '2024-01-18',
    status: 'rejected',
    appliedAt: '2024-01-05',
    coverLetter: 'I am eager to learn and develop my skills...'
  }
];

export default function ProfessionalApplications() {
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>(mockApplications);

  const handleWithdrawApplication = (applicationId: string) => {
    setApplications(prev => 
      prev.map(app => 
        app.id === applicationId 
          ? { ...app, status: 'withdrawn' as const }
          : app
      )
    );
    
    toast({
      title: "Application withdrawn successfully",
      description: "Your application has been withdrawn.",
    });
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

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const approvedApplications = applications.filter(app => app.status === 'approved');
  const rejectedApplications = applications.filter(app => app.status === 'rejected');
  const withdrawnApplications = applications.filter(app => app.status === 'withdrawn');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">My Applications</h2>
        <p className="text-gray-600">Track the status of your shift applications</p>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All ({applications.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingApplications.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedApplications.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejectedApplications.length})</TabsTrigger>
          <TabsTrigger value="withdrawn">Withdrawn ({withdrawnApplications.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {applications.map((application) => (
            <Card key={application.id} data-testid="application-card">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg" data-testid="application-shift-title">
                      {application.shiftTitle}
                    </h3>
                    <p className="text-gray-600" data-testid="application-shop-name">
                      {application.shopName}
                    </p>
                  </div>
                  <Badge className={getStatusColor(application.status)} data-testid="application-status">
                    {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span data-testid="application-location">{application.location}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <DollarSign className="h-4 w-4 mr-2" />
                    <span>${application.payRate}/hr</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span data-testid="application-date">{application.date}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>Applied {application.appliedAt}</span>
                  </div>
                </div>

                {application.coverLetter && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-700">
                      <strong>Cover Letter:</strong> {application.coverLetter}
                    </p>
                  </div>
                )}

                {application.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleWithdrawApplication(application.id)}
                      data-testid="button-withdraw-application"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Withdraw Application
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {pendingApplications.map((application) => (
            <Card key={application.id} data-testid="application-card">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{application.shiftTitle}</h3>
                    <p className="text-gray-600">{application.shopName}</p>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleWithdrawApplication(application.id)}
                    data-testid="button-withdraw-application"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Withdraw Application
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {approvedApplications.map((application) => (
            <Card key={application.id} data-testid="application-card">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{application.shiftTitle}</h3>
                    <p className="text-gray-600">{application.shopName}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Approved</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedApplications.map((application) => (
            <Card key={application.id} data-testid="application-card">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{application.shiftTitle}</h3>
                    <p className="text-gray-600">{application.shopName}</p>
                  </div>
                  <Badge className="bg-red-100 text-red-800">Rejected</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="withdrawn" className="space-y-4">
          {withdrawnApplications.map((application) => (
            <Card key={application.id} data-testid="application-card">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{application.shiftTitle}</h3>
                    <p className="text-gray-600">{application.shopName}</p>
                  </div>
                  <Badge className="bg-gray-100 text-gray-800">Withdrawn</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
