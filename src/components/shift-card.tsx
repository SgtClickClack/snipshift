import { useState } from "react";
import { Shift } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, DollarSign, MapPin } from "lucide-react";
import { format } from "date-fns";
import JobApplicationModal from "@/components/job-feed/job-application-modal";

interface ShiftCardProps {
  shift: Shift;
  onApply?: (shiftId: string) => void;
  showApplyButton?: boolean;
}

export default function ShiftCard({ shift, onApply, showApplyButton = false }: ShiftCardProps) {
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [isApplied, setIsApplied] = useState(false); // Local state for immediate feedback

  const handleApplyClick = () => {
    if (onApply) {
      onApply(shift.id);
    } else {
      setShowApplicationModal(true);
    }
  };

  // Convert Shift to type compatible with JobApplicationModal
  const modalJobData = {
    ...shift,
    // Ensure required fields are present
    payRate: shift.pay || shift.hourlyRate,
    payType: 'hour',
    skillsRequired: [], // Shifts might not have skills array
    businessId: shift.employerId, // Map employer to business
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h4 className="font-semibold text-neutral-900 text-lg">{shift.title}</h4>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 mb-4 text-sm">
            <div className="flex items-center text-neutral-600">
              <Calendar className="mr-2 h-4 w-4 text-primary" />
              <span>{format(new Date(shift.date), "EEE, MMM d - h:mm a")}</span>
            </div>
            <div className="flex items-center text-neutral-600">
              <DollarSign className="mr-2 h-4 w-4 text-primary" />
              <span>${shift.pay}/hour</span>
            </div>
          </div>
          
          <p className="text-neutral-700 mb-4">{shift.requirements}</p>
          
          {showApplyButton && (
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="text-xl font-bold text-neutral-900">${shift.pay}</span>
                <span className="text-neutral-600 ml-2">/hour</span>
              </div>
              <Button 
                onClick={handleApplyClick} 
                className="bg-primary hover:bg-blue-700"
                disabled={isApplied}
              >
                {isApplied ? "Applied" : "I'm Interested"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <JobApplicationModal
        isOpen={showApplicationModal}
        onClose={() => setShowApplicationModal(false)}
        onSuccess={() => setIsApplied(true)}
        job={modalJobData as any} // Cast to any to bypass strict type checking for now
      />
    </>
  );
}
