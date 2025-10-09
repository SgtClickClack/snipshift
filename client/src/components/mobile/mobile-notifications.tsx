import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Bell, 
  BellOff, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Info,
  X
} from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export default function MobileNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    pushEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    jobAlerts: true,
    messageAlerts: true,
    systemAlerts: true
  });

  useEffect(() => {
    // Check notification permission
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Load notifications from localStorage (in a real app, this would be from an API)
    const storedNotifications = localStorage.getItem('mobile-notifications');
    if (storedNotifications) {
      setNotifications(JSON.parse(storedNotifications));
    }

    // Load settings
    const storedSettings = localStorage.getItem('notification-settings');
    if (storedSettings) {
      setSettings(JSON.parse(storedSettings));
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications');
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    
    if (result === 'granted') {
      showWelcomeNotification();
    }
  };

  const showWelcomeNotification = () => {
    if (permission === 'granted') {
      new Notification('Notifications Enabled', {
        body: 'You\'ll now receive notifications for important updates',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png'
      });
    }
  };

  const showTestNotification = () => {
    if (permission === 'granted') {
      new Notification('Test Notification', {
        body: 'This is a test notification from SnipShift',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: 'test-notification'
      });
    }
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false
    };

    const updatedNotifications = [newNotification, ...notifications];
    setNotifications(updatedNotifications);
    localStorage.setItem('mobile-notifications', JSON.stringify(updatedNotifications));

    // Show browser notification if enabled
    if (permission === 'granted' && settings.pushEnabled) {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: notification.id
      });
    }
  };

  const markAsRead = (id: string) => {
    const updatedNotifications = notifications.map(notification =>
      notification.id === id ? { ...notification, read: true } : notification
    );
    setNotifications(updatedNotifications);
    localStorage.setItem('mobile-notifications', JSON.stringify(updatedNotifications));
  };

  const markAllAsRead = () => {
    const updatedNotifications = notifications.map(notification => ({
      ...notification,
      read: true
    }));
    setNotifications(updatedNotifications);
    localStorage.setItem('mobile-notifications', JSON.stringify(updatedNotifications));
  };

  const deleteNotification = (id: string) => {
    const updatedNotifications = notifications.filter(notification => notification.id !== id);
    setNotifications(updatedNotifications);
    localStorage.setItem('mobile-notifications', JSON.stringify(updatedNotifications));
  };

  const updateSettings = (newSettings: Partial<typeof settings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    localStorage.setItem('notification-settings', JSON.stringify(updatedSettings));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center space-x-3">
          <Bell className="h-6 w-6 text-steel-600" />
          <h1 className="text-xl font-bold text-steel-900">Notifications</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
            >
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Permission Request */}
      {permission === 'default' && (
        <div className="p-4 bg-blue-50 border-b">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-blue-900">Enable Notifications</p>
              <p className="text-sm text-blue-700">Get notified about new jobs and messages</p>
            </div>
            <Button
              size="sm"
              onClick={requestPermission}
              data-testid="mobile-enable-notifications"
            >
              Enable
            </Button>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-12 w-12 text-steel-400 mx-auto mb-4" />
            <p className="text-steel-600">No notifications yet</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={showTestNotification}
            >
              Send Test Notification
            </Button>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`cursor-pointer transition-colors ${
                  !notification.read ? 'bg-blue-50 border-blue-200' : ''
                }`}
                onClick={() => markAsRead(notification.id)}
                data-testid="mobile-notification-badge"
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-steel-900">
                          {notification.title}
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-steel-600 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-steel-500 mt-2">
                        {new Date(notification.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Notification Settings</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-steel-600">Receive notifications in browser</p>
                </div>
                <Switch
                  checked={settings.pushEnabled}
                  onCheckedChange={(checked) => updateSettings({ pushEnabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sound</p>
                  <p className="text-sm text-steel-600">Play sound for notifications</p>
                </div>
                <Switch
                  checked={settings.soundEnabled}
                  onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Vibration</p>
                  <p className="text-sm text-steel-600">Vibrate for notifications</p>
                </div>
                <Switch
                  checked={settings.vibrationEnabled}
                  onCheckedChange={(checked) => updateSettings({ vibrationEnabled: checked })}
                />
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Job Alerts</p>
                    <p className="text-sm text-steel-600">New job opportunities</p>
                  </div>
                  <Switch
                    checked={settings.jobAlerts}
                    onCheckedChange={(checked) => updateSettings({ jobAlerts: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Message Alerts</p>
                    <p className="text-sm text-steel-600">New messages</p>
                  </div>
                  <Switch
                    checked={settings.messageAlerts}
                    onCheckedChange={(checked) => updateSettings({ messageAlerts: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">System Alerts</p>
                    <p className="text-sm text-steel-600">System updates</p>
                  </div>
                  <Switch
                    checked={settings.systemAlerts}
                    onCheckedChange={(checked) => updateSettings({ systemAlerts: checked })}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  className="w-full"
                  onClick={showTestNotification}
                  disabled={permission !== 'granted'}
                >
                  Send Test Notification
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
