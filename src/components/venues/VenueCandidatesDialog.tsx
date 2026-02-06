import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/useToast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, User, Calendar, CheckCircle2, XCircle, MessageSquare, Star } from "lucide-react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { isDemoMode, DEMO_SHIFT_APPLICATIONS } from "@/lib/demo-data";
import { getShiftApplications, updateApplicationStatus, type ShiftApplication } from "@/lib/api/venue";
import { apiRequest } from "@/lib/queryClient";

interface VenueCandidatesDialogProps {
  shiftId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function VenueCandidatesDialog({ shiftId, isOpen, onClose }: VenueCandidatesDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const demoMode = isDemoMode();

  const { data: applications, isLoading } = useQuery<ShiftApplication[]>({
    queryKey: ['shift-applications', shiftId],
    queryFn: () => {
      if (demoMode) {
        return Promise.resolve(DEMO_SHIFT_APPLICATIONS.filter(app => app.shiftId === shiftId));
      }
      return getShiftApplications(shiftId!);
    },
    enabled: (demoMode || !!shiftId) && isOpen,
    staleTime: demoMode ? Infinity : undefined,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ applicationId, status }: { applicationId: string; status: 'accepted' | 'rejected' }) =>
      updateApplicationStatus(applicationId, status),
    onSuccess: (_, variables) => {
      toast({
        title: 'Application status updated',
        description: variables.status === 'accepted'
          ? 'The candidate has been accepted and notified.'
          : 'The candidate has been rejected and notified.',
      });
      queryClient.invalidateQueries({ queryKey: ['shift-applications', shiftId] });
      queryClient.invalidateQueries({ queryKey: ['venue-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
    },
    onError: (_error: unknown) => {
      const message = _error instanceof Error ? _error.message : 'Please try again.';
      toast({
        title: 'Failed to update status',
        description: message,
        variant: 'destructive',
      });
    },
  });

  const handleAccept = (applicationId: string) => {
    updateStatusMutation.mutate({ applicationId, status: 'accepted' });
  };

  const handleReject = (applicationId: string) => {
    updateStatusMutation.mutate({ applicationId, status: 'rejected' });
  };

  const handleMessage = async (application: ShiftApplication) => {
    if (!application.userId) {
      toast({
        title: 'Error',
        description: 'Unable to message candidate. User information not available.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const res = await apiRequest('POST', '/api/conversations', {
        participant2Id: application.userId,
        shiftId: shiftId,
      });
      const data = await res.json();
      navigate(`/messages?conversation=${data.id}`);
      onClose();
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to start conversation. Please try again.',
        variant: 'destructive',
      });
    }
  };

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function getApplicationStatusBadge(status: ShiftApplication['status']) {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200">
            Pending
          </Badge>
        );
      case 'accepted':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
            Accepted
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200">
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Candidates</DialogTitle>
          <DialogDescription>
            Review and manage applications for this shift
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading candidates...</div>
        ) : !applications || applications.length === 0 ? (
          <div className="py-8 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No applicants yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(applications || []).map((application) => (
              <Card key={application.id} className="border border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      {application.applicant?.avatarUrl ? (
                        <OptimizedImage
                          src={application.applicant.avatarUrl}
                          alt={application.applicant.displayName}
                          fallbackType="user"
                          className="w-12 h-12 rounded-full object-cover"
                          containerClassName="rounded-full"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground mb-1">
                          {application.applicant?.displayName || application.name}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-1">{application.email}</p>
                        {application.applicant?.rating !== null && application.applicant?.rating !== undefined && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span>{application.applicant.rating.toFixed(1)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>Applied {formatDate(application.appliedAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      {getApplicationStatusBadge(application.status)}
                    </div>
                  </div>

                  {application.coverLetter && (
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words bg-muted p-3 rounded border border-border">
                        {application.coverLetter}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {application.status === 'pending' && (
                      <>
                        <Button
                          onClick={() => handleAccept(application.id)}
                          disabled={updateStatusMutation.isPending}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          size="sm"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Accept
                        </Button>
                        <Button
                          onClick={() => handleReject(application.id)}
                          disabled={updateStatusMutation.isPending}
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    )}
                    {application.userId && (
                      <Button
                        onClick={() => handleMessage(application)}
                        variant="outline"
                        size="sm"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
