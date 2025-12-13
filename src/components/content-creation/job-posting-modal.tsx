import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/useToast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { X, Plus, MapPin, DollarSign, Calendar, Clock } from "lucide-react";

interface JobPostingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function JobPostingModal({ isOpen, onClose }: JobPostingModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: { street: "", city: "", state: "", zipCode: "" },
    payRate: "",
    payType: "hour" as "hour" | "day" | "shift",
    date: "",
    time: "",
    skillsRequired: [] as string[],
    newSkill: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createJobMutation = useMutation({
    mutationFn: async (jobData: any) => {
      const response = await apiRequest("POST", "/api/jobs", jobData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Job posted successfully!",
        description: "Your job posting is now live and professionals can apply.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to post job",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      location: { street: "", city: "", state: "", zipCode: "" },
      payRate: "",
      payType: "hour",
      date: "",
      time: "",
      skillsRequired: [],
      newSkill: ""
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = "Job title is required";
    
    if (!formData.description.trim()) {
      newErrors.description = "Job description is required";
    } else if (formData.description.trim().length < 10) {
      newErrors.description = "Job description must be at least 10 characters long";
    }
    
    if (!formData.location.city.trim()) newErrors.city = "City is required";
    if (!formData.location.state.trim()) newErrors.state = "State is required";
    
    if (!formData.payRate.trim()) {
      newErrors.payRate = "Pay rate is required";
    } else {
      const payRateNum = parseFloat(formData.payRate);
      if (isNaN(payRateNum) || payRateNum <= 0) {
        newErrors.payRate = "Pay rate must be a positive number";
      }
    }
    
    if (!formData.date) newErrors.date = "Date is required";
    if (!formData.time) newErrors.time = "Time is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddSkill = () => {
    if (formData.newSkill.trim() && !formData.skillsRequired.includes(formData.newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skillsRequired: [...prev.skillsRequired, prev.newSkill.trim()],
        newSkill: ""
      }));
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skillsRequired: prev.skillsRequired.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const jobData = {
      title: formData.title,
      description: formData.description,
      location: {
        street: formData.location.street || "",
        city: formData.location.city,
        state: formData.location.state,
        zipCode: formData.location.zipCode || ""
      },
      payRate: parseFloat(formData.payRate),
      payType: formData.payType,
      date: new Date(`${formData.date}T${formData.time}`).toISOString(),
      skillsRequired: formData.skillsRequired,
      hubId: user?.id,
      status: "open",
      applicants: []
    };

    createJobMutation.mutate(jobData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-overlay p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 flex-wrap gap-2">
          <CardTitle className="text-xl font-bold">Post a New Job</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            data-testid="button-close-modal"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Job Title */}
            <div>
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Full-time Barber, Chair Rental"
                data-testid="input-job-title"
                className={errors.title ? "border-red-500" : ""}
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            {/* Job Description */}
            <div>
              <Label htmlFor="description">Job Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the role, responsibilities, and requirements..."
                rows={4}
                data-testid="textarea-job-description"
                className={errors.description ? "border-red-500" : ""}
              />
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
            </div>

            {/* Location */}
            <div>
              <Label className="text-base font-medium mb-3 block">Location *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="street">Street Address</Label>
                  <Input
                    id="street"
                    value={formData.location.street}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      location: { ...formData.location, street: e.target.value }
                    })}
                    placeholder="123 Main St"
                    data-testid="input-job-street"
                  />
                </div>
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.location.city}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      location: { ...formData.location, city: e.target.value }
                    })}
                    placeholder="City"
                    data-testid="input-job-city"
                    className={errors.city ? "border-red-500" : ""}
                  />
                  {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.location.state}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      location: { ...formData.location, state: e.target.value }
                    })}
                    placeholder="State"
                    data-testid="input-job-state"
                    className={errors.state ? "border-red-500" : ""}
                  />
                  {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
                </div>
                <div>
                  <Label htmlFor="zipCode">Zip Code</Label>
                  <Input
                    id="zipCode"
                    type="text"
                    inputMode="numeric"
                    value={formData.location.zipCode}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      location: { ...formData.location, zipCode: e.target.value }
                    })}
                    placeholder="12345"
                    data-testid="input-job-zip"
                  />
                </div>
              </div>
            </div>

            {/* Pay Rate and Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payRate">Pay Rate * ($)</Label>
                <Input
                  id="payRate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.payRate}
                  onChange={(e) => setFormData({ ...formData, payRate: e.target.value })}
                  placeholder="25.00"
                  data-testid="input-pay-rate"
                  className={errors.payRate ? "border-red-500" : ""}
                />
                {errors.payRate && <p className="text-red-500 text-sm mt-1">{errors.payRate}</p>}
              </div>
              <div>
                <Label htmlFor="payType">Pay Type *</Label>
                <Select
                  value={formData.payType}
                  onValueChange={(value: "hour" | "day" | "shift") => 
                    setFormData({ ...formData, payType: value })
                  }
                >
                  <SelectTrigger data-testid="select-pay-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hour">per hour</SelectItem>
                    <SelectItem value="day">per day</SelectItem>
                    <SelectItem value="shift">per shift</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  data-testid="input-job-date"
                  className={errors.date ? "border-red-500" : ""}
                />
                {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
              </div>
              <div>
                <Label htmlFor="time">Time *</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  data-testid="input-job-time"
                  className={errors.time ? "border-red-500" : ""}
                />
                {errors.time && <p className="text-red-500 text-sm mt-1">{errors.time}</p>}
              </div>
            </div>

            {/* Skills Required */}
            <div>
              <Label className="text-base font-medium mb-3 block">Skills Required</Label>
              <div className="flex gap-2 mb-3">
                <Input
                  value={formData.newSkill}
                  onChange={(e) => setFormData({ ...formData, newSkill: e.target.value })}
                  placeholder="Add a skill (e.g., Fades, Beard Trim)"
                  data-testid="input-new-skill"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                />
                <Button
                  type="button"
                  onClick={handleAddSkill}
                  variant="outline"
                  data-testid="button-add-skill"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.skillsRequired.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.skillsRequired.map((skill) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleRemoveSkill(skill)}
                      data-testid={`skill-badge-${skill.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {skill} <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-testid="button-cancel-job"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createJobMutation.isPending}
                data-testid="button-post-job"
                className="bg-primary hover:bg-primary/90"
              >
                {createJobMutation.isPending ? "Posting..." : "Post Job"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}