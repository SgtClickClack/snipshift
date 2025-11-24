import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Job } from "@shared/firebase-schema";
import { X, Calendar, DollarSign, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";

interface JobApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
}

export default function JobApplicationModal({ isOpen, onClose, job }: JobApplicationModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [coverLetter, setCoverLetter] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const applyJobMutation = useMutation({
    mutationFn: async (applicationData: any) => {
      const response = await apiRequest("POST", `/api/jobs/${job?.id}/apply`, applicationData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Application submitted successfully!",
        description: "The shop owner has been notified of your interest.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      onClose();
      setCoverLetter("");
      setErrors({});
    },
    onError: (error: any) => {
      toast({
        title: "Failed to submit application",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
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

    const applicationData = {
      professionalId: user.id,
      message: coverLetter.trim(),
    };

    applyJobMutation.mutate(applicationData);
  };

  if (!isOpen || !job) return null;

  const hasAlreadyApplied = job.applicants?.includes(user?.id || "");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
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
          {/* Job Summary */}
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold text-lg mb-2" data-testid="text-job-title">
              {job.title}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground mb-3">
              <div className="flex items-center">
                <Calendar className="mr-2 h-4 w-4 text-primary" />
                <span data-testid="text-job-date">
                  {format(new Date(job.date), "EEE, MMM d, yyyy")}
                </span>
              </div>
              <div className="flex items-center">
                <DollarSign className="mr-2 h-4 w-4 text-primary" />
                <span data-testid="text-job-pay">
                  ${job.payRate}/{job.payType}
                </span>
              </div>
              <div className="flex items-center">
                <MapPin className="mr-2 h-4 w-4 text-primary" />
                <span data-testid="text-job-location">
                  {job.location.city}, {job.location.state}
                </span>
              </div>
              <div className="flex items-center">
                <Clock className="mr-2 h-4 w-4 text-primary" />
                <span data-testid="text-job-time">
                  {format(new Date(job.date), "h:mm a")}
                </span>
              </div>
            </div>
            
            <p className="text-sm mb-3" data-testid="text-job-description">
              {job.description}
            </p>
            
            {job.skillsRequired && job.skillsRequired.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Required Skills:</p>
                <div className="flex flex-wrap gap-1">
                  {job.skillsRequired.map((skill, index) => (
                    <Badge 
                      key={index}
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
                  You have already applied for this position. The shop owner will review your application and contact you if you're selected.
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
                  placeholder="Tell the shop owner why you're interested in this position and what makes you a good fit. Include your experience, skills, and availability..."
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