import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { MessageCircle, LogOut, Shield, ChevronDown, Check, PlusCircle, Menu, RefreshCw, User, Settings } from "lucide-react";
import NotificationBell from "@/components/notifications/notification-bell";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose
} from "@/components/ui/sheet";
import { getDashboardRoute, mapRoleToApiRole, AppRole } from "@/lib/roles";
import { InstallButton } from "@/components/pwa/install-button";
import logo from "@/assets/logo-processed.png";

async function fetchUnreadCount(): Promise<{ unreadCount: number }> {
  const res = await apiRequest('GET', '/api/conversations/unread-count');
  return res.json();
}

export default function Navbar() {
  const { user, logout, setCurrentRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Fetch unread message count
  const { data: unreadData } = useQuery({
    queryKey: ['/api/conversations/unread-count'],
    queryFn: fetchUnreadCount,
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const unreadCount = unreadData?.unreadCount || 0;

  const handleLogout = async () => {
    await logout();
    // Navigation is handled by logout() function
  };

  const handleSwitchRole = async (role: string) => {
    if (!user) return;
    try {
      // Map frontend role to backend API role
      // Backend only accepts: 'professional', 'business', 'admin', 'trainer'
      const apiRole = mapRoleToApiRole(role as any);
      
      await apiRequest("PATCH", `/api/users/${user.id}/current-role`, { role: apiRole });
      setCurrentRole(role as any);
      const target = getDashboardRoute(role as any);
      navigate(target);
    } catch (e) {
      console.error("Failed to switch role", e);
      toast({
        title: "Error",
        description: "Failed to switch role. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getRoleLabel = (role: string) => {
    if (role === 'hub' || role === 'business') return 'Business';
    if (role === 'client') return 'Shop'; // Or Client? Instructions said Business/Shop for hub. Client is usually consumer? Let's stick to instruction for hub.
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const currentRoleLabel = user?.currentRole ? getRoleLabel(user.currentRole) : 'Select Role';
  
  const availableRoles = (user?.roles || []).filter(r => r !== user?.currentRole);
  // Filter out roles the user already has from the potential missing roles
  const missingRoles: AppRole[] = (['professional', 'hub'] as AppRole[]).filter(r => !(user?.roles || []).includes(r) && !(user?.roles || []).includes(r === 'hub' ? 'business' : r));

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.split(' ').filter(Boolean);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const UserAvatar = ({ className }: { className?: string }) => (
    <Avatar className={`cursor-pointer border border-steel-600 ${className || 'h-8 w-8'}`}>
      <AvatarImage src={user?.photoURL || user?.avatarUrl} alt={user?.displayName || 'User'} />
      <AvatarFallback className="bg-muted text-foreground dark:bg-steel-700 dark:text-white text-xs font-medium">
        {getInitials(user?.displayName || user?.name, user?.email)}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <nav className="bg-navbar text-navbar-foreground border-b-2 border-border shadow-xl sticky top-0 z-sticky pt-safe overflow-x-hidden w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex justify-between items-center h-16 min-w-0">
          <Link
            to={!user ? "/" : "/dashboard"}
            className="flex items-center hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0 min-w-0 bg-transparent"
          >
            <div className="bg-transparent">
              <img 
                src={logo} 
                alt="Snipshift Logo" 
                className="h-10 w-auto object-contain max-w-32 sm:max-w-none logo-sharp invert contrast-[1.3] brightness-[1.08] saturate-[1.15] dark:invert-0" 
                loading="eager"
                width={120}
                height={40}
                style={{
                  imageRendering: 'auto',
                  WebkitFontSmoothing: 'antialiased',
                  backgroundColor: 'transparent',
                  display: 'block',
                }}
              />
            </div>
          </Link>
          
          <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4 flex-shrink-0 min-w-0">
            {user ? (
              <>
                {/* Desktop Menu Items */}
                <div className="hidden md:flex items-center space-x-4">
                  {/* Role Switcher */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full max-w-48 justify-between bg-white/10 text-navbar-foreground border-white/20 hover:bg-white/20 z-floating relative"
                      >
                        {currentRoleLabel}
                        <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-60 max-w-[calc(100vw-2rem)] bg-popover dark:bg-steel-800 border-border dark:border-steel-600 text-popover-foreground dark:text-white z-floating" align="end">
                      
                      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Current View</DropdownMenuLabel>
                      <DropdownMenuItem className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-steel-700 dark:focus:text-white justify-between font-bold bg-accent/50 dark:bg-steel-700/50">
                        {currentRoleLabel}
                        <Check className="h-4 w-4 text-green-400" />
                      </DropdownMenuItem>

                      {availableRoles.length > 0 && (
                        <>
                          <DropdownMenuSeparator className="bg-border dark:bg-steel-600" />
                          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Switch View</DropdownMenuLabel>
                          {availableRoles.map((r) => (
                            <DropdownMenuItem 
                              key={r} 
                              onClick={() => handleSwitchRole(r)}
                              className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-steel-700 dark:focus:text-white cursor-pointer"
                            >
                              <RefreshCw className="mr-2 h-4 w-4 text-muted-foreground" />
                              Switch to {getRoleLabel(r)}
                            </DropdownMenuItem>
                          ))}
                        </>
                      )}

                      {missingRoles.length > 0 && (
                        <>
                          <DropdownMenuSeparator className="bg-border dark:bg-steel-600" />
                          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Grow</DropdownMenuLabel>
                          
                          {missingRoles.includes('hub') && (
                            <DropdownMenuItem 
                              onClick={() => navigate('/onboarding/hub')}
                              className="text-blue-600 dark:text-blue-400 focus:text-blue-700 dark:focus:text-blue-300 focus:bg-accent dark:focus:bg-steel-700 cursor-pointer"
                            >
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Create Business Profile
                            </DropdownMenuItem>
                          )}

                          {missingRoles.includes('professional') && (
                            <DropdownMenuItem 
                              onClick={() => navigate('/onboarding/professional')}
                              className="text-blue-600 dark:text-blue-400 focus:text-blue-700 dark:focus:text-blue-300 focus:bg-accent dark:focus:bg-steel-700 cursor-pointer"
                            >
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Create Professional Profile
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Dashboard Link */}
                  <Link to="/dashboard">
                    <Button variant="ghost" className="text-navbar-foreground hover:bg-white/10">Dashboard</Button>
                  </Link>

                  {/* Find Shifts Link */}
                  <Link to="/jobs">
                    <Button variant="ghost" className="text-navbar-foreground hover:bg-white/10" data-testid="link-find-shifts-desktop">Find Shifts</Button>
                  </Link>

                  {/* Install App Button */}
                  <InstallButton 
                    variant="ghost" 
                    size="sm"
                    className="text-navbar-foreground hover:bg-white/10"
                  />
                </div>

                {/* Common Items (Visible on Mobile & Desktop) */}
                {/* Notifications */}
                <div className="flex-shrink-0">
                  <NotificationBell />
                </div>
                
                {/* Messages - New In-App Messaging */}
                <Link to="/messages" className="flex-shrink-0">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-navbar-foreground hover:bg-white/10 relative flex-shrink-0"
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

                {/* User Profile Dropdown - Visible on all screens */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 ml-2 ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 flex-shrink-0" data-testid="button-profile-menu" aria-label="User menu">
                      <UserAvatar />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-popover dark:bg-steel-800 border-border dark:border-steel-600 text-popover-foreground dark:text-white z-floating" align="end">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-2 md:space-y-1">
                        <p className="text-sm font-medium leading-none">{user.displayName || 'User'}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-steel-600" />
                    <DropdownMenuGroup>
                      <DropdownMenuItem className="focus:bg-steel-700 focus:text-white cursor-pointer" onClick={() => navigate('/profile')}>
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="focus:bg-steel-700 focus:text-white cursor-pointer" onClick={() => navigate('/profile/edit')}>
                         <Settings className="mr-2 h-4 w-4" />
                         <span>Settings</span>
                      </DropdownMenuItem>
                      {(user.roles || []).includes('admin') && (
                        <DropdownMenuItem asChild className="focus:bg-steel-700 focus:text-white cursor-pointer">
                          <Link to="/admin">
                            <Shield className="mr-2 h-4 w-4" />
                            <span>Admin Dashboard</span>
                          </Link>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator className="bg-steel-600" />
                    <DropdownMenuItem onClick={handleLogout} className="focus:bg-steel-700 focus:text-white cursor-pointer" data-testid="button-logout">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Mobile Menu Trigger */}
                <div className="md:hidden flex-shrink-0">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-navbar-foreground hover:bg-white/10 flex-shrink-0" data-testid="button-mobile-menu" aria-label="Open menu">
                        <Menu className="h-6 w-6" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="!bg-background dark:!bg-steel-900 text-foreground dark:text-steel-100 border-border dark:border-steel-800">
                      <SheetHeader>
                        <SheetTitle className="text-foreground dark:text-steel-100">Menu</SheetTitle>
                      </SheetHeader>
                      <div className="flex flex-col space-y-4 mt-8">
                        <div className="px-2 pb-4 border-b border-border dark:border-steel-800 mb-4">
                           <div className="flex items-center gap-3 mb-3">
                             <UserAvatar className="h-10 w-10" />
                             <div className="overflow-hidden">
                               <p className="font-medium truncate text-foreground dark:text-steel-100">{user.displayName || user.name || 'User'}</p>
                               <p className="text-xs text-muted-foreground dark:text-steel-300 truncate">{user.email}</p>
                             </div>
                           </div>
                           
                           <div className="flex items-center text-sm text-blue-400 dark:text-blue-300">
                             <Check className="mr-2 h-4 w-4" />
                             Current: {currentRoleLabel}
                           </div>
                        </div>

                        <SheetClose asChild>
                          <Link to="/dashboard">
                            <Button variant="ghost" className="w-full justify-start text-foreground dark:text-steel-100 hover:bg-muted dark:hover:bg-steel-800">
                              Dashboard
                            </Button>
                          </Link>
                        </SheetClose>

                        <SheetClose asChild>
                          <Link to="/jobs">
                            <Button variant="ghost" className="w-full justify-start text-foreground dark:text-steel-100 hover:bg-muted dark:hover:bg-steel-800" data-testid="link-find-shifts-mobile">
                              Find Shifts
                            </Button>
                          </Link>
                        </SheetClose>

                        {/* Mobile Role Switching Links - Grouped */}
                         {availableRoles.length > 0 && (
                           <div className="py-2">
                             <p className="px-4 text-xs text-muted-foreground dark:text-steel-300 uppercase mb-2">Switch View</p>
                             {availableRoles.map((r) => (
                                <SheetClose asChild key={r}>
                                  <Button 
                                    variant="ghost" 
                                    onClick={() => handleSwitchRole(r)}
                                    className="w-full justify-start text-muted-foreground dark:text-steel-300 hover:text-foreground dark:hover:text-steel-100 hover:bg-muted dark:hover:bg-steel-800"
                                  >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Switch to {getRoleLabel(r)}
                                  </Button>
                                </SheetClose>
                             ))}
                           </div>
                         )}

                         {missingRoles.length > 0 && (
                           <div className="py-2">
                             <p className="px-4 text-xs text-muted-foreground dark:text-steel-300 uppercase mb-2">Grow</p>
                             {missingRoles.includes('hub') && (
                                <SheetClose asChild>
                                  <Button 
                                    variant="ghost" 
                                    onClick={() => navigate('/onboarding/hub')}
                                    className="w-full justify-start text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200 hover:bg-muted dark:hover:bg-steel-800"
                                  >
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Create Business Profile
                                  </Button>
                                </SheetClose>
                             )}
                             {missingRoles.includes('professional') && (
                                <SheetClose asChild>
                                  <Button 
                                    variant="ghost" 
                                    onClick={() => navigate('/onboarding/professional')}
                                    className="w-full justify-start text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200 hover:bg-muted dark:hover:bg-steel-800"
                                  >
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Create Professional Profile
                                  </Button>
                                </SheetClose>
                             )}
                           </div>
                         )}

                         {/* Install App Button */}
                         <div className="px-2 py-2">
                           <InstallButton 
                             variant="ghost" 
                             size="sm"
                             className="w-full justify-start text-foreground dark:text-steel-100 hover:bg-muted dark:hover:bg-steel-800"
                           />
                         </div>

                         <div className="border-t border-border dark:border-steel-800 my-2 pt-2">
                            {(user.roles || []).includes('admin') && (
                              <SheetClose asChild>
                                <Link to="/admin">
                                  <Button variant="ghost" className="w-full justify-start text-foreground dark:text-steel-100 hover:bg-destructive/10 dark:hover:bg-red-700">
                                    <Shield className="h-4 w-4 mr-2" />
                                    Admin Dashboard
                                  </Button>
                                </Link>
                              </SheetClose>
                            )}
                            
                            <SheetClose asChild>
                              <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-foreground dark:text-steel-100 hover:bg-muted dark:hover:bg-steel-800">
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
                  <Button variant="ghost" className="text-navbar-foreground hover:bg-white/10">Login</Button>
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
