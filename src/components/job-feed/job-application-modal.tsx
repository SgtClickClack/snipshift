import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/useToast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Job, Shift } from "@shared/firebase-schema";
import { X, Calendar, DollarSign, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";

// Combined type for flexibility
type JobOrShift = (Job | Shift) & {
  payRate?: string | number;
  payType?: string;
  skillsRequired?: string[];
  applicants?: string[];
  hourlyRate?: string | number;
  pay?: string | number;
  requirements?: string;
  // Frontend compat helpers
  isJob?: boolean;
  isShift?: boolean;
};

interface JobApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  job: JobOrShift | null;
}

export default function JobApplicationModal({ isOpen, onClose, onSuccess, job }: JobApplicationModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [coverLetter, setCoverLetter] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const applyJobMutation = useMutation({
    mutationFn: async (applicationData: any) => {
      // New unified endpoint
      const response = await apiRequest("POST", "/api/applications", applicationData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Application Sent!",
        description: "The venue owner has been notified of your interest.",
        variant: "default",
      });
      // Invalidate job/shift lists
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      // Invalidate specific job/shift details if we have the ID
      if (job?.id) {
        queryClient.invalidateQueries({ queryKey: ['job', job.id] });
      }
      // Invalidate my applications list to show new application immediately
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      if (onSuccess) {
        onSuccess();
      }
      onClose();
      setCoverLetter("");
      setErrors({});
    },
    onError: (error: any) => {
      // Check if this is a 409 error (already applied)
      const errorMessage = error.message || '';
      const is409Error = errorMessage.startsWith('409:');
      
      if (is409Error) {
        // Extract the message from the error
        let message = 'You have already applied for this job.';
        try {
          // Try to parse JSON message first
          const jsonMatch = errorMessage.match(/\{.*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.message) {
              message = parsed.message;
            }
          } else {
            // If no JSON, try to extract plain text after "409: "
            const textMatch = errorMessage.match(/409:\s*(.+)/);
            if (textMatch && textMatch[1]) {
              message = textMatch[1].trim();
            }
          }
        } catch {
          // If parsing fails, use default message
        }
        
        // Treat 409 as success - user has already applied
        toast({
          title: "Already Applied",
          description: message,
          variant: "default",
        });
        // Invalidate queries to ensure UI is in sync
        queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
        queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
        if (job?.id) {
          queryClient.invalidateQueries({ queryKey: ['job', job.id] });
        }
        queryClient.invalidateQueries({ queryKey: ['my-applications'] });
        // Close modal and reset form
        onClose();
        setCoverLetter("");
        setErrors({});
      } else {
        // Handle other errors normally
        toast({
          title: "Failed to submit application",
          description: error.message || "Please try again later",
          variant: "destructive",
        });
      }
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!coverLetter.trim()) {
      newErrors.coverLetter = "Please write a brief message about your interest in this position";
    } else if (coverLetter.trim().length < 20) {
      newErrors.coverLetter = "Please provide a more detailed message (at least 20 characters)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !job || !user) return;

    // Detect if it's a shift or job based on properties or explicit flags
    // We assume if it has hourlyRate/requirements it might be a Shift, but let's rely on ID presence
    // For now, the caller should ensure IDs are correct.
    // Ideally we'd know the type. 
    // Let's try to infer: jobs typically don't have 'hourlyRate' as a property name in schema but 'payRate' string.
    // Shifts have 'hourlyRate' string.
    
    // Simplification: Check if we can pass both or assume shiftId if job.id looks like a shift (not reliable).
    // Better: Check keys.
    
    const isShift = 'employerId' in job || 'hourlyRate' in job; 
    
    const applicationData: any = {
      applicantId: user.id, // Updated to use generic applicantId
      message: coverLetter.trim(),
      // Add user details if needed by backend (it might infer from auth)
      email: user.email,
      name: user.displayName || user.email?.split('@')[0] || 'Applicant',
    };

    if (isShift) {
      applicationData.shiftId = job.id;
    } else {
      applicationData.jobId = job.id;
    }

    applyJobMutation.mutate(applicationData);
  };

  if (!isOpen || !job) return null;

  const hasAlreadyApplied = job.applicants?.includes(user?.id || "");

  // Helper to normalize display data
  const displayPay = job.payRate || job.pay || job.hourlyRate;
  const displayPayType = job.payType || (job.hourlyRate || job.pay ? "hour" : "");
  const loc = job.location;
  const displayLocation = !loc ? '' : typeof loc === 'string' ? loc : (() => {
    const o = loc as { city?: string; state?: string; address?: string };
    if (o.city && o.state) return `${o.city}, ${o.state}`;
    return o.address ?? '';
  })();
  const displayDesc = job.description || job.requirements;

  // Helper to safe format date
  const safeFormat = (dateStr: string | number | Date | undefined, fmt: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      return format(d, fmt);
    } catch {
      return "";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-overlay p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card z-overlay">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 flex-wrap gap-2">
          <CardTitle className="text-xl font-bold">Apply for Position</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            data-testid="button-close-application-modal"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          {/* Job/Shift Summary */}
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold text-lg mb-2" data-testid="text-job-title">
              {job.title}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground mb-3">
              <div className="flex items-center">
                <Calendar className="mr-2 h-4 w-4 text-primary" />
                <span data-testid="text-job-date">
                  {safeFormat(job.date, "EEE, MMM d, yyyy")}
                </span>
              </div>
              <div className="flex items-center">
                <DollarSign className="mr-2 h-4 w-4 text-primary" />
                <span data-testid="text-job-pay">
                  ${displayPay} {displayPayType && `/${displayPayType}`}
                </span>
              </div>
              {displayLocation && (
                <div className="flex items-center">
                  <MapPin className="mr-2 h-4 w-4 text-primary" />
                  <span data-testid="text-job-location">
                    {displayLocation}
                  </span>
                </div>
              )}
              {job.startTime && (
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-primary" />
                  <span data-testid="text-job-time">
                    {safeFormat(job.startTime, "h:mm a")}
                    <span className="text-xs text-muted-foreground ml-1">(Job Location Time)</span>
                  </span>
                </div>
              )}
            </div>
            
            <p className="text-sm mb-3" data-testid="text-job-description">
              {displayDesc}
            </p>
            
            {job.skillsRequired && job.skillsRequired.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Required Skills:</p>
                <div className="flex flex-wrap gap-1">
                  {job.skillsRequired.map((skill, index) => (
                    <Badge 
                      key={`${skill}-${index}`}
                      variant="secondary" 
                      className="text-xs"
                      data-testid={`skill-${skill.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {hasAlreadyApplied ? (
            <div className="text-center py-8">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-green-800 mb-2">
                  Application Already Submitted
                </h3>
                <p className="text-green-600">
                  You have already applied for this position. The venue owner will review your application and contact you if you're selected.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Cover Letter */}
              <div>
                <Label htmlFor="coverLetter">
                  Cover Letter / Message *
                </Label>
                <Textarea
                  id="coverLetter"
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Tell the venue owner why you're interested in this position and what makes you a good fit. Include your experience, skills, and availability..."
                  rows={6}
                  data-testid="textarea-cover-letter"
                  className={errors.coverLetter ? "border-red-500" : ""}
                />
                {errors.coverLetter && (
                  <p className="text-red-500 text-sm mt-1">{errors.coverLetter}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {coverLetter.length}/500 characters
                </p>
              </div>

              {/* Application Tips */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Application Tips:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Mention your relevant experience and skills</li>
                  <li>• Highlight your availability for the scheduled date/time</li>
                  <li>• Show enthusiasm for the opportunity</li>
                  <li>• Keep it professional but personable</li>
                </ul>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  data-testid="button-cancel-application"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={applyJobMutation.isPending || !coverLetter.trim()}
                  data-testid="button-submit-application"
                  className="bg-primary hover:bg-primary/90"
                >
                  {applyJobMutation.isPending ? "Submitting..." : "Submit Application"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
