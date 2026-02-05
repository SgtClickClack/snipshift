/**
 * Safe Storage Utilities
 * 
 * Provides fallback when browser's Tracking Prevention blocks localStorage/sessionStorage.
 * This prevents crashes and broken redirects when storage access is denied.
 */

// In-memory fallback when browser storage is blocked
const memoryStorage: Record<string, string> = {};

// Track if storage is available (cached for performance)
let localStorageAvailable: boolean | null = null;
let sessionStorageAvailable: boolean | null = null;

/**
 * Check if localStorage is available and writable
 */
export function isLocalStorageAvailable(): boolean {
  if (localStorageAvailable !== null) return localStorageAvailable;
  
  if (typeof window === 'undefined') {
    localStorageAvailable = false;
    return false;
  }
  
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    localStorageAvailable = true;
    return true;
  } catch (e) {
    localStorageAvailable = false;
    console.warn('[SafeStorage] localStorage is blocked by browser (Tracking Prevention enabled)');
    return false;
  }
}

/**
 * Check if sessionStorage is available and writable
 */
export function isSessionStorageAvailable(): boolean {
  if (sessionStorageAvailable !== null) return sessionStorageAvailable;
  
  if (typeof window === 'undefined') {
    sessionStorageAvailable = false;
    return false;
  }
  
  try {
    const testKey = '__storage_test__';
    window.sessionStorage.setItem(testKey, testKey);
    window.sessionStorage.removeItem(testKey);
    sessionStorageAvailable = true;
    return true;
  } catch (e) {
    sessionStorageAvailable = false;
    console.warn('[SafeStorage] sessionStorage is blocked by browser (Tracking Prevention enabled)');
    return false;
  }
}

/**
 * Safe localStorage.getItem with memory fallback
 */
export function safeGetItem(key: string, useSession: boolean = false): string | null {
  try {
    if (useSession) {
      if (isSessionStorageAvailable()) {
        return window.sessionStorage.getItem(key);
      }
    } else {
      if (isLocalStorageAvailable()) {
        return window.localStorage.getItem(key);
      }
    }
  } catch (e) {
    // Storage blocked - fall through to memory
  }
  
  return memoryStorage[key] ?? null;
}

/**
 * Safe localStorage.setItem with memory fallback
 */
export function safeSetItem(key: string, value: string, useSession: boolean = false): boolean {
  // Always store in memory as backup
  memoryStorage[key] = value;
  
  try {
    if (useSession) {
      if (isSessionStorageAvailable()) {
        window.sessionStorage.setItem(key, value);
        return true;
      }
    } else {
      if (isLocalStorageAvailable()) {
        window.localStorage.setItem(key, value);
        return true;
      }
    }
  } catch (e) {
    // Storage blocked - memory fallback already applied
  }
  
  return false; // Indicates storage was blocked, but memory fallback is active
}

/**
 * Safe localStorage.removeItem with memory cleanup
 */
export function safeRemoveItem(key: string, useSession: boolean = false): void {
  delete memoryStorage[key];
  
  try {
    if (useSession) {
      if (isSessionStorageAvailable()) {
        window.sessionStorage.removeItem(key);
      }
    } else {
      if (isLocalStorageAvailable()) {
        window.localStorage.removeItem(key);
      }
    }
  } catch (e) {
    // Storage blocked - memory already cleaned
  }
}

/**
 * Check if any storage is available
 */
export function isStorageAvailable(): boolean {
  return isLocalStorageAvailable() || isSessionStorageAvailable();
}

/**
 * Get a warning message if storage is blocked (for displaying to users)
 */
export function getStorageBlockedWarning(): string | null {
  if (!isLocalStorageAvailable() || !isSessionStorageAvailable()) {
    return 'Your browser is blocking storage access (Tracking Prevention). Some features may not work correctly. Consider adding this site to your browser\'s exceptions.';
  }
  return null;
}
