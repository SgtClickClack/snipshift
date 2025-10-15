import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Scissors, MessageCircle, LogOut, User, Menu, X, ChevronDown } from "lucide-react";
import { messagingService } from "@/lib/messaging";
import MessagingModal from "@/components/messaging/messaging-modal";
import NotificationBell from "./notifications/notification-bell";
import { useNotifications } from "@/hooks/use-notifications";
import { Chat } from "@shared/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { getDashboardRoute } from "@/lib/roles";

export default function Navbar() {
  const { user, logout, setCurrentRole } = useAuth();
  const navigate = useNavigate();
  const [showMessaging, setShowMessaging] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userChats, setUserChats] = useState<Chat[]>([]);
  const persistedRoles: string[] = (() => {
    try {
      const raw = localStorage.getItem('selectedRoles');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  })();
  
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
    await logout();
    window.location.href = "/";
  };

  const handleSwitchRole = async (role: string) => {
    if (!user) {
      console.log("No user found for role switching");
      return;
    }
    
    console.log("Switching to role:", role, "User roles:", user.roles);
    
    try {
      const response = await apiRequest("PATCH", `/api/users/${user.id}/current-role`, { role });
      console.log("Role switch response:", response);
      
      setCurrentRole(role as any);
      try {
        const merged = Array.from(new Set([...(user.roles || []), role]));
        localStorage.setItem('selectedRoles', JSON.stringify(merged));
      } catch {}
      
      // Navigate to the selected role's dashboard immediately
      const target = getDashboardRoute(role as any);
      console.log("Navigating to:", target);
      navigate(target);
    } catch (e) {
      console.error("Role switch failed:", e);
      // Show user feedback about the error
      alert(`Failed to switch to ${role} role. Please try again.`);
    }
  };

  return (
    <nav className="bg-gradient-to-r from-steel-900 via-steel-800 to-steel-900 border-b-2 border-steel-600 shadow-xl sticky top-0 z-50" data-testid="nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <button
            type="button"
            className="flex items-center"
            onClick={() => {
              if (!user) {
                navigate("/");
                return;
              }
              const target = user.currentRole ? getDashboardRoute(user.currentRole) : "/role-selection";
              navigate(target);
            }}
            data-testid="nav-home"
          >
            <Scissors className="text-red-accent text-2xl mr-3" />
            <span className="text-xl font-bold text-white">Snipshift</span>
          </button>

          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden text-white hover:bg-steel-700"
                aria-label="Toggle mobile menu"
              >
                {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            )}
            {user ? (
              <>
                {/* Role Switcher */}
                <div className="hidden md:block">
                  <Select value={user.currentRole || undefined} onValueChange={handleSwitchRole}>
                    <SelectTrigger className="w-[200px] bg-steel-800 text-white border-steel-600">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {(["professional","hub","brand"] as const)
                        .filter((role) => (user?.roles || []).includes(role) || persistedRoles.includes(role))
                        .map((r) => (
                        <SelectItem key={r} value={r}>
                          {r.charAt(0).toUpperCase() + r.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Desktop Navigation - Hidden on Mobile */}
                <div className="hidden md:flex md:items-center md:space-x-4">
                  {/* Navigation Links */}
                  <Link to="/shift-feed" className="text-white hover:text-red-accent transition-colors" data-testid="nav-shift-feed">
                    Shift Feed
                  </Link>
                  <Link to="/tournaments" className="text-white hover:text-red-accent transition-colors" data-testid="nav-tournaments">
                    Tournaments
                  </Link>
                  <Link to="/applications" className="text-white hover:text-red-accent transition-colors" data-testid="nav-my-applications">
                    My Applications
                  </Link>
                  <Link to="/analytics" className="text-white hover:text-red-accent transition-colors" data-testid="nav-analytics">
                    Analytics
                  </Link>
                  
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
                  
                  {/* User Profile */}
                  <div className="flex items-center space-x-3" data-testid="user-menu">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.profileImage} alt={user.displayName || user.email} />
                      <AvatarFallback className="bg-red-accent text-white text-sm">
                        {user.displayName?.split(' ').map(n => n[0]).join('') || user.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-chrome-light text-sm">{user.displayName || user.email}</span>
                  </div>
                  
                  <Button variant="ghost" onClick={handleLogout} className="text-white hover:bg-steel-700" data-testid="button-logout">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                  {user?.roles?.includes('admin') && (
                    <Button
                      variant="ghost"
                      className="text-white hover:bg-steel-700"
                      data-testid="link-admin-panel"
                      onClick={() => navigate('/admin')}
                    >
                      Admin Panel
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="text-white hover:bg-steel-700">Login</Button>
                </Link>
                <Link to="/signup">
                  <Button className="bg-red-accent hover:bg-red-accent-hover">Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {user && showMobileMenu && (
        <div className="md:hidden bg-steel-800 border-t border-steel-600">
          <div className="px-4 py-4 space-y-4">
            {/* User Info */}
            <div className="flex items-center space-x-3 pb-3 border-b border-steel-600">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.profileImage} alt={user.displayName || user.email} />
                <AvatarFallback className="bg-red-accent text-white">
                  {user.displayName?.split(' ').map(n => n[0]).join('') || user.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-white font-medium">{user.displayName || user.email}</p>
                <p className="text-chrome-light text-sm capitalize">{user.currentRole}</p>
              </div>
            </div>

            {/* Role Switcher */}
            <div className="space-y-2">
              <p className="text-chrome-light text-sm font-medium">Switch Role</p>
              <div className="grid grid-cols-1 gap-2">
                {(["professional","hub","brand"] as const)
                  .filter((role) => (user?.roles || []).includes(role) || persistedRoles.includes(role))
                  .map((role) => (
                    <Button
                      key={role}
                      variant={user.currentRole === role ? "accent" : "ghost"}
                      size="sm"
                      onClick={() => {
                        handleSwitchRole(role);
                        setShowMobileMenu(false);
                      }}
                      className={`w-full justify-start text-left ${
                        user.currentRole === role
                          ? "bg-red-accent text-white"
                          : "text-white hover:bg-steel-700"
                      }`}
                    >
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </Button>
                  ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <p className="text-chrome-light text-sm font-medium">Quick Actions</p>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowMessaging(true);
                    setShowMobileMenu(false);
                  }}
                  className="w-full justify-start text-left text-white hover:bg-steel-700"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Messages
                  {unreadCount > 0 && (
                    <span className="ml-auto bg-red-accent text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowMobileMenu(false);
                    navigate('/profile');
                  }}
                  className="w-full justify-start text-left text-white hover:bg-steel-700"
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Button>
              </div>
            </div>

            {/* Logout */}
            <div className="pt-3 border-t border-steel-600">
              <Button
                variant="ghost"
                onClick={() => {
                  handleLogout();
                  setShowMobileMenu(false);
                }}
                className="w-full justify-start text-left text-white hover:bg-red-700 hover:text-white"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}

      <MessagingModal
        isOpen={showMessaging}
        onClose={() => setShowMessaging(false)}
      />
    </nav>
  );
}
