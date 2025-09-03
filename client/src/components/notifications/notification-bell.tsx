import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { Notification } from "./notification-types";
import NotificationDropdown from "./notification-dropdown";

interface NotificationBellProps {
  notifications: Notification[];
  onNotificationClick: (notificationId: string) => void;
  onMarkAllRead: () => void;
  className?: string;
}

export default function NotificationBell({
  notifications,
  onNotificationClick,
  onMarkAllRead,
  className = ""
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

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

  // Animate bell when new notifications arrive
  useEffect(() => {
    if (unreadCount > 0) {
      setHasNewNotifications(true);
      const timer = setTimeout(() => setHasNewNotifications(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [unreadCount]);

  const handleBellClick = () => {
    setIsOpen(!isOpen);
  };

  const handleNotificationClick = (notificationId: string) => {
    onNotificationClick(notificationId);
  };

  const handleMarkAllRead = () => {
    onMarkAllRead();
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
        className={`relative p-2 ${hasNewNotifications ? 'animate-bounce' : ''}`}
        data-testid="notification-bell"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <Bell className={`w-5 h-5 ${isOpen ? 'text-primary' : 'text-gray-600 hover:text-gray-900'}`} />
        
        {/* Notification Badge */}
        {unreadCount > 0 && (
          <div 
            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center text-xs font-medium animate-pulse"
            data-testid="notification-badge"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}

        {/* Pulse effect for new notifications */}
        {hasNewNotifications && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75"></div>
        )}
      </Button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div ref={dropdownRef} data-testid="notification-dropdown">
          <NotificationDropdown
            notifications={notifications}
            onNotificationClick={handleNotificationClick}
            onMarkAllRead={handleMarkAllRead}
            onClose={handleClose}
          />
        </div>
      )}
    </div>
  );
}