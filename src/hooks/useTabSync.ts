import { useEffect, useState, useCallback } from 'react';

/**
 * Hook for synchronizing state across browser tabs using localStorage and storage events.
 * Useful for keeping notification badges, unread counts, etc. in sync across tabs.
 * 
 * @param key - localStorage key to use for synchronization
 * @param initialValue - Initial value if no stored value exists
 * @returns [value, setValue] - Current value and setter function
 */
export function useTabSync<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`[useTabSync] Failed to read ${key} from localStorage:`, error);
      return initialValue;
    }
  });

  // Update localStorage when value changes
  const setValueWithSync = useCallback((newValue: T) => {
    try {
      setValue(newValue);
      window.localStorage.setItem(key, JSON.stringify(newValue));
      // Dispatch custom event for same-tab listeners (if needed)
      window.dispatchEvent(new CustomEvent('tab-sync', { detail: { key, value: newValue } }));
    } catch (error) {
      console.warn(`[useTabSync] Failed to write ${key} to localStorage:`, error);
    }
  }, [key]);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = JSON.parse(e.newValue) as T;
          setValue(newValue);
        } catch (error) {
          console.warn(`[useTabSync] Failed to parse ${key} from storage event:`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  // Listen for custom events from same tab (optional, for immediate updates)
  useEffect(() => {
    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ key: string; value: T }>;
      if (customEvent.detail?.key === key) {
        setValue(customEvent.detail.value);
      }
    };

    window.addEventListener('tab-sync', handleCustomEvent);
    return () => window.removeEventListener('tab-sync', handleCustomEvent);
  }, [key]);

  return [value, setValueWithSync];
}
