import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OpeningHours } from '@/components/calendar/calendar-settings-modal';
import ShiftStructurePreview, { ShiftSplitType } from './shift-structure-preview';
import { apiRequest } from '@/lib/queryClient';
import { Clock, Save } from 'lucide-react';

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

const DEFAULT_OPENING_HOURS: OpeningHours = {
  monday: { open: '09:00', close: '18:00', enabled: true },
  tuesday: { open: '09:00', close: '18:00', enabled: true },
  wednesday: { open: '09:00', close: '18:00', enabled: true },
  thursday: { open: '09:00', close: '18:00', enabled: true },
  friday: { open: '09:00', close: '18:00', enabled: true },
  saturday: { open: '09:00', close: '17:00', enabled: true },
  sunday: { open: '09:00', close: '17:00', enabled: false },
};

interface BusinessSettingsData {
  openingHours: OpeningHours;
  shiftSplitType: ShiftSplitType;
  customShiftLength?: number;
}

interface BusinessSettingsProps {
  initialData?: BusinessSettingsData;
  onSave?: (data: BusinessSettingsData) => void;
}

export default function BusinessSettings({ initialData, onSave }: BusinessSettingsProps) {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [openingHours, setOpeningHours] = useState<OpeningHours>(
    initialData?.openingHours || DEFAULT_OPENING_HOURS
  );
  const [shiftSplitType, setShiftSplitType] = useState<ShiftSplitType>(
    initialData?.shiftSplitType || 'full-day'
  );
  const [customShiftLength, setCustomShiftLength] = useState<number>(
    initialData?.customShiftLength || 8
  );
  const [previewDay, setPreviewDay] = useState<string>('monday');

  // Load settings from user profile or localStorage
  useEffect(() => {
    if (initialData) {
      setOpeningHours(initialData.openingHours);
      setShiftSplitType(initialData.shiftSplitType);
      setCustomShiftLength(initialData.customShiftLength || 8);
    } else if (user?.businessSettings) {
      // Load from user profile if available
      const settings = user.businessSettings as any;
      setOpeningHours(settings.openingHours || DEFAULT_OPENING_HOURS);
      setShiftSplitType(settings.shiftSplitType || 'full-day');
      setCustomShiftLength(settings.customShiftLength || 8);
    } else if (typeof window !== 'undefined') {
      // Try to load from localStorage as fallback
      try {
        const key = `business-settings-${user?.id || 'default'}`;
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          setOpeningHours(parsed.openingHours || DEFAULT_OPENING_HOURS);
          setShiftSplitType(parsed.shiftSplitType || 'full-day');
          setCustomShiftLength(parsed.customShiftLength || 8);
        }
      } catch (error) {
        console.error('Failed to load business settings:', error);
      }
    }
  }, [initialData, user?.id, user?.businessSettings]);

  const handleDayToggle = (day: string) => {
    setOpeningHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled,
      },
    }));
  };

  const handleTimeChange = (day: string, field: 'open' | 'close', value: string) => {
    setOpeningHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleCopyToAll = (sourceDay: string) => {
    const sourceHours = openingHours[sourceDay];
    if (!sourceHours) {
      toast({
        title: 'Error',
        description: 'Source day hours not found.',
        variant: 'destructive',
      });
      return;
    }

    const updated: OpeningHours = { ...openingHours };
    DAYS_OF_WEEK.forEach(day => {
      if (day.key !== sourceDay) {
        const existingDay = updated[day.key];
        updated[day.key] = {
          open: sourceHours.open,
          close: sourceHours.close,
          enabled: existingDay?.enabled !== undefined ? existingDay.enabled : true,
        };
      }
    });
    setOpeningHours(updated);
    toast({
      title: 'Hours copied',
      description: `${DAYS_OF_WEEK.find(d => d.key === sourceDay)?.label} hours copied to all days.`,
    });
  };

  // Validate settings before save
  const validateSettings = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Validate opening hours
    DAYS_OF_WEEK.forEach(day => {
      const hours = openingHours[day.key];
      if (hours?.enabled) {
        if (!hours.open || !hours.close) {
          errors.push(`${day.label}: Opening and closing times are required`);
        } else {
          const openTime = new Date(`2000-01-01T${hours.open}`);
          const closeTime = new Date(`2000-01-01T${hours.close}`);
          if (isNaN(openTime.getTime()) || isNaN(closeTime.getTime()) || closeTime <= openTime) {
            errors.push(`${day.label}: Invalid time range`);
            } else {
              // Validate shift split for enabled days
              const totalMinutes = (closeTime.getTime() - openTime.getTime()) / (1000 * 60);
              if (shiftSplitType === 'thirds' && totalMinutes < 180) {
                errors.push(`${day.label}: Need at least 3 hours for thirds split`);
              } else if (shiftSplitType === 'halves' && totalMinutes < 120) {
                errors.push(`${day.label}: Need at least 2 hours for halves split`);
              } else if (shiftSplitType === 'custom') {
                if (customShiftLength <= 0 || customShiftLength > 24) {
                  errors.push(`${day.label}: Shift length must be between 0.5 and 24 hours`);
                } else if (customShiftLength * 60 > totalMinutes) {
                  errors.push(`${day.label}: Shift length (${customShiftLength}h) exceeds opening hours (${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m)`);
                } else if (customShiftLength * 60 < 15) {
                  errors.push(`${day.label}: Shift length must be at least 15 minutes`);
                }
              }
            }
        }
      }
    });

    return { valid: errors.length === 0, errors };
  };

  const handleSave = async () => {
    const validation = validateSettings();
    if (!validation.valid) {
      toast({
        title: 'Validation Error',
        description: validation.errors.join(', '),
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const settingsData: BusinessSettingsData = {
        openingHours,
        shiftSplitType,
        customShiftLength: shiftSplitType === 'custom' ? customShiftLength : undefined,
      };

      // Save to database via API
      // Note: This assumes the API endpoint accepts businessSettings as a JSON field
      // You may need to extend the /api/me endpoint to accept this field
      await apiRequest('PUT', '/api/me', {
        businessSettings: settingsData,
      });

      // Also save to localStorage as backup
      if (typeof window !== 'undefined') {
        const key = `business-settings-${user?.id || 'default'}`;
        localStorage.setItem(key, JSON.stringify(settingsData));
      }

      // Refresh user to get updated data
      if (refreshUser) {
        await refreshUser();
      }

      toast({
        title: 'Settings saved',
        description: 'Your business settings have been saved successfully.',
      });

      onSave?.(settingsData);
    } catch (error: any) {
      console.error('Failed to save business settings:', error);
      toast({
        title: 'Failed to save settings',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Get enabled days for preview selector
  const enabledDays = useMemo(() => {
    return DAYS_OF_WEEK.filter(day => openingHours[day.key]?.enabled);
  }, [openingHours]);

  return (
    <div className="space-y-6">
      {/* Opening Hours Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Opening Hours
          </CardTitle>
          <CardDescription>
            Set your shop's operating hours for each day of the week.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {DAYS_OF_WEEK.map((day) => {
              const hours = openingHours[day.key];
              return (
                <div
                  key={day.key}
                  className="flex items-center gap-4 p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-2 w-24">
                    <input
                      type="checkbox"
                      id={`enable-${day.key}`}
                      checked={hours?.enabled || false}
                      onChange={() => handleDayToggle(day.key)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label
                      htmlFor={`enable-${day.key}`}
                      className="font-medium cursor-pointer"
                    >
                      {day.label}
                    </Label>
                  </div>

                  {hours?.enabled ? (
                    <>
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`${day.key}-open`} className="text-sm w-12">
                            Open:
                          </Label>
                          <Input
                            id={`${day.key}-open`}
                            type="time"
                            value={hours.open}
                            onChange={(e) => handleTimeChange(day.key, 'open', e.target.value)}
                            className="w-32"
                          />
                        </div>
                        <span className="text-muted-foreground">-</span>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`${day.key}-close`} className="text-sm w-12">
                            Close:
                          </Label>
                          <Input
                            id={`${day.key}-close`}
                            type="time"
                            value={hours.close}
                            onChange={(e) => handleTimeChange(day.key, 'close', e.target.value)}
                            className="w-32"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyToAll(day.key)}
                      >
                        Copy to All
                      </Button>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Closed</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Shift Configuration Section */}
      <Card>
        <CardHeader>
          <CardTitle>Shift Structure Configuration</CardTitle>
          <CardDescription>
            Configure how your opening hours are split into shift segments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">Shift Split Type</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Choose how you want to split the day into shifts.
              </p>
            </div>

            <RadioGroup
              value={shiftSplitType}
              onValueChange={(value) => setShiftSplitType(value as ShiftSplitType)}
            >
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent transition-colors">
                  <RadioGroupItem value="full-day" id="full-day" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="full-day" className="cursor-pointer font-medium">
                      Single Shift (Full Day)
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      One shift covering the full opening hours
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent transition-colors">
                  <RadioGroupItem value="halves" id="halves" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="halves" className="cursor-pointer font-medium">
                      Split into Halves
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Day split into two shifts (morning and afternoon)
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent transition-colors">
                  <RadioGroupItem value="thirds" id="thirds" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="thirds" className="cursor-pointer font-medium">
                      Split into Thirds
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Day split into three shifts (morning, afternoon, and close)
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent transition-colors">
                  <RadioGroupItem value="custom" id="custom" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="custom" className="cursor-pointer font-medium">
                      Fixed Duration
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create shifts of a specific duration (e.g., 4 hours). Partial shifts will be created for remainders.
                    </p>
                    {shiftSplitType === 'custom' && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="shift-length" className="text-sm">
                            Shift Length:
                          </Label>
                          <Input
                            id="shift-length"
                            type="number"
                            min="0.5"
                            max="24"
                            step="0.5"
                            value={customShiftLength || ''}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              if (!isNaN(value) && value > 0 && value <= 24) {
                                setCustomShiftLength(value);
                              } else if (e.target.value === '') {
                                // Allow empty input for better UX while typing
                                setCustomShiftLength(0);
                              }
                            }}
                            onBlur={(e) => {
                              // Ensure a valid value on blur
                              const value = parseFloat(e.target.value);
                              if (isNaN(value) || value <= 0) {
                                setCustomShiftLength(4);
                              } else if (value > 24) {
                                setCustomShiftLength(24);
                              }
                            }}
                            className="w-24"
                            placeholder="4"
                          />
                          <span className="text-sm text-muted-foreground">hours</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Shifts will be generated starting from opening time. Any remainder will create a partial final shift.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Preview Section */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">Preview</Label>
              <p className="text-sm text-muted-foreground mt-1">
                See how your shift structure looks for a selected day.
              </p>
            </div>

            {enabledDays.length > 0 ? (
              <>
                <div className="flex items-center gap-2">
                  <Label htmlFor="preview-day" className="text-sm">
                    Preview Day:
                  </Label>
                  <Select value={previewDay} onValueChange={setPreviewDay}>
                    <SelectTrigger id="preview-day" className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {enabledDays.map(day => (
                        <SelectItem key={day.key} value={day.key}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <ShiftStructurePreview
                  openingHours={openingHours}
                  shiftSplitType={shiftSplitType}
                  selectedDay={previewDay}
                  customShiftLength={customShiftLength}
                />
              </>
            ) : (
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground text-center">
                  Enable at least one day to see the preview
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}

