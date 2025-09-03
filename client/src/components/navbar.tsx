import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { authService } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Scissors, MessageCircle, LogOut, User } from "lucide-react";
import { messagingService } from "@/lib/messaging";
import MessagingModal from "@/components/messaging/messaging-modal";
import NotificationBell from "./notifications/notification-bell";
import { useNotifications } from "@/hooks/use-notifications";
import { Chat } from "@shared/firebase-schema";

export default function Navbar() {
  const [location] = useLocation();
  const user = authService.getCurrentUser();
  const [showMessaging, setShowMessaging] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userChats, setUserChats] = useState<Chat[]>([]);
  
  // Notifications
  const {
    notifications,
    handleNotificationClick,
    handleMarkAllRead,
    simulateNewNotification,
  } = useNotifications();

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const unsubscribe = messagingService.onChatsChange(user.id, (chats) => {
      setUserChats(chats);
      const totalUnread = chats.reduce((total, chat) => total + (chat.unreadCount?.[user.id] || 0), 0);
      setUnreadCount(totalUnread);
    });

    return unsubscribe;
  }, [user]);

  const handleLogout = async () => {
    await authService.logout();
    window.location.href = "/";
  };

  return (
    <nav className="bg-gradient-to-r from-steel-900 via-steel-800 to-steel-900 border-b-2 border-steel-600 shadow-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href={user ? "/home" : "/"} className="flex items-center">
            <Scissors className="text-red-accent text-2xl mr-3" />
            <span className="text-xl font-bold text-white">Snipshift</span>
          </Link>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* Notifications */}
                <NotificationBell
                  notifications={notifications}
                  onNotificationClick={handleNotificationClick}
                  onMarkAllRead={handleMarkAllRead}
                />
                
                {/* Messages */}
                <div className="relative">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowMessaging(true)}
                    data-testid="button-open-messages"
                    className="text-white hover:bg-steel-700"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-accent text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold" data-testid="unread-badge">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </div>
                <span className="text-chrome-light">{user.email}</span>
                <Button variant="ghost" onClick={handleLogout} className="text-white hover:bg-steel-700">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="text-white hover:bg-steel-700">Login</Button>
                </Link>
                <Link href="/signup">
                  <Button className="bg-red-accent hover:bg-red-accent-hover">Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      
      <MessagingModal
        isOpen={showMessaging}
        onClose={() => setShowMessaging(false)}
      />
    </nav>
  );
}
