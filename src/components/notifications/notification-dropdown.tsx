import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell, 
  Briefcase, 
  CheckCircle2,
  AlertTriangle,
  Info,
  CheckCheck,
  X
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Notification, NotificationType } from "@/contexts/NotificationContext";

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
  const navigate = useNavigate();
  const unreadCount = notifications.filter(n => !n.read).length;
  
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

  const getColorClass = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300';
      case 'offer':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-steel-100 text-steel-600 dark:bg-steel-800 dark:text-steel-300';
    }
  };

  const getTimeDisplay = (timestamp: Date) => {
    try {
      const now = new Date();
      const diffInHours = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 24) {
        return formatDistanceToNow(timestamp, { addSuffix: true });
      } else {
        return format(timestamp, "MMM d, yyyy");
      }
    } catch (e) {
      return '';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    onNotificationClick(notification.id);
    
    // If it's an offer type, navigate to Job Offers section
    if (notification.type === 'offer') {
      navigate('/professional-dashboard?view=overview');
    }
  };

  return (
    <Card className="fixed left-1/2 top-[72px] w-[95vw] max-w-[calc(100vw-1rem)] -translate-x-1/2 md:absolute md:top-12 md:right-0 md:left-auto md:w-96 md:translate-x-0 shadow-lg border z-overlay bg-card">
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
              You'll see updates about jobs, messages, and activity here
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
                    className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-steel-50 dark:hover:bg-steel-800 border ${
                      notification.read 
                        ? 'bg-card border-transparent' 
                        : 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
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
                            <p className={`text-sm font-semibold mb-1 ${notification.read ? 'text-steel-700' : 'text-steel-900'}`}>
                              {notification.type === 'offer' && 'New Job Offer'}
                              {notification.type === 'success' && 'Success'}
                              {notification.type === 'warning' && 'Warning'}
                              {notification.type === 'info' && 'Info'}
                            </p>
                            <p className={`text-sm ${notification.read ? 'text-steel-600' : 'text-steel-900 font-medium'}`}>
                              {notification.message}
                            </p>
                          </div>
                          
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full mt-1 flex-shrink-0"></div>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-steel-500">
                            {getTimeDisplay(notification.timestamp)}
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
