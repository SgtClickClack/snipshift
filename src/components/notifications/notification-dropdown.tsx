import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell, 
  Briefcase, 
  MessageCircle, 
  Heart, 
  MessageSquare, 
  PlusCircle, 
  User,
  Check,
  CheckCheck,
  CheckCircle2,
  X,
  Eye
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Notification, getNotificationIcon, getNotificationColor } from "./notification-types";

interface NotificationDropdownProps {
  notifications: Notification[];
  onNotificationClick: (notificationId: string) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
}

const iconMap = {
  briefcase: Briefcase,
  'message-circle': MessageCircle,
  heart: Heart,
  'message-square': MessageSquare,
  'plus-circle': PlusCircle,
  'check-circle': CheckCircle2,
  user: User,
  bell: Bell
};

export default function NotificationDropdown({
  notifications,
  onNotificationClick,
  onMarkAllRead,
  onClose
}: NotificationDropdownProps) {
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const sortedNotifications = notifications.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const handleNotificationClick = (notification: Notification) => {
    onNotificationClick(notification.id);
    
    // Simulate navigation if actionUrl exists
    if (notification.actionUrl) {
      // In real app, would use router to navigate
      if (import.meta.env.MODE !== 'production') {
        console.log(`Navigate to: ${notification.actionUrl}`);
      }
    }
  };

  const toggleSelectNotification = (notificationId: string) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(notificationId)) {
      newSelected.delete(notificationId);
    } else {
      newSelected.add(notificationId);
    }
    setSelectedNotifications(newSelected);
  };

  const markSelectedAsRead = () => {
    selectedNotifications.forEach(id => onNotificationClick(id));
    setSelectedNotifications(new Set());
  };

  const getIcon = (type: Notification['type']) => {
    const iconName = getNotificationIcon(type);
    const IconComponent = iconMap[iconName as keyof typeof iconMap] || Bell;
    return IconComponent;
  };

  const getTimeDisplay = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true });
    } else {
      return format(date, "MMM d, yyyy");
    }
  };

  return (
    <Card className="absolute top-12 right-0 w-96 max-w-[90vw] shadow-lg border z-50 bg-white">
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
        
        {notifications.length > 0 && (
          <div className="flex gap-2 pt-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onMarkAllRead}
                className="text-xs"
                data-testid="button-mark-all-read"
              >
                <CheckCheck className="w-3 h-3 mr-1" />
                Mark All Read
              </Button>
            )}
            {selectedNotifications.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markSelectedAsRead}
                className="text-xs"
                data-testid="button-mark-selected-read"
              >
                <Check className="w-3 h-3 mr-1" />
                Mark Selected Read ({selectedNotifications.size})
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {notifications.length === 0 ? (
          <div className="text-center py-8 px-4">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium mb-1">No notifications yet</p>
            <p className="text-sm text-gray-400">
              You'll see updates about jobs, messages, and social activity here
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="space-y-1 p-2">
              {sortedNotifications.map((notification) => {
                const IconComponent = getIcon(notification.type);
                const colorClasses = getNotificationColor(notification.type);
                const isSelected = selectedNotifications.has(notification.id);
                
                return (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-gray-50 border ${
                      notification.isRead 
                        ? 'bg-white border-transparent' 
                        : 'bg-blue-50 border-blue-200'
                    } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                    data-testid={`notification-${notification.id}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Selection Checkbox */}
                      <button
                        className="mt-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectNotification(notification.id);
                        }}
                        data-testid={`checkbox-notification-${notification.id}`}
                      >
                        <div className={`w-4 h-4 border rounded ${
                          isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </button>

                      {/* Icon */}
                      <div className={`p-2 rounded-full ${colorClasses}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            {notification.senderName && (
                              <div className="flex items-center gap-2 mb-1">
                                {notification.senderAvatar && (
                                  <Avatar className="w-6 h-6">
                                    <AvatarImage src={notification.senderAvatar} alt={notification.senderName} />
                                    <AvatarFallback className="text-xs">
                                      {notification.senderName.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                <span className="font-medium text-sm text-gray-900">
                                  {notification.senderName}
                                </span>
                              </div>
                            )}
                            {(notification as any).title && (
                              <p className={`text-xs font-semibold mb-1 ${notification.isRead ? 'text-gray-500' : 'text-gray-900'}`}>
                                {(notification as any).title}
                              </p>
                            )}
                            <p className={`text-sm ${notification.isRead ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                              {notification.message}
                            </p>
                          </div>
                          
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full mt-1 flex-shrink-0"></div>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            {getTimeDisplay(notification.timestamp)}
                          </span>
                          
                          {notification.actionUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-blue-600 hover:text-blue-700 h-auto p-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNotificationClick(notification);
                              }}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          )}
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