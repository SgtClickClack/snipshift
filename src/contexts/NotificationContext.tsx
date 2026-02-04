import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

export type NotificationType = 'info' | 'success' | 'warning' | 'offer' | 'shift_confirmed' | 'roster_update';

export interface Notification {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  timestamp: Date;
  read: boolean;
  /** Optional metadata for rich notifications */
  metadata?: {
    staffName?: string;
    shiftCount?: number;
    earnings?: number;
    venueId?: string;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (type: NotificationType, message: string, options?: {
    title?: string;
    playSound?: boolean;
    metadata?: Notification['metadata'];
  }) => void;
  /** Specialized: Notify business owner when staff accepts shifts */
  notifyShiftConfirmation: (staffName: string, shiftCount: number, options?: {
    playSound?: boolean;
  }) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  unreadCount: number;
  /** Sound settings */
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Professional ping sound for shift confirmations (subtle, business-appropriate)
const NOTIFICATION_SOUNDS = {
  shift_confirmed: '/sounds/shift-ping.mp3',
  roster_update: '/sounds/roster-ding.mp3',
  default: '/sounds/notification.mp3',
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    // Load sound preference from localStorage
    const stored = localStorage.getItem('hospogo_notification_sound');
    return stored !== 'false'; // Default to enabled
  });
  
  // Audio refs for preloaded sounds
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Preload notification sounds
  useEffect(() => {
    Object.entries(NOTIFICATION_SOUNDS).forEach(([key, src]) => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.volume = 0.3; // Subtle volume
      audioRefs.current.set(key, audio);
    });
  }, []);

  // Persist sound preference
  useEffect(() => {
    localStorage.setItem('hospogo_notification_sound', soundEnabled.toString());
  }, [soundEnabled]);

  const playNotificationSound = useCallback((type: NotificationType) => {
    if (!soundEnabled) return;
    
    const soundKey = type in NOTIFICATION_SOUNDS ? type : 'default';
    const audio = audioRefs.current.get(soundKey);
    
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Silently fail if autoplay is blocked
      });
    }
  }, [soundEnabled]);

  const addNotification = useCallback((
    type: NotificationType, 
    message: string,
    options?: {
      title?: string;
      playSound?: boolean;
      metadata?: Notification['metadata'];
    }
  ) => {
    const newNotification: Notification = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title: options?.title,
      message,
      timestamp: new Date(),
      read: false,
      metadata: options?.metadata,
    };

    setNotifications((prev) => [newNotification, ...prev]);
    
    // Play sound if requested (or default for certain types)
    if (options?.playSound || type === 'shift_confirmed' || type === 'roster_update') {
      playNotificationSound(type);
    }
  }, [playNotificationSound]);

  /**
   * Specialized notification for when staff accepts shifts
   * Triggers real-time toast + bell alert for business owner
   * 
   * Message format: "[Staff Name] just confirmed [X] shifts for next week. Your roster is moving to GREEN."
   */
  const notifyShiftConfirmation = useCallback((
    staffName: string, 
    shiftCount: number,
    options?: { playSound?: boolean }
  ) => {
    const message = `${staffName} just confirmed ${shiftCount} shift${shiftCount !== 1 ? 's' : ''} for next week. Your roster is moving to GREEN.`;
    
    addNotification('shift_confirmed', message, {
      title: 'Shifts Confirmed!',
      playSound: options?.playSound ?? true,
      metadata: {
        staffName,
        shiftCount,
      },
    });
  }, [addNotification]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true }))
    );
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Note: Real notifications are fetched via useNotifications hook from the API
  // The NotificationContext is used for local state management and transient notifications
  // Shift invites are polled from /api/notifications by the useNotifications hook

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        notifyShiftConfirmation,
        markAsRead,
        markAllAsRead,
        unreadCount,
        soundEnabled,
        setSoundEnabled,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
