import { apiRequest } from '../queryClient';

/**
 * Custom API error class with status code and details
 */
export class ApiError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, opts?: { status?: number; details?: unknown }) {
    super(message);
    this.name = 'ApiError';
    this.status = opts?.status;
    this.details = opts?.details;
  }
}

/**
 * Extract HTTP status code from error message prefix (e.g., "404: Not found")
 */
export function parseStatus(message: string): number | undefined {
  const match = message.match(/^(\d{3}):/);
  if (!match) return undefined;
  const status = Number(match[1]);
  return Number.isFinite(status) ? status : undefined;
}

/**
 * Convert unknown error to ApiError, preserving auth flags for queryClient.ts
 */
export function toApiError(error: unknown, context?: string): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof Error) {
    const status = parseStatus(error.message);
    const message = context ? `${context}: ${error.message}` : error.message;
    const apiError = new ApiError(message, { status });
    // Preserve auth signaling flags used by queryClient.ts
    (apiError as any).isAuthError = (error as any).isAuthError;
    (apiError as any).shouldNotReload = (error as any).shouldNotReload;
    return apiError;
  }

  return new ApiError(context ? `${context}: Unknown error` : 'Unknown error');
}

/**
 * Safely parse JSON response, returning fallback on parse failure
 */
export async function safeJson<T>(res: Response, fallback: T): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

/**
 * Make an authenticated FormData request with proper Content-Type handling
 * Extracted from clockOutShift to prevent auth bugs when functions move modules
 * 
 * @param method - HTTP method (POST, PATCH, PUT, etc.)
 * @param url - API endpoint URL
 * @param formData - FormData payload
 * @returns Promise resolving to Response object
 */
export async function authenticatedFormDataRequest(
  method: string,
  url: string,
  formData: FormData
): Promise<Response> {
  // Dynamic import to avoid circular dependency with firebase module
  const auth = (await import('../firebase')).auth;
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  
  const headers: Record<string, string> = {
    'X-HospoGo-CSRF': '1',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    method,
    headers,
    body: formData,
    credentials: 'include',
  });
}

// User profile types and functions

export interface UpdateProfileData {
  displayName?: string;
  bio?: string;
  phone?: string;
  location?: string;
  avatarUrl?: string;
  bannerUrl?: string;
}

/**
 * Update the current user's profile
 * @param data - Profile data to update (avatarUrl, bannerUrl, displayName, bio, phone, location)
 * @returns Promise resolving to the updated user object
 */
export async function updateUserProfile(data: UpdateProfileData | FormData) {
  try {
    const response = await apiRequest('PUT', '/api/me', data);
    return await safeJson(response, null);
  } catch (error) {
    throw toApiError(error, 'updateUserProfile');
  }
}
