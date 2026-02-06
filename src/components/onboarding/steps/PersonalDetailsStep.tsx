import { ImageUpload } from '@/components/ui/image-upload';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LocationInput } from '@/components/ui/location-input';
import type { StaffOnboardingData } from '@/types/onboarding';

type PersonalDetailsStepProps = {
  formData: StaffOnboardingData;
  userId?: string | null;
  onUpdate: (updates: Partial<StaffOnboardingData>) => void;
  onUploadError: (error: Error) => void;
};

/**
 * Step 1: Personal details for onboarding.
 */
export const PersonalDetailsStep = ({
  formData,
  userId,
  onUpdate,
  onUploadError,
}: PersonalDetailsStepProps) => (
  <div className="space-y-6">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-white mb-2">Personal Details</h2>
      <p className="text-gray-300">Add your details and a professional profile photo.</p>
    </div>
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="displayName" className="text-gray-300">
          Full Name *
        </Label>
        <Input
          id="displayName"
          value={formData.displayName}
          onChange={(e) => onUpdate({ displayName: e.target.value })}
          placeholder="Enter your full name"
          data-testid="onboarding-display-name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-gray-300">
          Phone Number *
        </Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => onUpdate({ phone: e.target.value })}
          placeholder="Enter your phone number"
          data-testid="onboarding-phone"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="location" className="text-gray-300">
          Location *
        </Label>
        <LocationInput
          value={formData.location}
          onChange={(val) => onUpdate({ location: val })}
          placeholder="City/Suburb"
          data-testid="onboarding-location"
        />
      </div>
      {userId ? (
        <div className="space-y-2">
          <Label className="text-gray-300">Profile Photo</Label>
          <ImageUpload
            currentImageUrl={formData.avatarUrl}
            onUploadComplete={(url) => onUpdate({ avatarUrl: url })}
            onUploadError={onUploadError}
            pathPrefix="users"
            entityId={userId}
            fileName="avatar"
            shape="circle"
            maxSize={5 * 1024 * 1024}
          />
        </div>
      ) : null}
    </div>
  </div>
);
