import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
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

  // Update dropdown position on scroll/resize when open
  useEffect(() => {
    if (!isOpen || !bellRef.current) return;

    const updatePosition = () => {
      if (bellRef.current) {
        const rect = bellRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 8,
          right: window.innerWidth - rect.right
        });
      }
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

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
    if (!isOpen && bellRef.current) {
      // Calculate position for dropdown when opening
      const rect = bellRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8, // 8px gap
        right: window.innerWidth - rect.right // Desktop: align to right edge of bell
      });
    }
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

      {/* Notification Dropdown - Rendered via portal to escape stacking contexts */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          ref={dropdownRef} 
          className="fixed z-[var(--z-dropdown)] left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0" 
          style={{ 
            top: `${dropdownPosition.top}px`, 
            right: window.innerWidth >= 768 ? `${dropdownPosition.right}px` : 'auto',
            maxWidth: 'calc(100vw - 1rem)'
          }}
          data-testid="notification-dropdown"
        >
          <NotificationDropdown
            notifications={notifications}
            onNotificationClick={handleNotificationClickWrapper}
            onMarkAllRead={handleMarkAllReadWrapper}
            onClose={handleClose}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
