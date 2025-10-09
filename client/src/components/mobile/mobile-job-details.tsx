import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  DollarSign, 
  User, 
  Phone, 
  Mail,
  Calendar,
  CheckCircle
} from "lucide-react";
import { Job } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface MobileJobDetailsProps {
  job: Job;
  onBack: () => void;
}

export default function MobileJobDetails({ job, onBack }: MobileJobDetailsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showApplication, setShowApplication] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const applyJobMutation = useMutation({
    mutationFn: async (applicationData: any) => {
      const response = await apiRequest("POST", `/api/jobs/${job.id}/apply`, applicationData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Application submitted successfully!",
        description: "The hub owner has been notified of your interest.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setShowApplication(false);
      setCoverLetter("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to submit application",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const handleApply = () => {
    if (!user) {
      toast({
        title: "Please login",
        description: "You need to be logged in to apply for jobs",
        variant: "destructive",
      });
      return;
    }
    setShowApplication(true);
  };

  const handleSubmitApplication = async () => {
    if (!coverLetter.trim()) {
      toast({
        title: "Cover letter required",
        description: "Please write a brief message about your interest",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await applyJobMutation.mutateAsync({
        professionalId: user?.id,
        message: coverLetter.trim(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasAlreadyApplied = job.applicants?.includes(user?.id || "");

  if (showApplication) {
    return (
      <div className="flex flex-col h-full" data-testid="mobile-application-modal">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <Button variant="ghost" size="sm" onClick={() => setShowApplication(false)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold">Apply for Job</h2>
          <div className="w-10" />
        </div>

        {/* Application Form */}
        <div className="flex-1 overflow-y-auto p-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{job.title}</CardTitle>
              <p className="text-steel-600">{job.hubName}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="cover-letter" className="text-sm font-medium">
                  Cover Letter
                </Label>
                <Textarea
                  id="cover-letter"
                  placeholder="Tell the hub owner why you're interested in this position..."
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  className="mt-2 min-h-[120px]"
                  data-testid="mobile-cover-letter"
                />
                <p className="text-xs text-steel-600 mt-1">
                  Minimum 20 characters
                </p>
              </div>

              <div className="bg-steel-50 p-3 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Your Profile Summary</h4>
                <p className="text-sm text-steel-600">
                  {user?.bio || "No bio available"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit Button */}
        <div className="p-4 border-t bg-white">
          <Button
            className="w-full"
            onClick={handleSubmitApplication}
            disabled={isSubmitting || !coverLetter.trim()}
            data-testid="mobile-submit-application"
          >
            {isSubmitting ? "Submitting..." : "Submit Application"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="mobile-job-details">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Job Details</h1>
        <div className="w-10" />
      </div>

      {/* Job Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Job Header */}
          <div>
            <h2 className="text-2xl font-bold text-steel-900 mb-2" data-testid="job-title">
              {job.title}
            </h2>
            <p className="text-lg text-steel-600 mb-4">{job.hubName}</p>
            
            {hasAlreadyApplied && (
              <div className="flex items-center space-x-2 mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-800 text-sm font-medium">
                  You have already applied for this job
                </span>
              </div>
            )}
          </div>

          {/* Job Info Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-steel-600">Pay Rate</p>
                    <p className="font-semibold">${job.payRate}/hr</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-steel-600">Duration</p>
                    <p className="font-semibold">{job.shiftDuration}h</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm text-steel-600">Location</p>
                    <p className="font-semibold">{job.location}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-steel-600">Start Date</p>
                    <p className="font-semibold">
                      {new Date(job.startDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Job Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-steel-700 whitespace-pre-wrap" data-testid="job-description">
                {job.description}
              </p>
            </CardContent>
          </Card>

          {/* Required Skills */}
          {job.requiredSkills && job.requiredSkills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Required Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {job.requiredSkills.map((skill: string) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hub Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-steel-600" />
                <div>
                  <p className="font-medium">{job.contactName}</p>
                  <p className="text-sm text-steel-600">Hub Owner</p>
                </div>
              </div>
              
              {job.contactPhone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-steel-600" />
                  <span>{job.contactPhone}</span>
                </div>
              )}
              
              {job.contactEmail && (
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-steel-600" />
                  <span>{job.contactEmail}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Apply Button */}
      <div className="p-4 border-t bg-white">
        <Button
          className="w-full"
          onClick={handleApply}
          disabled={hasAlreadyApplied}
          data-testid="mobile-apply-button"
        >
          {hasAlreadyApplied ? "Already Applied" : "Apply for Job"}
        </Button>
      </div>
    </div>
  );
}
