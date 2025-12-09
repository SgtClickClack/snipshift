import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MapPin, Clock, DollarSign, Eye, X, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { useWithdrawApplication } from '@/pages/professional-dashboard/useWithdrawApplication';
import { ApplicationStatusModal } from './ApplicationStatusModal';

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected';

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  jobLocation?: string;
  jobPayRate?: string | number;
  jobDate?: string;
  jobStartTime?: string;
  jobEndTime?: string;
  status: ApplicationStatus;
  appliedAt: string;
  respondedAt?: string | null;
  businessId?: string;
  shopName?: string;
}

interface ApplicationCardProps {
  application: Application;
  onViewDetails?: (jobId: string) => void;
  onViewStatusUpdate?: (applicationId: string) => void;
  onWithdraw?: (applicationId: string) => void;
  onMessage?: (application: Application) => void;
}

/**
 * ApplicationCard Component
 * 
 * Displays a single application card with:
 * - Job Details (Title, Location, Pay Rate)
 * - Application Status
 * - Action Buttons (View Status Update, Withdraw Application, etc.)
 * 
 * @component
 */
export function ApplicationCard({
  application,
  onViewDetails,
  onViewStatusUpdate,
  onWithdraw,
  onMessage,
}: ApplicationCardProps) {
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const withdrawMutation = useWithdrawApplication();
  const canWithdraw = application.status === 'pending';
  const canMessage = application.status === 'accepted' && application.businessId;

  const handleWithdrawClick = () => {
    setShowWithdrawDialog(true);
  };

  const handleConfirmWithdraw = () => {
    withdrawMutation.mutate(application.id, {
      onSuccess: () => {
        setShowWithdrawDialog(false);
        // Call the optional onWithdraw callback if provided
        if (onWithdraw) {
          onWithdraw(application.id);
        }
      },
    });
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200">
            Pending Review
          </Badge>
        );
      case 'accepted':
        return (
          <Badge className="bg-green-50 text-green-700 border-green-200">
            Confirmed
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-gray-50 text-gray-700 border-gray-200">
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Date TBD';
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? 'Date TBD' : format(date, "MMM d, yyyy");
    } catch {
      return 'Date TBD';
    }
  };

  const formatAppliedDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? 'Recently' : format(date, "MMM d, yyyy");
    } catch {
      return 'Recently';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow border-border">
      <CardContent className="p-5">
        {/* Header: Title and Status */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-foreground mb-1 line-clamp-2">
              {application.jobTitle}
            </h3>
            {application.shopName && (
              <p className="text-sm text-muted-foreground mb-1">
                {application.shopName}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Applied on {formatAppliedDate(application.appliedAt)}
            </p>
          </div>
          <div className="flex-shrink-0 ml-4">
            {getStatusBadge(application.status)}
          </div>
        </div>

        {/* Job Details */}
        <div className="space-y-2 text-sm text-muted-foreground mb-4">
          {application.jobLocation && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="line-clamp-1">{application.jobLocation}</span>
            </div>
          )}
          {application.jobPayRate && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="font-semibold text-foreground">
                {typeof application.jobPayRate === 'string' 
                  ? application.jobPayRate 
                  : `$${application.jobPayRate}`}
              </span>
            </div>
          )}
          {(application.jobDate || application.jobStartTime) && (
            <div className="flex items-center gap-2 min-w-0">
              <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {application.jobDate && formatDate(application.jobDate)}
                {application.jobStartTime && application.jobEndTime && 
                  ` • ${application.jobStartTime} - ${application.jobEndTime}`}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t border-border">
          {onViewDetails && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onViewDetails(application.jobId)}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          )}
          {application.status === 'pending' && (
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => setShowStatusModal(true)}
            >
              View Status Update
            </Button>
          )}
          {canMessage && onMessage && (
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => onMessage(application)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Message
            </Button>
          )}
          {canWithdraw && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleWithdrawClick}
                disabled={withdrawMutation.isPending}
              >
                <X className="h-4 w-4 mr-2" />
                {withdrawMutation.isPending ? 'Withdrawing...' : 'Withdraw'}
              </Button>
              
              <AlertDialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Withdraw Application?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to withdraw your application for "{application.jobTitle}"? 
                      This action cannot be undone and the shop owner will be notified.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={withdrawMutation.isPending}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleConfirmWithdraw}
                      disabled={withdrawMutation.isPending}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {withdrawMutation.isPending ? 'Withdrawing...' : 'Withdraw Application'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </CardContent>

      {/* Status Update Modal */}
      <ApplicationStatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        applicationId={application.id}
        applicationTitle={application.jobTitle}
      />
    </Card>
  );
}

