import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import NotificationDropdown from "./notification-dropdown";
import { useNotifications } from "@/hooks/useNotifications";
import { useTabSync } from "@/hooks/useTabSync";

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({
  className = ""
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { notifications, unreadCount, handleNotificationClick, handleMarkAllRead } = useNotifications();
  
  // Sync unread count across tabs for notification badges
  const [syncedUnreadCount, setSyncedUnreadCount] = useTabSync('hospogo_notification_unread_count', unreadCount);
  
  // Update synced count when unreadCount changes
  useEffect(() => {
    setSyncedUnreadCount(unreadCount);
  }, [unreadCount, setSyncedUnreadCount]);
  
  // Use synced count for badge display (ensures cross-tab synchronization)
  const displayUnreadCount = syncedUnreadCount;

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        bellRef.current && 
        dropdownRef.current &&
        !bellRef.current.contains(event.target as Node) &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Animate bell when new notifications arrive (check synced count for cross-tab updates)
  useEffect(() => {
    if (displayUnreadCount > 0) {
      setHasNewNotifications(true);
      const timer = setTimeout(() => setHasNewNotifications(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [displayUnreadCount]);

  const handleBellClick = () => {
    setIsOpen(!isOpen);
  };

  const handleNotificationClickWrapper = (notificationId: string) => {
    handleNotificationClick(notificationId);
    setIsOpen(false);
  };

  const handleMarkAllReadWrapper = () => {
    handleMarkAllRead();
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        ref={bellRef}
        variant="ghost"
        size="sm"
        onClick={handleBellClick}
        className={`relative p-2 hover:bg-steel-700 ${hasNewNotifications ? 'animate-bounce' : ''}`}
        data-testid="notification-bell"
        aria-label={`Notifications ${displayUnreadCount > 0 ? `(${displayUnreadCount} unread)` : ''}`}
      >
        <Bell className={`w-5 h-5 text-white hover:text-steel-200`} />
        
        {/* Notification Badge - synced across tabs */}
        {displayUnreadCount > 0 && (
          <div 
            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full min-w-5 h-5 flex items-center justify-center text-xs font-medium animate-pulse"
            data-testid="notification-badge"
          >
            {displayUnreadCount > 99 ? '99+' : displayUnreadCount}
          </div>
        )}

        {/* Pulse effect for new notifications */}
        {hasNewNotifications && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75"></div>
        )}
      </Button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div ref={dropdownRef} className="relative z-[9999]" data-testid="notification-dropdown">
          <NotificationDropdown
            notifications={notifications}
            onNotificationClick={handleNotificationClickWrapper}
            onMarkAllRead={handleMarkAllReadWrapper}
            onClose={handleClose}
          />
        </div>
      )}
    </div>
  );
}
