import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNotifications } from "@/hooks/use-notifications";
import { Bell, Zap, Users, MessageSquare, Heart, Briefcase } from "lucide-react";

export default function NotificationDemo() {
  const { 
    notifications, 
    unreadCount, 
    handleNotificationClick, 
    handleMarkAllRead, 
    simulateNewNotification 
  } = useNotifications();

  const [customNotification, setCustomNotification] = useState({
    type: 'new_message' as const,
    senderName: '',
    message: '',
  });

  const notificationTypes = [
    { value: 'new_application', label: 'Job Application', icon: Briefcase, color: 'bg-green-100 text-green-800' },
    { value: 'new_message', label: 'New Message', icon: MessageSquare, color: 'bg-blue-100 text-blue-800' },
    { value: 'post_like', label: 'Post Like', icon: Heart, color: 'bg-red-100 text-red-800' },
    { value: 'new_comment', label: 'New Comment', icon: MessageSquare, color: 'bg-purple-100 text-purple-800' },
    { value: 'job_posted', label: 'Job Posted', icon: Briefcase, color: 'bg-orange-100 text-orange-800' },
    { value: 'profile_view', label: 'Profile View', icon: Users, color: 'bg-steel-100 text-steel-800' },
  ];

  const recentNotifications = notifications.slice(0, 5);
  const readNotifications = notifications.filter(n => n.isRead).length;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-steel-900 mb-2 flex items-center justify-center gap-2">
          <Bell className="w-8 h-8 text-primary" />
          Notification System Demo
        </h1>
        <p className="text-steel-600 max-w-2xl mx-auto">
          Experience Snipshift's real-time notification system that keeps users connected to important 
          platform activities including job applications, messages, and social interactions.
        </p>
      </div>

      {/* Notification Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">{notifications.length}</div>
            <div className="text-sm text-steel-600">Total Notifications</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600 mb-1">{unreadCount}</div>
            <div className="text-sm text-steel-600">Unread</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">{readNotifications}</div>
            <div className="text-sm text-steel-600">Read</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {Math.round((readNotifications / notifications.length) * 100) || 0}%
            </div>
            <div className="text-sm text-steel-600">Engagement</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notification Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Notification Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button 
                onClick={simulateNewNotification}
                className="w-full"
                data-testid="button-simulate-notification"
              >
                <Bell className="w-4 h-4 mr-2" />
                Simulate Random Notification
              </Button>
              
              {unreadCount > 0 && (
                <Button 
                  onClick={handleMarkAllRead}
                  variant="outline"
                  className="w-full"
                  data-testid="button-mark-all-read-demo"
                >
                  Mark All {unreadCount} Notifications as Read
                </Button>
              )}
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3">Create Custom Notification</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="notification-type">Type</Label>
                  <Select 
                    value={customNotification.type} 
                    onValueChange={(value: any) => 
                      setCustomNotification(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {notificationTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sender-name">Sender Name</Label>
                  <Input
                    id="sender-name"
                    value={customNotification.senderName}
                    onChange={(e) => setCustomNotification(prev => ({ 
                      ...prev, 
                      senderName: e.target.value 
                    }))}
                    placeholder="e.g., John Smith"
                  />
                </div>

                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={customNotification.message}
                    onChange={(e) => setCustomNotification(prev => ({ 
                      ...prev, 
                      message: e.target.value 
                    }))}
                    placeholder="Custom notification message..."
                    rows={3}
                  />
                </div>

                <Button
                  onClick={() => {
                    // Create custom notification logic would go here
                    simulateNewNotification();
                  }}
                  disabled={!customNotification.senderName || !customNotification.message}
                  className="w-full"
                >
                  Send Custom Notification
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Notifications Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Recent Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentNotifications.length === 0 ? (
              <div className="text-center py-8 text-steel-500">
                <Bell className="w-12 h-12 text-steel-300 mx-auto mb-3" />
                <p>No notifications yet</p>
                <p className="text-sm">Click "Simulate Random Notification" to see the system in action</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentNotifications.map((notification) => {
                  const notificationType = notificationTypes.find(t => t.value === notification.type);
                  const IconComponent = notificationType?.icon || Bell;
                  
                  return (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:bg-steel-50 dark:hover:bg-steel-800 ${
                        notification.isRead ? 'bg-white dark:bg-steel-900' : 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800'
                      }`}
                      onClick={() => handleNotificationClick(notification.id)}
                      data-testid={`demo-notification-${notification.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${notificationType?.color}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {notification.senderName}
                            </span>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            )}
                          </div>
                          <p className="text-sm text-steel-600 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-steel-400 mt-1">
                            {new Date(notification.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {notifications.length > 5 && (
                  <div className="text-center pt-3 border-t">
                    <p className="text-sm text-steel-500">
                      +{notifications.length - 5} more notifications
                    </p>
                    <p className="text-xs text-steel-400">
                      Click the bell icon in the navbar to view all
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notification Types Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notificationTypes.map((type) => {
              const IconComponent = type.icon;
              return (
                <div key={type.value} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className={`p-2 rounded-full ${type.color}`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{type.label}</div>
                    <div className="text-xs text-steel-500 capitalize">
                      {type.value.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle>System Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-steel-900 mb-3">Core Features</h4>
              <ul className="space-y-2 text-sm text-steel-600">
                <li>✓ Real-time notification badge with unread count</li>
                <li>✓ Interactive dropdown with notification list</li>
                <li>✓ Mark individual or all notifications as read</li>
                <li>✓ Visual indicators for read/unread status</li>
                <li>✓ Auto-simulation for demo purposes</li>
                <li>✓ Responsive design for all devices</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-steel-900 mb-3">Notification Triggers</h4>
              <ul className="space-y-2 text-sm text-steel-600">
                <li>→ New job applications received</li>
                <li>→ Incoming direct messages</li>
                <li>→ Social post likes and comments</li>
                <li>→ New job postings in your area</li>
                <li>→ Profile views and interactions</li>
                <li>→ System announcements and updates</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
