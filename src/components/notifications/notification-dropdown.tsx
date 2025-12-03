import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell, 
  Briefcase, 
  MessageCircle, 
  CheckCheck,
  X,
  Info
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Notification } from "@/lib/api";

interface NotificationDropdownProps {
  notifications: Notification[];
  onNotificationClick: (notificationId: string) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
}

export default function NotificationDropdown({
  notifications,
  onNotificationClick,
  onMarkAllRead,
  onClose
}: NotificationDropdownProps) {
  const unreadCount = notifications.filter(n => !n.isRead).length;
  
  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'application_received':
      case 'application_status_change':
        return Briefcase;
      case 'job_posted':
      case 'job_updated':
      case 'job_completed':
        return Bell;
      default:
        return Info;
    }
  };

  const getColorClass = (type: Notification['type']) => {
    switch (type) {
      case 'application_received':
        return 'bg-blue-100 text-blue-600';
      case 'application_status_change':
        return 'bg-green-100 text-green-600';
      case 'job_completed':
        return 'bg-yellow-100 text-yellow-600';
      default:
        return 'bg-steel-100 text-steel-600';
    }
  };

  const getTimeDisplay = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 24) {
        return formatDistanceToNow(date, { addSuffix: true });
      } else {
        return format(date, "MMM d, yyyy");
      }
    } catch (e) {
      return '';
    }
  };

  return (
    <Card className="fixed left-1/2 top-[72px] w-[95vw] -translate-x-1/2 md:absolute md:top-12 md:right-0 md:left-auto md:w-96 md:translate-x-0 max-w-[90vw] shadow-lg border z-[100] !bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            data-testid="button-close-notifications"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {notifications.length > 0 && unreadCount > 0 && (
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onMarkAllRead}
              className="text-xs w-full"
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              Mark all as read
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {notifications.length === 0 ? (
          <div className="text-center py-8 px-4">
            <Bell className="w-12 h-12 text-steel-300 mx-auto mb-3" />
            <p className="text-steel-500 font-medium mb-1">No notifications yet</p>
            <p className="text-sm text-steel-400">
              You'll see updates about jobs, messages, and social activity here
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-1 p-2">
              {notifications.map((notification) => {
                const IconComponent = getIcon(notification.type);
                const colorClass = getColorClass(notification.type);
                
                return (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-steel-50 border ${
                      notification.isRead 
                        ? 'bg-white border-transparent' 
                        : 'bg-blue-50 border-blue-200'
                    }`}
                    onClick={() => onNotificationClick(notification.id)}
                    data-testid={`notification-${notification.id}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`p-2 rounded-full flex-shrink-0 ${colorClass}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className={`text-sm font-semibold mb-1 ${notification.isRead ? 'text-steel-700' : 'text-steel-900'}`}>
                              {notification.title}
                            </p>
                            <p className={`text-sm ${notification.isRead ? 'text-steel-600' : 'text-steel-900 font-medium'}`}>
                              {notification.message}
                            </p>
                          </div>
                          
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full mt-1 flex-shrink-0"></div>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-steel-500">
                            {getTimeDisplay(notification.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
