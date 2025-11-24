import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { MessageCircle, LogOut, Shield, ChevronDown, Plus, Check, PlusCircle } from "lucide-react";
import { messagingService } from "@/lib/messaging";
import NotificationBell from "./notifications/notification-bell";
import { Chat } from "@shared/firebase-schema";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";
import { getDashboardRoute } from "@/lib/roles";
import logo from "@/assets/logo-processed.png";

export default function Navbar() {
  const { user, logout, setCurrentRole } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [userChats, setUserChats] = useState<Chat[]>([]);
  
  // Notifications - removed hook usage here as it's now internal to NotificationBell
  
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
    if (!user) return;
    try {
      await apiRequest("PATCH", `/api/users/${user.id}/current-role`, { role });
      setCurrentRole(role as any);
      const target = getDashboardRoute(role as any);
      navigate(target);
    } catch (e) {
      console.error("Failed to switch role", e);
    }
  };
  
  // Debug logging for role switcher
  // console.log('Current User Roles:', user?.roles);
  // console.log('Has Hub Role:', user?.roles?.includes('hub'));

  return (
    <nav className="bg-gradient-to-r from-steel-900 via-steel-800 to-steel-900 border-b-2 border-steel-600 shadow-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <button
            type="button"
            className="flex items-center hover:opacity-80 transition-opacity"
            onClick={() => {
              if (!user) {
                navigate("/");
                return;
              }
              const target = (user.currentRole && user.currentRole !== 'client') 
                ? getDashboardRoute(user.currentRole) 
                : "/role-selection";
              navigate(target);
            }}
          >
            <img 
              src={logo} 
              alt="Snipshift Logo" 
              className="h-10 w-auto" 
            />
          </button>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* Role Switcher */}
                <div className="hidden md:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-[200px] justify-between bg-steel-800 text-white border-steel-600 hover:bg-steel-700 hover:text-white z-50 relative"
                      >
                        {user.currentRole === 'hub' ? 'Shop' : (user.currentRole === 'client' ? 'Shop' : user.currentRole?.charAt(0).toUpperCase() + user.currentRole?.slice(1))}
                        <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[200px] bg-steel-800 border-steel-600 text-white z-[9999]" align="end">
                      {(user.roles || []).map((r) => (
                        <DropdownMenuItem 
                          key={r} 
                          onClick={() => handleSwitchRole(r)}
                          className="focus:bg-steel-700 focus:text-white cursor-pointer justify-between"
                        >
                          {r === 'hub' ? 'Shop' : (r === 'client' ? 'Shop' : r.charAt(0).toUpperCase() + r.slice(1))}
                          {user.currentRole === r && <Check className="h-4 w-4" />}
                        </DropdownMenuItem>
                      ))}

                      <DropdownMenuSeparator className="bg-steel-600" />

                      {!user.roles?.includes('hub') && (
                        <DropdownMenuItem 
                          onClick={() => navigate('/onboarding/hub')}
                          className="text-blue-400 focus:text-blue-300 focus:bg-steel-700 cursor-pointer"
                        >
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Create Shop Profile
                        </DropdownMenuItem>
                      )}

                      {!user.roles?.includes('professional') && (
                        <DropdownMenuItem 
                          onClick={() => navigate('/onboarding/professional')}
                          className="text-blue-400 focus:text-blue-300 focus:bg-steel-700 cursor-pointer"
                        >
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Become a Pro
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Find Shifts Link */}
                <Link to="/jobs">
                  <Button variant="ghost" className="text-white hover:bg-steel-700">Find Shifts</Button>
                </Link>

                {/* Notifications */}
                <NotificationBell />
                
                {/* Messages - New In-App Messaging */}
                <Link to="/messages">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-white hover:bg-steel-700 relative"
                    title="Messages"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-accent text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold" data-testid="unread-badge">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </Link>

                {/* Admin Dashboard Link - Only visible to admins */}
                {(user.roles || []).includes('admin') && (
                  <Link to="/admin">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-white hover:bg-red-600 relative"
                      title="Admin Dashboard"
                    >
                      <Shield className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
                
                <span className="text-chrome-light">{user.email}</span>
                <Button variant="ghost" onClick={handleLogout} className="text-white hover:bg-steel-700">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
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
    </nav>
  );
}
