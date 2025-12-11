import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/loading/loading-spinner';
import { useApplicationStatusUpdates, StatusUpdateType } from '@/pages/professional-dashboard/useApplicationStatusUpdates';
import { format, isToday, isYesterday } from 'date-fns';
import { CheckCircle2, Eye, FileText, AlertCircle, Clock, XCircle, CheckCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ApplicationStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string | null;
  applicationTitle?: string;
}

/**
 * ApplicationStatusModal Component
 * 
 * Displays a chronological timeline of status updates for an application.
 * Shows updates like "Submitted", "Viewed", "Shortlisted", etc.
 * 
 * @component
 */
export function ApplicationStatusModal({
  isOpen,
  onClose,
  applicationId,
  applicationTitle,
}: ApplicationStatusModalProps) {
  const { updates, isLoading, error } = useApplicationStatusUpdates(applicationId);

  const getStatusIcon = (statusType: StatusUpdateType) => {
    switch (statusType) {
      case 'Submitted':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'Viewed':
        return <Eye className="h-5 w-5 text-gray-500" />;
      case 'Shortlisted':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'Under Review':
        return <Clock className="h-5 w-5 text-amber-500" />;
      case 'Needs Info':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'Accepted':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'Rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (statusType: StatusUpdateType) => {
    switch (statusType) {
      case 'Submitted':
        return 'border-blue-200 bg-blue-50';
      case 'Viewed':
        return 'border-gray-200 bg-gray-50';
      case 'Shortlisted':
        return 'border-green-200 bg-green-50';
      case 'Under Review':
        return 'border-amber-200 bg-amber-50';
      case 'Needs Info':
        return 'border-orange-200 bg-orange-50';
      case 'Accepted':
        return 'border-green-300 bg-green-100';
      case 'Rejected':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return `Today at ${format(date, 'h:mm a')}`;
    } else if (isYesterday(date)) {
      return `Yesterday at ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, yyyy \'at\' h:mm a');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Application Status Updates</DialogTitle>
          {applicationTitle && (
            <DialogDescription>
              {applicationTitle}
            </DialogDescription>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
              <p className="ml-4 text-muted-foreground">Loading status updates...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Error loading updates
              </h3>
              <p className="text-muted-foreground max-w-md">
                {error.message || 'An error occurred while fetching status updates. Please try again later.'}
              </p>
            </div>
          ) : updates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No updates yet
              </h3>
              <p className="text-muted-foreground max-w-md">
                Status updates will appear here as your application is reviewed.
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Timeline */}
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
                
                {/* Timeline items */}
                <div className="space-y-6">
                  {updates.map((update, index) => (
                    <div key={update.id} className="relative flex gap-4">
                      {/* Icon */}
                      <div className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 bg-background ${getStatusColor(update.statusType)}`}>
                        {getStatusIcon(update.statusType)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 pb-6">
                        <div className={`rounded-lg border p-4 ${getStatusColor(update.statusType)}`}>
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-foreground">
                              {update.statusType}
                            </h4>
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                              {formatTimestamp(update.timestamp)}
                            </span>
                          </div>
                          {update.message && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {update.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

