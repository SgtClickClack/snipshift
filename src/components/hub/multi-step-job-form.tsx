import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Save, Send, Calendar, DollarSign, MapPin } from "lucide-react";
import { format } from "date-fns";

interface JobFormData {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  skillsRequired: string;
  payRate: string;
  payType: "hourly" | "daily" | "commission" | "fixed";
  location: { city: string; state: string; isRemote: boolean };
  status: "draft" | "published";
}

interface MultiStepJobFormProps {
  formData: JobFormData;
  onFormDataChange: (data: JobFormData) => void;
  onSubmit: (data: JobFormData) => void;
  onSaveDraft: (data: JobFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  editingJob?: boolean;
}

const AUSTRALIAN_STATES = [
  "NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"
];

const COMMON_SKILLS = [
  "Hair Cutting", "Beard Trimming", "Hair Styling", "Hair Color", 
  "Highlights", "Perms", "Shampoo & Conditioning", "Blow Dry",
  "Razor Work", "Fade Cuts", "Scissor Work", "Customer Service"
];

export default function MultiStepJobForm({
  formData,
  onFormDataChange,
  onSubmit,
  onSaveDraft,
  onCancel,
  isSubmitting,
  editingJob = false
}: MultiStepJobFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    formData.skillsRequired ? formData.skillsRequired.split(', ').filter(s => s) : []
  );

  const updateFormData = (updates: Partial<JobFormData>) => {
    onFormDataChange({ ...formData, ...updates });
  };

  const addSkill = (skill: string) => {
    if (!selectedSkills.includes(skill)) {
      const newSkills = [...selectedSkills, skill];
      setSelectedSkills(newSkills);
      updateFormData({ skillsRequired: newSkills.join(', ') });
    }
  };

  const removeSkill = (skill: string) => {
    const newSkills = selectedSkills.filter(s => s !== skill);
    setSelectedSkills(newSkills);
    updateFormData({ skillsRequired: newSkills.join(', ') });
  };

  const canProceedToStep = (step: number) => {
    switch (step) {
      case 1:
        return formData.title.trim() !== '' && formData.description.trim() !== '';
      case 2:
        return formData.date !== '' && formData.startTime !== '' && formData.payRate !== '' && formData.location.city !== '';
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 3 && canProceedToStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    updateFormData({ status: "published" });
    onSubmit({ ...formData, status: "published" });
  };

  const handleSaveDraft = () => {
    updateFormData({ status: "draft" });
    onSaveDraft({ ...formData, status: "draft" });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{editingJob ? 'Edit Job Posting' : 'Create New Job Posting'}</span>
          <Button variant="ghost" onClick={onCancel} data-testid="button-cancel-job-form">
            ✕
          </Button>
        </CardTitle>
        
        {/* Step Progress Indicator */}
        <div className="flex items-center justify-between mt-4">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === currentStep 
                  ? 'bg-primary text-white' 
                  : step < currentStep 
                    ? 'bg-green-500 text-white' 
                    : 'bg-steel-200 text-steel-600'
              }`}>
                {step < currentStep ? '✓' : step}
              </div>
              {step < 3 && (
                <div className={`w-20 h-1 mx-2 ${
                  step < currentStep ? 'bg-green-500' : 'bg-steel-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        
        <div className="text-sm text-muted-foreground mt-2">
          {currentStep === 1 && "Step 1: Job Details"}
          {currentStep === 2 && "Step 2: Compensation & Location"}
          {currentStep === 3 && "Step 3: Review & Publish"}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Step 1: Basic Details */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => updateFormData({ title: e.target.value })}
                placeholder="e.g., Weekend Barber Needed"
                data-testid="input-job-title"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Job Description *</Label>
              <Textarea
                id="description"
                rows={4}
                value={formData.description}
                onChange={(e) => updateFormData({ description: e.target.value })}
                placeholder="Describe the role, responsibilities, and what you're looking for in a professional..."
                data-testid="input-job-description"
              />
            </div>
            
            <div>
              <Label>Required Skills</Label>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {COMMON_SKILLS.map((skill) => (
                    <Button
                      key={skill}
                      type="button"
                      variant={selectedSkills.includes(skill) ? "default" : "outline"}
                      size="sm"
                      onClick={() => selectedSkills.includes(skill) ? removeSkill(skill) : addSkill(skill)}
                      data-testid={`button-skill-${skill.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {skill}
                    </Button>
                  ))}
                </div>
                
                {selectedSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-sm text-muted-foreground">Selected:</span>
                    {selectedSkills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="cursor-pointer" onClick={() => removeSkill(skill)}>
                        {skill} ✕
                      </Badge>
                    ))}
                  </div>
                )}
                
                <Input
                  placeholder="Add custom skill and press Enter..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const skill = e.currentTarget.value.trim();
                      if (skill) {
                        addSkill(skill);
                        e.currentTarget.value = '';
                      }
                    }
                  }}
                  data-testid="input-custom-skill"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Compensation & Location */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => updateFormData({ date: e.target.value })}
                  data-testid="input-job-date"
                />
              </div>
              <div>
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => updateFormData({ startTime: e.target.value })}
                  data-testid="input-job-start-time"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="endTime">End Time (Optional)</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => updateFormData({ endTime: e.target.value })}
                data-testid="input-job-end-time"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payRate">Pay Rate *</Label>
                <Input
                  id="payRate"
                  type="number"
                  step="0.01"
                  value={formData.payRate}
                  onChange={(e) => updateFormData({ payRate: e.target.value })}
                  placeholder="0.00"
                  data-testid="input-job-pay-rate"
                />
              </div>
              <div>
                <Label htmlFor="payType">Pay Type *</Label>
                <Select value={formData.payType} onValueChange={(value: any) => updateFormData({ payType: value })}>
                  <SelectTrigger data-testid="select-pay-type">
                    <SelectValue placeholder="Select pay type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Per Hour</SelectItem>
                    <SelectItem value="daily">Per Day</SelectItem>
                    <SelectItem value="commission">Commission</SelectItem>
                    <SelectItem value="fixed">Fixed Rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.location.city}
                  onChange={(e) => updateFormData({ 
                    location: { ...formData.location, city: e.target.value }
                  })}
                  placeholder="City"
                  data-testid="input-job-city"
                />
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Select 
                  value={formData.location.state} 
                  onValueChange={(value) => updateFormData({ 
                    location: { ...formData.location, state: value }
                  })}
                >
                  <SelectTrigger data-testid="select-job-state">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUSTRALIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review & Publish */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Review Your Job Posting</h3>
            
            <div className="bg-muted/50 rounded-lg p-4 space-y-4">
              <div>
                <h4 className="font-semibold text-lg">{formData.title}</h4>
                <p className="text-muted-foreground mt-1">{formData.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4 text-primary" />
                  <span>{format(new Date(formData.date), "EEE, MMM d, yyyy")} at {formData.startTime}</span>
                </div>
                <div className="flex items-center">
                  <DollarSign className="mr-2 h-4 w-4 text-primary" />
                  <span>${formData.payRate}/{formData.payType}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="mr-2 h-4 w-4 text-primary" />
                  <span>{formData.location.city}, {formData.location.state}</span>
                </div>
              </div>
              
              {selectedSkills.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Required Skills:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedSkills.map((skill) => (
                      <Badge key={skill} variant="outline">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Ready to publish?</h4>
              <p className="text-sm text-blue-600">
                Once published, your job will be visible to all professionals on Snipshift. 
                You can edit or remove it at any time from your dashboard.
              </p>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-between items-center pt-6 border-t">
          <div>
            {currentStep > 1 && (
              <Button variant="outline" onClick={handlePrevious} data-testid="button-previous-step">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSubmitting}
              data-testid="button-save-draft"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
            
            {currentStep < 3 ? (
              <Button 
                onClick={handleNext}
                disabled={!canProceedToStep(currentStep)}
                data-testid="button-next-step"
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90"
                data-testid="button-publish-job"
              >
                <Send className="mr-2 h-4 w-4" />
                {isSubmitting ? "Publishing..." : "Publish Job"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}