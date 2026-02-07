import { useState, useCallback, useEffect } from 'react';
import type { CalendarSettings, ShiftPattern } from '@/components/calendar/calendar-settings-modal';
import { apiRequest } from '@/lib/queryClient';
import { isBusinessRole } from '@/lib/roles';
import { useToast } from '@/hooks/useToast';
import { logger } from '@/lib/logger';

interface UseCalendarSettingsParams {
  userId: string | undefined;
  currentRole: string | null | undefined;
  businessSettings: any;
  isSystemReady: boolean;
  isAuthLoading: boolean;
  hasFirebaseUser: boolean;
}

interface UseCalendarSettingsReturn {
  calendarSettings: CalendarSettings | null;
  isLoadingSettings: boolean;
  handleSaveSettings: (settings: CalendarSettings) => Promise<void>;
  getEarliestOpeningTime: () => Date;
}

export function useCalendarSettings({
  userId,
  currentRole,
  businessSettings,
  isSystemReady,
  isAuthLoading,
  hasFirebaseUser,
}: UseCalendarSettingsParams): UseCalendarSettingsReturn {
  const { toast } = useToast();

  const getSettingsKey = useCallback(() => {
    return `calendar-settings-${userId || 'default'}`;
  }, [userId]);

  const convertBusinessSettingsToCalendarSettings = useCallback((bs: any): CalendarSettings | null => {
    if (!bs || !bs.openingHours) return null;

    let shiftPattern: ShiftPattern = 'full-day';
    if (bs.shiftSplitType === 'halves') shiftPattern = 'half-day';
    else if (bs.shiftSplitType === 'thirds') shiftPattern = 'thirds';
    else if (bs.shiftSplitType === 'custom') shiftPattern = 'custom';

    return {
      openingHours: bs.openingHours,
      shiftPattern,
      defaultShiftLength: bs.customShiftLength,
    };
  }, []);

  const [calendarSettings, setCalendarSettings] = useState<CalendarSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  const normalizeCalendarSettingsForCompare = useCallback((settings: CalendarSettings | null) => {
    if (!settings) return null;

    const openingHours = settings.openingHours || ({} as CalendarSettings['openingHours']);
    const fallbackWeekday = { open: '09:00', close: '18:00', enabled: false };
    const fallbackWeekend = { open: '09:00', close: '17:00', enabled: false };

    return {
      shiftPattern: settings.shiftPattern,
      defaultShiftLength: settings.defaultShiftLength,
      openingHours: {
        monday: openingHours.monday || fallbackWeekday,
        tuesday: openingHours.tuesday || fallbackWeekday,
        wednesday: openingHours.wednesday || fallbackWeekday,
        thursday: openingHours.thursday || fallbackWeekday,
        friday: openingHours.friday || fallbackWeekday,
        saturday: openingHours.saturday || fallbackWeekend,
        sunday: openingHours.sunday || fallbackWeekend,
      },
    };
  }, []);

  const areCalendarSettingsEqual = useCallback(
    (a: CalendarSettings | null, b: CalendarSettings | null) => {
      return (
        JSON.stringify(normalizeCalendarSettingsForCompare(a)) ===
        JSON.stringify(normalizeCalendarSettingsForCompare(b))
      );
    },
    [normalizeCalendarSettingsForCompare]
  );

  const handleSaveSettings = useCallback(async (settings: CalendarSettings) => {
    logger.debug('Calendar', '[CALENDAR] Saving settings:', settings);
    const completeSettings: CalendarSettings = {
      ...settings,
      openingHours: {
        monday: settings.openingHours.monday || { open: '09:00', close: '18:00', enabled: false },
        tuesday: settings.openingHours.tuesday || { open: '09:00', close: '18:00', enabled: false },
        wednesday: settings.openingHours.wednesday || { open: '09:00', close: '18:00', enabled: false },
        thursday: settings.openingHours.thursday || { open: '09:00', close: '18:00', enabled: false },
        friday: settings.openingHours.friday || { open: '09:00', close: '18:00', enabled: false },
        saturday: settings.openingHours.saturday || { open: '09:00', close: '17:00', enabled: false },
        sunday: settings.openingHours.sunday || { open: '09:00', close: '17:00', enabled: false },
      },
    };
    setCalendarSettings(completeSettings);

    try {
      if (isBusinessRole(currentRole || '')) {
        await apiRequest('POST', '/api/venues/settings/hours', {
          openingHours: completeSettings.openingHours,
        });
      }

      await apiRequest('POST', '/api/shifts/templates', {
        shiftPattern: completeSettings.shiftPattern,
        defaultShiftLength: completeSettings.defaultShiftLength,
      });

      logger.debug('Calendar', '[CALENDAR] Settings saved to database');
      toast({
        title: 'Schedule saved',
        description: 'Your opening hours and shift templates have been saved.',
      });
    } catch (error) {
      console.error('[CALENDAR] Failed to save settings to database:', error);
      toast({
        title: 'Failed to save',
        description: 'Could not save your settings. Please try again.',
        variant: 'destructive',
      });
    }
  }, [currentRole, toast]);

  // Initial load: Fetch settings from database on mount
  useEffect(() => {
    let isMounted = true;

    if (!userId || !isBusinessRole(currentRole || '') || !isSystemReady || isAuthLoading || !hasFirebaseUser) {
      setIsLoadingSettings(false);
      return;
    }

    const loadSettings = async () => {
      if (!isMounted) return;
      setIsLoadingSettings(true);
      try {
        let venueHours = null;
        try {
          const venueRes = await apiRequest('GET', '/api/venues/me');
          if (venueRes.ok) {
            const venueData = await venueRes.json();
            venueHours = venueData.operatingHours;
          }
        } catch (error) {
          console.error('[CALENDAR] Failed to fetch venue hours:', error);
        }

        if (!isMounted) return;

        let settings: CalendarSettings | null = null;
        if (businessSettings) {
          const converted = convertBusinessSettingsToCalendarSettings(businessSettings);
          if (converted) settings = converted;
        }

        if (venueHours && settings) {
          const convertedHours: any = {};
          const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          for (const day of days) {
            const hours = venueHours[day];
            if (hours) {
              if (hours.closed === true) {
                convertedHours[day] = { ...settings.openingHours[day], enabled: false };
              } else {
                convertedHours[day] = {
                  open: hours.open || settings.openingHours[day]?.open || '09:00',
                  close: hours.close || settings.openingHours[day]?.close || '18:00',
                  enabled: settings.openingHours[day]?.enabled !== false,
                };
              }
            } else {
              convertedHours[day] = settings.openingHours[day] || { open: '09:00', close: '18:00', enabled: false };
            }
          }
          settings = { ...settings, openingHours: convertedHours };
        } else if (venueHours) {
          const convertedHours: any = {};
          const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          for (const day of days) {
            const hours = venueHours[day];
            if (hours) {
              if (hours.closed === true) {
                convertedHours[day] = { open: '09:00', close: '18:00', enabled: false };
              } else {
                convertedHours[day] = {
                  open: hours.open || '09:00',
                  close: hours.close || '18:00',
                  enabled: true,
                };
              }
            } else {
              convertedHours[day] = { open: '09:00', close: '18:00', enabled: false };
            }
          }
          settings = {
            openingHours: convertedHours,
            shiftPattern: 'full-day',
            defaultShiftLength: 8,
          };
        }

        if (!isMounted) return;

        if (settings) {
          setCalendarSettings((prev) => (areCalendarSettingsEqual(prev, settings) ? prev : settings));
          logger.debug('Calendar', '[CALENDAR] Settings loaded from database:', settings);
        } else {
          const key = getSettingsKey();
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            setCalendarSettings((prev) => (areCalendarSettingsEqual(prev, parsed) ? prev : parsed));
            logger.debug('Calendar', '[CALENDAR] Settings loaded from localStorage fallback:', parsed);
          }
        }
      } catch (error) {
        console.error('[CALENDAR] Error loading settings:', error);
        if (isMounted) {
          try {
            const key = getSettingsKey();
            const stored = localStorage.getItem(key);
            if (stored) {
              const parsed = JSON.parse(stored);
              setCalendarSettings((prev) => (areCalendarSettingsEqual(prev, parsed) ? prev : parsed));
            }
          } catch (localError) {
            console.error('[CALENDAR] Failed to load from localStorage:', localError);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoadingSettings(false);
        }
      }
    };

    loadSettings();

    return () => { isMounted = false; };
  }, [userId, currentRole, businessSettings, getSettingsKey, convertBusinessSettingsToCalendarSettings, areCalendarSettingsEqual, isSystemReady, isAuthLoading, hasFirebaseUser]);

  // Sync settings from storage events and custom events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === getSettingsKey() && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setCalendarSettings((prev) => (areCalendarSettingsEqual(prev, parsed) ? prev : parsed));
          logger.debug('Calendar', '[CALENDAR] Settings synced from storage event:', parsed);
        } catch (error) {
          console.error('[CALENDAR] Failed to parse settings from storage event:', error);
        }
      }
    };

    const handleCustomEvent = (e: CustomEvent) => {
      if (e.detail?.settings) {
        const nextSettings = e.detail.settings as CalendarSettings;
        setCalendarSettings((prev) => (areCalendarSettingsEqual(prev, nextSettings) ? prev : nextSettings));
        logger.debug('Calendar', '[CALENDAR] Settings synced from custom event:', e.detail.settings);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('calendarSettingsUpdated', handleCustomEvent as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('calendarSettingsUpdated', handleCustomEvent as EventListener);
    };
  }, [getSettingsKey, areCalendarSettingsEqual]);

  // Log settings changes
  useEffect(() => {
    if (calendarSettings) {
      logger.debug('Calendar', '[CALENDAR] Settings updated, will regenerate events:', {
        hasOpeningHours: !!calendarSettings.openingHours,
        enabledDays: Object.entries(calendarSettings.openingHours || {})
          .filter(([_, hours]) => hours?.enabled)
          .map(([day]) => day),
        shiftPattern: calendarSettings.shiftPattern,
      });
    }
  }, [calendarSettings]);

  const getEarliestOpeningTime = useCallback(() => {
    if (!calendarSettings?.openingHours) {
      return new Date(2020, 0, 1, 7, 0, 0);
    }

    const openingHours = calendarSettings.openingHours;
    let earliestHour = 7;
    let earliestMinute = 0;

    Object.values(openingHours).forEach((hours) => {
      if (hours?.enabled && hours?.open) {
        const [hour, minute] = hours.open.split(':').map(Number);
        const hourInMinutes = hour * 60 + minute;
        const earliestInMinutes = earliestHour * 60 + earliestMinute;

        if (hourInMinutes < earliestInMinutes) {
          earliestHour = hour;
          earliestMinute = minute;
        }
      }
    });

    return new Date(2020, 0, 1, earliestHour, earliestMinute, 0);
  }, [calendarSettings]);

  return {
    calendarSettings,
    isLoadingSettings,
    handleSaveSettings,
    getEarliestOpeningTime,
  };
}
