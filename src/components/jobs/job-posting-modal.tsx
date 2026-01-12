import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/useToast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, X, Calendar, DollarSign, MapPin, Users, Clock } from "lucide-react";

interface JobPostingModalProps {
  isOpen: boolean;
  onClose: () => void;
  hubId: string;
}

interface JobFormData {
  title: string;
  description: string;
  skillsRequired: string[];
  payRate: number;
  payType: "hour" | "day" | "project";
  date: string;
  startTime: string;
  endTime: string;
  location: {
    street: string;
    city: string;
    state: string;
    postcode: string;
  };
  requirements: string;
  urgency: "low" | "medium" | "high";
  maxApplicants: number;
}

const PREDEFINED_SKILLS = [
  "Hair Cutting", "Hair Styling", "Hair Coloring", "Beard Trimming", 
  "Shaving", "Hair Washing", "Blow Drying", "Perming", "Hair Extensions",
  "Makeup", "Facial Treatments", "Eyebrow Shaping", "Customer Service",
  "Product Knowledge", "Sanitation", "Cash Handling"
];

export default function JobPostingModal({ isOpen, onClose, hubId }: JobPostingModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<JobFormData>({
    title: "",
    description: "",
    skillsRequired: [],
    payRate: 25,
    payType: "hour",
    date: "",
    startTime: "09:00",
    endTime: "17:00",
    location: {
      street: "",
      city: "",
      state: "",
      postcode: ""
    },
    requirements: "",
    urgency: "medium",
    maxApplicants: 5
  });

  const [newSkill, setNewSkill] = useState("");

  const createJobMutation = useMutation({
    mutationFn: async (jobData: any) => {
      const response = await apiRequest("POST", "/api/jobs", jobData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Job posted successfully!",
        description: "Your job posting is now live and visible to professionals.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/hub/${hubId}`] });
      onClose();
      resetForm();
    },
    onError: () => {
      toast({
        title: "Failed to post job",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      skillsRequired: [],
      payRate: 25,
      payType: "hour",
      date: "",
      startTime: "09:00",
      endTime: "17:00",
      location: {
        street: "",
        city: "",
        state: "",
        postcode: ""
      },
      requirements: "",
      urgency: "medium",
      maxApplicants: 5
    });
    setNewSkill("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.date) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const jobData = {
      ...formData,
      hubId,
      createdAt: new Date().toISOString(),
      status: "active",
      applicants: [],
      views: 0
    };

    createJobMutation.mutate(jobData);
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skillsRequired.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skillsRequired: [...prev.skillsRequired, newSkill.trim()]
      }));
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skillsRequired: prev.skillsRequired.filter(skill => skill !== skillToRemove)
    }));
  };

  const addPredefinedSkill = (skill: string) => {
    if (!formData.skillsRequired.includes(skill)) {
      setFormData(prev => ({
        ...prev,
        skillsRequired: [...prev.skillsRequired, skill]
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Post a New Job
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Job Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title" className="text-sm font-medium">
                    Job Title *
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Senior Bartender - Weekend Shift"
                    required
                    data-testid="input-job-title"
                  />
                </div>
                <div>
                  <Label htmlFor="urgency" className="text-sm font-medium">
                    Urgency
                  </Label>
                  <Select value={formData.urgency} onValueChange={(value: "low" | "medium" | "high") => 
                    setFormData(prev => ({ ...prev, urgency: value }))
                  }>
                    <SelectTrigger data-testid="select-urgency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Standard posting</SelectItem>
                      <SelectItem value="medium">Medium - Good visibility</SelectItem>
                      <SelectItem value="high">High - Priority listing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium">
                  Job Description *
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the role, responsibilities, and what you're looking for..."
                  className="min-h-24"
                  required
                  data-testid="textarea-job-description"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Additional Requirements</Label>
                <Textarea
                  value={formData.requirements}
                  onChange={(e) => setFormData(prev => ({ ...prev, requirements: e.target.value }))}
                  placeholder="Any specific requirements, certifications, or preferences..."
                  className="min-h-20"
                  data-testid="textarea-requirements"
                />
              </div>
            </CardContent>
          </Card>

          {/* Skills Required */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Skills Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Add a skill..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  data-testid="input-new-skill"
                />
                <Button type="button" onClick={addSkill} variant="outline">
                  Add
                </Button>
              </div>

              {/* Predefined Skills */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Quick Add:</Label>
                <div className="flex flex-wrap gap-2">
                  {PREDEFINED_SKILLS.map(skill => (
                    <Badge
                      key={skill}
                      variant={formData.skillsRequired.includes(skill) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => addPredefinedSkill(skill)}
                      data-testid={`badge-skill-${skill.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {skill}
                      {formData.skillsRequired.includes(skill) && " âœ“"}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Selected Skills */}
              {formData.skillsRequired.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Selected Skills:</Label>
                  <div className="flex flex-wrap gap-2">
                    {formData.skillsRequired.map(skill => (
                      <Badge key={skill} variant="default" className="flex items-center gap-1">
                        {skill}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeSkill(skill)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pay and Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pay & Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="payRate" className="text-sm font-medium">
                    Pay Rate ($)
                  </Label>
                  <Input
                    id="payRate"
                    type="number"
                    value={formData.payRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, payRate: Number(e.target.value) }))}
                    min="1"
                    data-testid="input-pay-rate"
                  />
                </div>
                <div>
                  <Label htmlFor="payType" className="text-sm font-medium">
                    Pay Type
                  </Label>
                  <Select value={formData.payType} onValueChange={(value: "hour" | "day" | "project") => 
                    setFormData(prev => ({ ...prev, payType: value }))
                  }>
                    <SelectTrigger data-testid="select-pay-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hour">Per Hour</SelectItem>
                      <SelectItem value="day">Per Day</SelectItem>
                      <SelectItem value="project">Per Project</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="maxApplicants" className="text-sm font-medium">
                    Max Applicants
                  </Label>
                  <Input
                    id="maxApplicants"
                    type="number"
                    value={formData.maxApplicants}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxApplicants: Number(e.target.value) }))}
                    min="1"
                    max="50"
                    data-testid="input-max-applicants"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="date" className="text-sm font-medium">
                    Date *
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    required
                    data-testid="input-job-date"
                  />
                </div>
                <div>
                  <Label htmlFor="startTime" className="text-sm font-medium">
                    Start Time
                  </Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    data-testid="input-start-time"
                  />
                </div>
                <div>
                  <Label htmlFor="endTime" className="text-sm font-medium">
                    End Time
                  </Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    data-testid="input-end-time"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="street" className="text-sm font-medium">
                    Street Address
                  </Label>
                  <Input
                    id="street"
                    value={formData.location.street}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      location: { ...prev.location, street: e.target.value }
                    }))}
                    placeholder="123 Main Street"
                    data-testid="input-street"
                  />
                </div>
                <div>
                  <Label htmlFor="city" className="text-sm font-medium">
                    City
                  </Label>
                  <Input
                    id="city"
                    value={formData.location.city}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      location: { ...prev.location, city: e.target.value }
                    }))}
                    placeholder="Sydney"
                    data-testid="input-city"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="state" className="text-sm font-medium">
                    State
                  </Label>
                  <Input
                    id="state"
                    value={formData.location.state}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      location: { ...prev.location, state: e.target.value }
                    }))}
                    placeholder="NSW"
                    data-testid="input-state"
                  />
                </div>
                <div>
                  <Label htmlFor="postcode" className="text-sm font-medium">
                    Postcode
                  </Label>
                  <Input
                    id="postcode"
                    value={formData.location.postcode}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      location: { ...prev.location, postcode: e.target.value }
                    }))}
                    placeholder="2000"
                    data-testid="input-postcode"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createJobMutation.isPending}
              data-testid="button-post-job"
            >
              {createJobMutation.isPending ? "Posting..." : "Post Job"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}