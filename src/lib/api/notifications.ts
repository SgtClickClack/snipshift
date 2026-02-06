/**
 * Notification API functions
 * Extracted from api.ts for domain separation
 */
import { apiRequest } from '../queryClient';

// Private helpers
async function safeJson<T>(res: Response, fallback: T): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

function toApiErrorFromModule(error: unknown, context: string): Error {
  if (error instanceof Error) {
    const wrapped = new Error(`${context}: ${error.message}`);
    (wrapped as any).isAuthError = (error as any).isAuthError;
    (wrapped as any).shouldNotReload = (error as any).shouldNotReload;
    return wrapped;
  }
  return new Error(`${context}: Unknown error`);
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

/**
 * Fetch notifications for the current user
 * @param limit - Maximum number of notifications to return (default: 50)
 */
export const fetchNotifications = async (limit: number = 50): Promise<Notification[]> => {
  try {
    const query = new URLSearchParams();
    if (limit) query.append('limit', limit.toString());
    const res = await apiRequest('GET', `/api/notifications?${query.toString()}`);
    return await safeJson(res, [] as Notification[]);
  } catch {
    return [];
  }
};

/**
 * Mark a single notification as read
 * @param id - Notification ID
 */
export const markNotificationAsRead = async (id: string): Promise<{ id: string; isRead: boolean }> => {
  try {
    const res = await apiRequest('PATCH', `/api/notifications/${id}/read`);
    return await res.json();
  } catch (error) {
    throw toApiErrorFromModule(error, 'markNotificationAsRead');
  }
};

/**
 * Mark all notifications as read for the current user
 */
export const markAllNotificationsAsRead = async (): Promise<{ count: number }> => {
  try {
    const res = await apiRequest('PATCH', '/api/notifications/read-all');
    return await res.json();
  } catch (error) {
    throw toApiErrorFromModule(error, 'markAllNotificationsAsRead');
  }
};

/**
 * Get unread notification count
 */
export const fetchUnreadNotificationCount = async (): Promise<number> => {
  try {
    const res = await apiRequest('GET', '/api/notifications/unread-count');
    const data = await safeJson<any>(res, {});
    return data?.count || 0;
  } catch {
    return 0;
  }
};
