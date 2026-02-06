import { Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { HospitalityRole } from '@/utils/hospitality';
import type { StaffOnboardingData } from '@/types/onboarding';

type RoleExperienceStepProps = {
  selectedRole: 'professional' | 'venue' | null;
  formData: StaffOnboardingData;
  roles: readonly HospitalityRole[];
  onUpdate: (updates: Partial<StaffOnboardingData>) => void;
};

/**
 * Step 3: Role and experience (venue description or professional summary).
 */
export const RoleExperienceStep = ({
  selectedRole,
  formData,
  roles,
  onUpdate,
}: RoleExperienceStepProps) => {
  if (selectedRole === 'venue') {
    return (
      <div className="space-y-6 pb-12 md:pb-0">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Venue Information</h2>
          <p className="text-gray-300">Tell us about your venue's operations in Brisbane</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="venueBio" className="text-gray-300">
              Venue Description *
            </Label>
            <Textarea
              id="venueBio"
              value={formData.bio}
              onChange={(e) => onUpdate({ bio: e.target.value })}
              placeholder="Describe your venue, atmosphere, and what makes it special in Brisbane..."
              rows={5}
              data-testid="venue-bio"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="venueCapacity" className="text-gray-300">
              Venue Capacity (optional)
            </Label>
            <Input
              id="venueCapacity"
              type="number"
              value={formData.hourlyRatePreference}
              onChange={(e) => onUpdate({ hourlyRatePreference: e.target.value })}
              placeholder="e.g. 150"
              data-testid="venue-capacity"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
            <p className="text-xs text-gray-400">Approximate capacity for staffing planning</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 md:pb-0">
      <div className="text-center">
        <h2 className="text-2xl font-black tracking-tighter text-white mb-2">Role & Experience</h2>
        <p className="text-gray-300">Tell venues what kind of shifts you're looking for.</p>
      </div>

      <div className="p-4 rounded-lg bg-[#BAFF39]/5 border border-[#BAFF39]/20">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-[#BAFF39]/20 p-2">
            <Sparkles className="h-4 w-4 text-[#BAFF39]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Clean Streak Redemption</h3>
            <p className="text-xs text-gray-400 mt-1">
              Build your reputation with reliability. Complete{' '}
              <span className="text-[#BAFF39] font-medium">5 consecutive on-time shifts</span>{' '}
              to automatically remove any demerit strikes. Your reliability is your currency.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-gray-300">Primary Role *</Label>
          <Select
            value={formData.hospitalityRole}
            onValueChange={(value) => onUpdate({ hospitalityRole: value as HospitalityRole | '' })}
          >
            <SelectTrigger aria-label="Primary Role" data-testid="onboarding-role">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="hourlyRatePreference" className="text-gray-300">
            Hourly Rate Preference (optional)
          </Label>
          <Input
            id="hourlyRatePreference"
            inputMode="decimal"
            value={formData.hourlyRatePreference}
            onChange={(e) => onUpdate({ hourlyRatePreference: e.target.value })}
            placeholder="e.g. 38"
            data-testid="onboarding-rate"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio" className="text-gray-300">
            Experience Summary *
          </Label>
          <Textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => onUpdate({ bio: e.target.value })}
            placeholder="Tell us about your hospitality experience (roles, venues, strengths)..."
            rows={5}
            data-testid="onboarding-bio"
          />
        </div>
      </div>
    </div>
  );
};
