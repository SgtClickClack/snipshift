import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { MessageCircle, LogOut, Shield, ChevronDown, Plus, Check, PlusCircle, Menu } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose
} from "@/components/ui/sheet";
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
          <Link
            to={!user ? "/" : ((user.currentRole && user.currentRole !== 'client') ? getDashboardRoute(user.currentRole) : "/role-selection")}
            className="flex items-center hover:opacity-80 transition-opacity cursor-pointer"
          >
            <img 
              src={logo} 
              alt="Snipshift Logo" 
              className="h-10 w-auto" 
            />
          </Link>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* Desktop Menu Items */}
                <div className="hidden md:flex items-center space-x-4">
                  {/* Role Switcher */}
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

                  {/* Dashboard Link */}
                  <Link to={(user.currentRole === 'hub' || user.currentRole === 'professional') ? getDashboardRoute(user.currentRole) : '/dashboard'}>
                    <Button variant="ghost" className="text-white hover:bg-steel-700">Dashboard</Button>
                  </Link>

                  {/* Find Shifts Link */}
                  <Link to="/jobs">
                    <Button variant="ghost" className="text-white hover:bg-steel-700">Find Shifts</Button>
                  </Link>
                </div>

                {/* Common Items (Visible on Mobile & Desktop) */}
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

                {/* Desktop-only User Info & Logout */}
                <div className="hidden md:flex items-center space-x-4">
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
                </div>

                {/* Mobile Menu Trigger */}
                <div className="md:hidden">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-white hover:bg-steel-700">
                        <Menu className="h-6 w-6" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="bg-steel-900 text-white border-steel-700">
                      <SheetHeader>
                        <SheetTitle className="text-white">Menu</SheetTitle>
                      </SheetHeader>
                      <div className="flex flex-col space-y-4 mt-8">
                        <div className="px-2 pb-4 border-b border-steel-700 mb-4">
                           <p className="text-sm text-gray-400 mb-1">Signed in as</p>
                           <p className="font-medium truncate">{user.email}</p>
                        </div>

                        <SheetClose asChild>
                          <Link to={(user.currentRole === 'hub' || user.currentRole === 'professional') ? getDashboardRoute(user.currentRole) : '/dashboard'}>
                            <Button variant="ghost" className="w-full justify-start text-white hover:bg-steel-700">
                              Dashboard
                            </Button>
                          </Link>
                        </SheetClose>

                        <SheetClose asChild>
                          <Link to="/jobs">
                            <Button variant="ghost" className="w-full justify-start text-white hover:bg-steel-700">
                              Find Shifts
                            </Button>
                          </Link>
                        </SheetClose>

                        {/* Mobile Role Switching Links - Simplified */}
                         {(user.roles || []).map((r) => (
                            r !== user.currentRole && (
                              <SheetClose asChild key={r}>
                                <Button 
                                  variant="ghost" 
                                  onClick={() => handleSwitchRole(r)}
                                  className="w-full justify-start text-gray-400 hover:text-white hover:bg-steel-700"
                                >
                                  Switch to {r === 'hub' ? 'Shop' : (r === 'client' ? 'Shop' : r.charAt(0).toUpperCase() + r.slice(1))}
                                </Button>
                              </SheetClose>
                            )
                         ))}

                         <div className="border-t border-steel-700 my-2 pt-2">
                            {(user.roles || []).includes('admin') && (
                              <SheetClose asChild>
                                <Link to="/admin">
                                  <Button variant="ghost" className="w-full justify-start text-white hover:bg-red-600">
                                    <Shield className="h-4 w-4 mr-2" />
                                    Admin Dashboard
                                  </Button>
                                </Link>
                              </SheetClose>
                            )}
                            
                            <SheetClose asChild>
                              <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-white hover:bg-steel-700">
                                <LogOut className="h-4 w-4 mr-2" />
                                Logout
                              </Button>
                            </SheetClose>
                         </div>
                      </div>
                    </SheetContent>
                  </Sheet>
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
    </nav>
  );
}
