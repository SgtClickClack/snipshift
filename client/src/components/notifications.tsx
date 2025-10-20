import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, X, MessageSquare, Briefcase, Star } from 'lucide-react';

interface Notification {
  id: string;
  type: 'new_shift' | 'application_update' | 'new_application' | 'message';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedId?: string;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'new_application',
    title: 'New Application',
    message: 'A barber has applied for your shift "Senior Barber - Weekend Shift"',
    isRead: false,
    createdAt: '2024-01-15T10:30:00Z',
    relatedId: 'shift-1'
  },
  {
    id: '2',
    type: 'application_update',
    title: 'Application Update',
    message: 'Your application has been approved for "Mobile Barber Service"',
    isRead: false,
    createdAt: '2024-01-14T15:45:00Z',
    relatedId: 'app-1'
  },
  {
    id: '3',
    type: 'new_shift',
    title: 'New Shift Available',
    message: 'A new shift matching your skills is available in Sydney',
    isRead: true,
    createdAt: '2024-01-13T09:15:00Z',
    relatedId: 'shift-2'
  },
  {
    id: '4',
    type: 'message',
    title: 'New Message',
    message: 'You have a new message from Elite Barbershop',
    isRead: true,
    createdAt: '2024-01-12T14:20:00Z',
    relatedId: 'chat-1'
  }
];

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, isRead: true }
          : notif
      )
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, isRead: true }))
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_shift':
        return <Briefcase className="h-5 w-5 text-blue-600" />;
      case 'application_update':
        return <Check className="h-5 w-5 text-green-600" />;
      case 'new_application':
        return <Bell className="h-5 w-5 text-orange-600" />;
      case 'message':
        return <MessageSquare className="h-5 w-5 text-purple-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Notifications</h2>
          <p className="text-gray-600">Stay updated on your shift applications and opportunities</p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllAsRead} variant="outline">
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Notification Bell Indicator */}
      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
        <Bell className="h-5 w-5 text-blue-600" />
        <span className="text-sm text-blue-800">
          You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {notifications.map((notification) => (
          <Card 
            key={notification.id} 
            className={`cursor-pointer transition-colors ${
              !notification.isRead ? 'border-blue-200 bg-blue-50' : ''
            }`}
            data-testid="notification-item"
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">
                      {notification.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      {!notification.isRead && (
                        <Badge variant="default" className="bg-blue-600">
                          New
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mt-1" data-testid="notification-message">
                    {notification.message}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-3">
                    {!notification.isRead && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAsRead(notification.id)}
                        data-testid="button-mark-read"
                      >
                        Mark as Read
                      </Button>
                    )}
                    
                    {notification.type === 'new_application' && (
                      <Button size="sm" variant="outline">
                        View Application
                      </Button>
                    )}
                    
                    {notification.type === 'new_shift' && (
                      <Button size="sm" variant="outline">
                        View Shift
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {notifications.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-600">You're all caught up! New notifications will appear here.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
