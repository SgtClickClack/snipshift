import { useEffect, useState } from 'react';
import { useNotification, NotificationType } from '@/contexts/NotificationContext';
import { CheckCircle2, Info, AlertTriangle, Briefcase, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const TOAST_DURATION = 3000; // 3 seconds

export function NotificationToast() {
  const { notifications, markAsRead } = useNotification();
  const [visibleNotifications, setVisibleNotifications] = useState<Set<string>>(new Set());

  // Get the most recent unread notification
  const latestUnread = notifications.find((n) => !n.read && !visibleNotifications.has(n.id));

  useEffect(() => {
    if (!latestUnread) return;

    // Mark as visible
    setVisibleNotifications((prev) => new Set(prev).add(latestUnread.id));

    // Auto-hide after 3 seconds
    const timer = setTimeout(() => {
      markAsRead(latestUnread.id);
      setVisibleNotifications((prev) => {
        const next = new Set(prev);
        next.delete(latestUnread.id);
        return next;
      });
    }, TOAST_DURATION);

    return () => clearTimeout(timer);
  }, [latestUnread, markAsRead]);

  if (!latestUnread) return null;

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return CheckCircle2;
      case 'warning':
        return AlertTriangle;
      case 'offer':
        return Briefcase;
      default:
        return Info;
    }
  };

  const getStyles = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-900 dark:bg-green-950 dark:border-green-800 dark:text-green-100';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-100';
      case 'offer':
        return 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100';
      default:
        return 'bg-steel-50 border-steel-200 text-steel-900 dark:bg-steel-950 dark:border-steel-800 dark:text-steel-100';
    }
  };

  const Icon = getIcon(latestUnread.type);

  return (
    <div className="fixed bottom-4 right-4 z-[9999] animate-in slide-in-from-bottom-5 fade-in-0 duration-300">
      <div
        className={cn(
          'flex items-start gap-3 p-4 rounded-lg border shadow-lg max-w-md min-w-[320px]',
          getStyles(latestUnread.type)
        )}
      >
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{latestUnread.message}</p>
        </div>
        <button
          onClick={() => {
            markAsRead(latestUnread.id);
            setVisibleNotifications((prev) => {
              const next = new Set(prev);
              next.delete(latestUnread.id);
              return next;
            });
          }}
          className="flex-shrink-0 text-current opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

