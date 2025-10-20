import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { X, Plus, MapPin, DollarSign, Calendar, Clock, ChevronDown } from "lucide-react";

interface ShiftPostingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PREDEFINED_SKILLS = [
  "Hair Cutting", "Hair Styling", "Hair Coloring", "Beard Trimming", 
  "Shaving", "Hair Washing", "Blow Drying", "Perming", "Hair Extensions",
  "Makeup", "Facial Treatments", "Eyebrow Shaping", "Customer Service",
  "Product Knowledge", "Sanitation", "Cash Handling", "Fade Techniques",
  "Mobile Services", "Learning", "Basic Cutting"
];

export default function ShiftPostingModal({ isOpen, onClose }: ShiftPostingModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requirements: "",
    location: { street: "", city: "", state: "", postcode: "" },
    payRate: "",
    payType: "hourly" as "hourly" | "daily" | "fixed",
    date: "",
    startTime: "",
    endTime: "",
    skillsRequired: [] as string[],
    newSkill: "",
    urgency: "medium" as "low" | "medium" | "high",
    maxApplicants: "5",
    deadline: ""
  });

  const [showSkillsDropdown, setShowSkillsDropdown] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createShiftMutation = useMutation({
    mutationFn: async (shiftData: any) => {
      const response = await apiRequest("POST", "/api/shifts", shiftData);
      return response.json();
    },
    onSuccess: (data: any, variables: any) => {
      const isDraft = variables.status === "draft";
      toast({
        title: isDraft ? "Draft saved successfully!" : "Shift posted successfully!",
        description: isDraft 
          ? "Your shift has been saved as a draft." 
          : "Your shift posting is now live and professionals can apply.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save shift",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      requirements: "",
      location: { street: "", city: "", state: "", postcode: "" },
      payRate: "",
      payType: "hourly",
      date: "",
      startTime: "",
      endTime: "",
      skillsRequired: [],
      newSkill: "",
      urgency: "medium",
      maxApplicants: "5",
      deadline: ""
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = "Shift title is required";
    if (!formData.description.trim()) newErrors.description = "Shift description is required";
    if (!formData.location.city.trim()) newErrors.city = "City is required";
    if (!formData.location.state.trim()) newErrors.state = "State is required";
    if (!formData.payRate.trim()) newErrors.payRate = "Pay rate is required";
    if (!formData.date) newErrors.date = "Date is required";
    if (!formData.startTime) newErrors.startTime = "Start time is required";
    if (!formData.endTime) newErrors.endTime = "End time is required";
    
    // Validate max applicants
    const maxApplicants = parseInt(formData.maxApplicants);
    if (maxApplicants < 1) newErrors.maxApplicants = "Must be at least 1";
    if (maxApplicants > 20) newErrors.maxApplicants = "Maximum 20 applicants allowed";

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

  const handleAddPredefinedSkill = (skill: string) => {
    if (!formData.skillsRequired.includes(skill)) {
      setFormData(prev => ({
        ...prev,
        skillsRequired: [...prev.skillsRequired, skill]
      }));
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skillsRequired: prev.skillsRequired.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleSubmit = (e: React.FormEvent, status: "open" | "draft" = "open") => {
    e.preventDefault();
    
    if (status === "open" && !validateForm()) return;

    const shiftData = {
      title: formData.title,
      description: formData.description,
      requirements: formData.requirements,
      location: {
        street: formData.location.street || "",
        city: formData.location.city,
        state: formData.location.state,
        postcode: formData.location.postcode || ""
      },
      payRate: parseFloat(formData.payRate) || 0,
      payType: formData.payType,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      skillsRequired: formData.skillsRequired,
      urgency: formData.urgency,
      maxApplicants: parseInt(formData.maxApplicants),
      deadline: formData.deadline ? new Date(formData.deadline).toISOString() : undefined,
      businessId: user?.id,
      status,
      applicants: []
    };

    createShiftMutation.mutate(shiftData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" data-testid="modal-shift-posting">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-bold">Post a New Shift</CardTitle>
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
            {/* Shift Title */}
            <div>
              <Label htmlFor="title">Shift Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Senior Barber - Weekend Shift"
                data-testid="input-shift-title"
                className={errors.title ? "border-red-500" : ""}
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            {/* Shift Description */}
            <div>
              <Label htmlFor="description">Shift Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the shift and expectations..."
                rows={3}
                data-testid="textarea-shift-description"
                className={errors.description ? "border-red-500" : ""}
              />
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
            </div>

            {/* Requirements */}
            <div>
              <Label htmlFor="requirements">Requirements</Label>
              <Textarea
                id="requirements"
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                placeholder="Describe specific requirements, experience needed, certifications, etc..."
                rows={3}
                data-testid="textarea-requirements"
              />
            </div>

            {/* Location */}
            <div>
              <Label className="text-base font-medium mb-3 block">Location *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="street">Street Address</Label>
                  <Input
                    id="street"
                    value={formData.location.street}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      location: { ...formData.location, street: e.target.value }
                    })}
                    placeholder="123 Main Street"
                    data-testid="input-shift-street"
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
                    placeholder="Sydney"
                    data-testid="input-shift-location"
                    className={errors.city ? "border-red-500" : ""}
                  />
                  {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.location.state}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      location: { ...formData.location, state: e.target.value }
                    })}
                    placeholder="NSW"
                    data-testid="input-shift-state"
                    className={errors.state ? "border-red-500" : ""}
                  />
                  {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
                </div>
                <div>
                  <Label htmlFor="postcode">Postcode</Label>
                  <Input
                    id="postcode"
                    value={formData.location.postcode}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      location: { ...formData.location, postcode: e.target.value }
                    })}
                    placeholder="2000"
                    data-testid="input-shift-postcode"
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
                  value={formData.payRate}
                  onChange={(e) => setFormData({ ...formData, payRate: e.target.value })}
                  placeholder="35.00"
                  data-testid="input-pay-rate"
                  className={errors.payRate ? "border-red-500" : ""}
                />
                {errors.payRate && <p className="text-red-500 text-sm mt-1">{errors.payRate}</p>}
              </div>
              <div>
                <Label htmlFor="payType">Pay Type *</Label>
                <Select
                  value={formData.payType}
                  onValueChange={(value: "hourly" | "daily" | "fixed") => 
                    setFormData({ ...formData, payType: value })
                  }
                >
                  <SelectTrigger data-testid="select-pay-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly" data-testid="option-hourly">per hour</SelectItem>
                    <SelectItem value="daily" data-testid="option-daily">per day</SelectItem>
                    <SelectItem value="fixed" data-testid="option-fixed">fixed amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Pay Rate Display */}
            {formData.payRate && (
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm font-medium" data-testid="pay-rate-display">
                  {formData.payType === "hourly" && `$${formData.payRate}/hour`}
                  {formData.payType === "daily" && `$${formData.payRate}/day`}
                  {formData.payType === "fixed" && `$${formData.payRate} total`}
                </p>
              </div>
            )}

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  data-testid="input-shift-date"
                  className={errors.date ? "border-red-500" : ""}
                />
                {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
              </div>
              <div>
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  data-testid="input-start-time"
                  className={errors.startTime ? "border-red-500" : ""}
                />
                {errors.startTime && <p className="text-red-500 text-sm mt-1">{errors.startTime}</p>}
              </div>
              <div>
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  data-testid="input-end-time"
                  className={errors.endTime ? "border-red-500" : ""}
                />
                {errors.endTime && <p className="text-red-500 text-sm mt-1">{errors.endTime}</p>}
              </div>
            </div>

            {/* Application Deadline */}
            <div>
              <Label htmlFor="deadline">Application Deadline (Optional)</Label>
              <Input
                id="deadline"
                type="datetime-local"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                data-testid="input-deadline"
              />
            </div>

            {/* Date and Duration Display */}
            {formData.date && (
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm font-medium" data-testid="date-display">
                  {new Date(formData.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
                {formData.startTime && formData.endTime && (
                  <p className="text-sm text-gray-600" data-testid="duration-display">
                    {(() => {
                      const start = new Date(`2000-01-01T${formData.startTime}`);
                      const end = new Date(`2000-01-01T${formData.endTime}`);
                      const diffMs = end.getTime() - start.getTime();
                      const diffHours = Math.round(diffMs / (1000 * 60 * 60));
                      return `${diffHours} hours`;
                    })()}
                  </p>
                )}
              </div>
            )}

            {/* Skills Required */}
            <div>
              <Label className="text-base font-medium mb-3 block">Skills Required</Label>
              
              {/* Predefined Skills Dropdown */}
              <div className="relative mb-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSkillsDropdown(!showSkillsDropdown)}
                  className="w-full justify-between"
                  data-testid="select-skills"
                >
                  <span>Select from predefined skills</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
                
                {showSkillsDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto" data-testid="skills-dropdown">
                    {PREDEFINED_SKILLS.map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => {
                          handleAddPredefinedSkill(skill);
                          setShowSkillsDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center justify-between"
                        data-testid={`skill-${skill.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <span>{skill}</span>
                        {formData.skillsRequired.includes(skill) && (
                          <span className="text-green-600">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Skill Input */}
              <div className="flex gap-2 mb-3">
                <Input
                  value={formData.newSkill}
                  onChange={(e) => setFormData({ ...formData, newSkill: e.target.value })}
                  placeholder="Add a custom skill"
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

              {/* Selected Skills Display */}
              {formData.skillsRequired.length > 0 && (
                <div className="flex flex-wrap gap-2" data-testid="selected-skills">
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

            {/* Urgency and Max Applicants */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="urgency">Urgency Level</Label>
                <Select
                  value={formData.urgency}
                  onValueChange={(value: "low" | "medium" | "high") => 
                    setFormData({ ...formData, urgency: value })
                  }
                >
                  <SelectTrigger data-testid="select-urgency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low" data-testid="option-low">Low</SelectItem>
                    <SelectItem value="medium" data-testid="option-medium">Medium</SelectItem>
                    <SelectItem value="high" data-testid="option-high">High</SelectItem>
                  </SelectContent>
                </Select>
                <div className="mt-2 flex items-center gap-2">
                  <div 
                    className={`w-3 h-3 rounded-full ${
                      formData.urgency === 'high' ? 'bg-red-500' : 
                      formData.urgency === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    data-testid="urgency-indicator"
                  />
                  <span 
                    className={`text-sm ${
                      formData.urgency === 'high' ? 'text-red-600' : 
                      formData.urgency === 'medium' ? 'text-yellow-600' : 'text-green-600'
                    }`}
                    data-testid="urgency-text"
                  >
                    {formData.urgency === 'high' ? 'High Priority' : 
                     formData.urgency === 'medium' ? 'Medium Priority' : 'Low Priority'}
                  </span>
                </div>
              </div>
              <div>
                <Label htmlFor="maxApplicants">Max Applicants</Label>
                <Input
                  id="maxApplicants"
                  type="number"
                  min="1"
                  max="20"
                  value={formData.maxApplicants}
                  onChange={(e) => setFormData({ ...formData, maxApplicants: e.target.value })}
                  data-testid="input-max-applicants"
                  className={errors.maxApplicants ? "border-red-500" : ""}
                />
                {errors.maxApplicants && <p className="text-red-500 text-sm mt-1" data-testid="error-max-applicants">{errors.maxApplicants}</p>}
                <p className="text-sm text-gray-600 mt-1" data-testid="max-applicants-display">
                  Maximum {formData.maxApplicants} applicants
                </p>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-between gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={(e) => handleSubmit(e, "draft")}
                disabled={createShiftMutation.isPending}
                data-testid="button-save-draft"
              >
                {createShiftMutation.isPending ? "Saving..." : "Save as Draft"}
              </Button>
              
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  data-testid="button-cancel-shift"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createShiftMutation.isPending}
                  data-testid="button-submit-shift"
                  className="bg-primary hover:bg-primary/90"
                >
                  {createShiftMutation.isPending ? "Posting..." : "Post Shift"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
