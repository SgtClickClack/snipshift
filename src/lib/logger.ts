/**
 * Centralized logger.
 *
 * Goal: eliminate scattered `console.log/info/warn` usage while keeping
 * intentional, environment-aware logs available for debugging.
 */
type LogArgs = readonly unknown[];

function getPrefix(level: string, scope?: string) {
  return scope ? `[${level}][${scope}]` : `[${level}]`;
}

const isDev = import.meta.env.DEV;
const debugEnabled =
  isDev || String(import.meta.env.VITE_DEBUG_LOGS).toLowerCase() === 'true';

/**
 * AUTH REHYDRATION FIX: Handshake 401 paths to filter from console noise
 * These endpoints naturally return 401 during the initial Firebase handshake phase.
 */
const HANDSHAKE_401_PATTERNS = [
  '/api/me',
  '/api/bootstrap',
  '/api/notifications',
  '/api/conversations/unread-count',
  'Auth backoff',
  'handshake 401',
  'isHandshake401',
];

/**
 * FINAL_HOSPOGO_STABILIZATION_PUSH: Firebase background hiccups to filter
 * These are confirmed non-critical 400 errors from Firebase infrastructure
 * that occur during normal operation and should not pollute console/Sentry.
 */
const FIREBASE_BACKGROUND_HICCUP_PATTERNS = [
  'firebaseinstallations.googleapis.com',
  'firebase-installations',
  'Firebase Installation',
  'installations.firebaseapp.com',
];

/**
 * Check if the log message contains a Firebase background hiccup that should be filtered
 */
function isFirebaseBackgroundHiccup(args: LogArgs): boolean {
  const message = args.map(arg => 
    typeof arg === 'string' ? arg : 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  
  // Filter 400 Bad Request from firebaseinstallations.googleapis.com
  if (message.includes('400') || message.toLowerCase().includes('bad request')) {
    return FIREBASE_BACKGROUND_HICCUP_PATTERNS.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }
  
  return false;
}

/**
 * Check if the log message contains a handshake 401 pattern that should be filtered
 */
function isHandshake401Log(args: LogArgs): boolean {
  const message = args.map(arg => 
    typeof arg === 'string' ? arg : 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  
  // Only filter if it's a 401 AND matches a handshake pattern
  if (!message.includes('401')) return false;
  
  return HANDSHAKE_401_PATTERNS.some(pattern => 
    message.toLowerCase().includes(pattern.toLowerCase())
  );
}

export const logger = {
  debug(scope: string | undefined, ...args: LogArgs) {
    if (!debugEnabled) return;
    console.debug(getPrefix('DEBUG', scope), ...args);
  },
  info(scope: string | undefined, ...args: LogArgs) {
    // Keep info logs dev-only by default to avoid production noise.
    if (!isDev) return;
    console.info(getPrefix('INFO', scope), ...args);
  },
  warn(scope: string | undefined, ...args: LogArgs) {
    // Keep warn logs dev-only by default to avoid production noise.
    if (!isDev) return;
    // AUTH REHYDRATION FIX: Filter handshake 401 warnings in production
    if (isHandshake401Log(args)) return;
    // FINAL_HOSPOGO_STABILIZATION_PUSH: Filter Firebase background hiccups
    if (isFirebaseBackgroundHiccup(args)) return;
    console.warn(getPrefix('WARN', scope), ...args);
  },
  error(scope: string | undefined, ...args: LogArgs) {
    // AUTH REHYDRATION FIX: Filter handshake 401 errors to reduce noise during deployment
    // These are expected during the initial Firebase handshake phase
    if (isHandshake401Log(args)) {
      // In dev mode, log as debug instead of filtering completely
      if (isDev && debugEnabled) {
        console.debug(getPrefix('DEBUG', scope), '[Filtered handshake 401]', ...args);
      }
      return;
    }
    // FINAL_HOSPOGO_STABILIZATION_PUSH: Filter Firebase background hiccups (400 Bad Request)
    // These are confirmed non-critical errors from firebaseinstallations.googleapis.com
    if (isFirebaseBackgroundHiccup(args)) {
      if (isDev && debugEnabled) {
        console.debug(getPrefix('DEBUG', scope), '[Filtered Firebase hiccup]', ...args);
      }
      return;
    }
    // Errors should surface in all environments.
    console.error(getPrefix('ERROR', scope), ...args);
  },
};


