import { logger } from '@/lib/logger';
import { safeGetItem, safeRemoveItem, safeSetItem } from '@/lib/safe-storage';
import type { OnboardingStoragePayload } from '@/types/onboarding';

const STORAGE_KEY = 'HOSPOGO_ONBOARDING_CACHE';
const STORAGE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Save onboarding progress to safe storage with TTL metadata.
 */
export const saveOnboardingStorage = (
  payload: Omit<OnboardingStoragePayload, 'timestamp'>
) => {
  if (typeof window === 'undefined') return;
  const storagePayload: OnboardingStoragePayload = {
    ...payload,
    timestamp: Date.now(),
  };
  const saved = safeSetItem(STORAGE_KEY, JSON.stringify(storagePayload));
  if (!saved) {
    logger.debug('Onboarding', '[Onboarding] Storage blocked - using memory fallback');
  }
};

/**
 * Load onboarding progress from safe storage if within TTL.
 */
export const loadOnboardingStorage = (): OnboardingStoragePayload | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = safeGetItem(STORAGE_KEY);
    if (!stored) return null;

    const payload: OnboardingStoragePayload = JSON.parse(stored);
    const now = Date.now();
    const age = now - payload.timestamp;
    if (age > STORAGE_TTL_MS) {
      logger.debug('Onboarding', '[Onboarding] Storage data expired, clearing...');
      safeRemoveItem(STORAGE_KEY);
      return null;
    }

    return payload;
  } catch (error) {
    console.error('[Onboarding] Failed to parse storage data:', error);
    safeRemoveItem(STORAGE_KEY);
    return null;
  }
};

/**
 * Clear any persisted onboarding progress.
 */
export const clearOnboardingStorage = () => {
  if (typeof window === 'undefined') return;
  safeRemoveItem(STORAGE_KEY);
};
