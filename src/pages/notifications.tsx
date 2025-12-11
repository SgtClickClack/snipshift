import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead, Notification } from '@/lib/api';
import { PageLoadingFallback } from '@/components/loading/loading-spinner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Info, Briefcase, Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'application_received':
      return <Briefcase className="h-5 w-5 text-emerald-600" />;
    case 'application_status_change':
      return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
    case 'SHIFT_INVITE':
      return <Briefcase className="h-5 w-5 text-blue-600" />;
    case 'SHIFT_CONFIRMED':
      return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
    case 'SHIFT_CANCELLED':
      return <Info className="h-5 w-5 text-red-600" />;
    case 'job_posted':
    case 'job_updated':
      return <Info className="h-5 w-5 text-blue-600" />;
    default:
      return <Bell className="h-5 w-5 text-steel-600" />;
  }
}

function getNotificationBadge(type: Notification['type']) {
  switch (type) {
    case 'application_received':
      return (
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
          New Application
        </Badge>
      );
    case 'application_status_change':
      return (
        <Badge className="bg-blue-50 text-blue-700 border-blue-200">
          Status Update
        </Badge>
      );
    case 'SHIFT_INVITE':
      return (
        <Badge className="bg-blue-50 text-blue-700 border-blue-200">
          Shift Invite
        </Badge>
      );
    case 'SHIFT_CONFIRMED':
      return (
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
          Confirmed
        </Badge>
      );
    case 'SHIFT_CANCELLED':
      return (
        <Badge className="bg-red-50 text-red-700 border-red-200">
          Cancelled
        </Badge>
      );
    default:
      return null;
  }
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => fetchNotifications(100),
    enabled: !!user?.id,
  });

  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications/unread-count'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications/unread-count'] });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate to link if provided
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleMarkAllRead = () => {
    markAllAsReadMutation.mutate();
  };

  if (isLoading) {
    return <PageLoadingFallback />;
  }

  const notificationsList = notifications || [];
  const unreadCount = notificationsList.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-steel-900">Notifications</h1>
            <p className="text-steel-600 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              onClick={handleMarkAllRead}
              disabled={markAllAsReadMutation.isPending}
              variant="outline"
              className="steel-button"
            >
              Mark All Read
            </Button>
          )}
        </header>

        {notificationsList.length === 0 ? (
          <Card className="card-chrome">
            <CardContent className="p-6 md:p-12 text-center">
              <Bell className="h-16 w-16 mx-auto text-steel-400 mb-4" />
              <h2 className="text-xl font-bold text-steel-900 mb-2">No notifications</h2>
              <p className="text-steel-600">You're all caught up! New notifications will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notificationsList.map((notification) => (
              <Card
                key={notification.id}
                className={`card-chrome cursor-pointer transition-colors ${
                  !notification.isRead ? 'border-l-4 border-l-emerald-500 bg-emerald-50/30' : ''
                } hover:border-steel-400`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className={`font-semibold text-steel-900 ${!notification.isRead ? 'font-bold' : ''}`}>
                          {notification.title}
                        </h3>
                        {getNotificationBadge(notification.type)}
                      </div>
                      <p className="text-steel-700 mb-2">{notification.message}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-steel-500">
                          {formatDate(notification.createdAt)}
                        </span>
                        {!notification.isRead && (
                          <span className="text-xs text-emerald-600 font-medium">New</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

