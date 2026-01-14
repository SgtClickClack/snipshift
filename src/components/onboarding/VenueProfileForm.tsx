/**
 * VenueProfileForm Component
 * 
 * Step 2 of venue onboarding: Collects venue operational data
 * including name, address (Brisbane-specific), and operating hours
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LocationInput } from '@/components/ui/location-input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import type { VenueOnboardingData } from '@/pages/Onboarding';

interface VenueProfileFormProps {
  formData: VenueOnboardingData;
  updateFormData: (updates: Partial<VenueOnboardingData>) => void;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const;

export function VenueProfileForm({ formData, updateFormData }: VenueProfileFormProps) {
  const updateAddress = (updates: Partial<VenueOnboardingData['address']>) => {
    updateFormData({
      address: { ...formData.address, ...updates },
    });
  };

  const updateOperatingHours = (day: string, updates: Partial<VenueOnboardingData['operatingHours'][string]>) => {
    updateFormData({
      operatingHours: {
        ...formData.operatingHours,
        [day]: { ...formData.operatingHours[day], ...updates },
      },
    });
  };

  const isPostcodeValid = () => {
    const postcode = parseInt(formData.address.postcode);
    return !isNaN(postcode) && postcode >= 4000 && postcode <= 4199;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Venue Profile</h2>
        <p className="text-gray-300">Tell us about your venue in Brisbane</p>
      </div>

      <div className="space-y-4">
        {/* Venue Name */}
        <div className="space-y-2">
          <Label htmlFor="venueName" className="text-gray-300">
            Venue Name *
          </Label>
          <Input
            id="venueName"
            value={formData.venueName}
            onChange={(e) => updateFormData({ venueName: e.target.value })}
            placeholder="e.g. The Testing Tavern"
            data-testid="venue-name"
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        </div>

        {/* Address Fields */}
        <div className="space-y-4">
          <Label className="text-gray-300">Address *</Label>
          
          <div className="space-y-2">
            <Input
              value={formData.address.street}
              onChange={(e) => updateAddress({ street: e.target.value })}
              placeholder="Street Address"
              data-testid="venue-address-street"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Input
                value={formData.address.suburb}
                onChange={(e) => updateAddress({ suburb: e.target.value })}
                placeholder="Suburb"
                data-testid="venue-address-suburb"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Input
                value={formData.address.postcode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  updateAddress({ postcode: value });
                }}
                placeholder="Postcode"
                data-testid="venue-address-postcode"
                className="bg-zinc-800 border-zinc-700 text-white"
                maxLength={4}
              />
              {formData.address.postcode && !isPostcodeValid() && (
                <Alert className="bg-yellow-900/30 border-yellow-500/50">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <AlertDescription className="text-yellow-200 text-sm">
                    Brisbane postcodes are 4000-4199
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {/* City, State, Country (auto-filled for Brisbane) */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Input
                value={formData.address.city}
                disabled
                className="bg-zinc-900 border-zinc-700 text-gray-400"
                data-testid="venue-address-city"
              />
              <Label className="text-xs text-gray-500">City</Label>
            </div>
            <div className="space-y-2">
              <Input
                value={formData.address.state}
                disabled
                className="bg-zinc-900 border-zinc-700 text-gray-400"
                data-testid="venue-address-state"
              />
              <Label className="text-xs text-gray-500">State</Label>
            </div>
            <div className="space-y-2">
              <Input
                value={formData.address.country}
                disabled
                className="bg-zinc-900 border-zinc-700 text-gray-400"
                data-testid="venue-address-country"
              />
              <Label className="text-xs text-gray-500">Country (ISO 3166-1)</Label>
            </div>
          </div>
        </div>

        {/* Liquor License Number (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="liquorLicenseNumber" className="text-gray-300">
            Liquor License Number (Optional)
          </Label>
          <Input
            id="liquorLicenseNumber"
            value={formData.liquorLicenseNumber}
            onChange={(e) => updateFormData({ liquorLicenseNumber: e.target.value })}
            placeholder="e.g. 123456"
            data-testid="venue-liquor-license"
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        </div>

        {/* Operating Hours */}
        <div className="space-y-4">
          <Label className="text-gray-300">Operating Hours *</Label>
          <div className="space-y-3">
            {DAYS_OF_WEEK.map(({ key, label }) => {
              const dayHours = formData.operatingHours[key];
              const isClosed = dayHours?.closed;

              return (
                <div key={key} className="flex items-center gap-4 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <div className="w-24 text-sm text-gray-300 font-medium">{label}</div>
                  <div className="flex-1 flex items-center gap-2">
                    {isClosed ? (
                      <span className="text-gray-400 text-sm">Closed</span>
                    ) : (
                      <>
                        <Input
                          type="time"
                          value={dayHours?.open || ''}
                          onChange={(e) => updateOperatingHours(key, { open: e.target.value, closed: false })}
                          className="bg-zinc-700 border-zinc-600 text-white w-32"
                          data-testid={`venue-hours-${key}-open`}
                        />
                        <span className="text-gray-400">to</span>
                        <Input
                          type="time"
                          value={dayHours?.close || ''}
                          onChange={(e) => updateOperatingHours(key, { close: e.target.value, closed: false })}
                          className="bg-zinc-700 border-zinc-600 text-white w-32"
                          data-testid={`venue-hours-${key}-close`}
                        />
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (isClosed) {
                        updateOperatingHours(key, { closed: false, open: '09:00', close: '17:00' });
                      } else {
                        updateOperatingHours(key, { closed: true, open: undefined, close: undefined });
                      }
                    }}
                    className="text-xs text-brand-neon hover:text-brand-neon/80 px-2 py-1"
                    data-testid={`venue-hours-${key}-toggle`}
                  >
                    {isClosed ? 'Open' : 'Close'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
