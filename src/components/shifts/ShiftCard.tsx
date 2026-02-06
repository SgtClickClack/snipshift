import { useState } from "react";
import { Shift } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, DollarSign, Building2 } from "lucide-react";
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

  // Get venue name and avatar, with fallbacks
  const shopName = shift.shopName || 'Venue';
  const shopAvatarUrl = shift.shopAvatarUrl;
  const shopInitials = shopName
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const shiftDateLabel = shift.date
    ? format(new Date(shift.date), "EEE, MMM d - h:mm a")
    : "Date TBD";

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          {/* Shop Branding Header */}
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-12 w-12">
              {shopAvatarUrl && (
                <AvatarImage src={shopAvatarUrl} alt={shopName} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary">
                {shopInitials || <Building2 className="h-6 w-6" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-neutral-900 text-lg">{shopName}</h3>
                {shift.isEmergencyFill ? (
                  <span
                    className="inline-flex items-center rounded-full bg-[#BAFF39] px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-black shadow-[0_0_12px_rgba(186,255,57,0.6)] ring-1 ring-[#BAFF39]/50 animate-pulse"
                    aria-label="Emergency fill shift"
                  >
                    Emergency
                  </span>
                ) : null}
              </div>
              <h4 className="font-semibold text-neutral-700 text-base">{shift.title}</h4>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 mb-4 text-sm">
            <div className="flex items-center text-neutral-600">
              <Calendar className="mr-2 h-4 w-4 text-primary" />
              <span>{shiftDateLabel}</span>
            </div>
            <div className="flex items-center text-neutral-600">
              <DollarSign className="mr-2 h-4 w-4 text-primary" />
              <span>${shift.pay}/hour</span>
            </div>
          </div>
          
          <p className="text-neutral-700 mb-4">{shift.requirements}</p>
          
          {showApplyButton && (
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
              <div className="flex items-center">
                <span className="text-xl font-bold text-neutral-900">${shift.pay}</span>
                <span className="text-neutral-600 ml-2">/hour</span>
              </div>
              <Button 
                onClick={handleApplyClick} 
                className="w-full sm:w-auto bg-primary hover:bg-blue-700 min-h-[44px]"
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
