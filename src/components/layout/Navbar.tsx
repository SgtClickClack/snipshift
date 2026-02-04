import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { MessageCircle, LogOut, Shield, PlusCircle, Menu, User, Settings, AlertCircle, LayoutDashboard, Target, TrendingUp, DollarSign, Crown } from "lucide-react";
import NotificationBell from "@/components/notifications/notification-bell";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useVerificationStatus } from "@/hooks/useVerificationStatus";
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
import { AppRole, isBusinessRole } from "@/lib/roles";
import { InstallButton } from "@/components/pwa/install-button";
const logoUrl = '/hospogo-navbar-banner.png';

async function fetchUnreadCount(): Promise<{ unreadCount: number }> {
  const res = await apiRequest('GET', '/api/conversations/unread-count');
  return res.json();
}

async function prefetchConversations(): Promise<unknown> {
  const res = await apiRequest('GET', '/api/conversations');
  return res.json();
}

export default function Navbar() {
  const { user, logout, hasUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const verification = useVerificationStatus({ enableRedirect: false, protectedPaths: [] });
  
  // Fetch unread message count
  const { data: unreadData } = useQuery({
    queryKey: ['/api/conversations/unread-count'],
    queryFn: fetchUnreadCount,
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const unreadCount = unreadData?.unreadCount || 0;

  // Prefetch conversations on hover over Messages button
  const handleMessagesHover = () => {
    if (user?.id) {
      // Prefetch conversations in the background before user clicks
      queryClient.prefetchQuery({
        queryKey: ['/api/conversations'],
        queryFn: prefetchConversations,
        staleTime: 1000 * 60 * 5, // 5 minutes
      });
    }
  };

  const handleLogout = async () => {
    await logout();
    // Navigation is handled by logout() function
  };


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
    <nav className="bg-navbar text-navbar-foreground border-b-2 border-border shadow-xl sticky top-0 z-[50] pt-safe overflow-x-hidden w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex justify-between items-center h-20 min-w-0">
          <Link
            to={!user ? "/" : "/dashboard"}
            className="flex items-center hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0 min-w-0 bg-transparent"
          >
            <div className="bg-transparent">
              <img
                src={logoUrl} 
                alt="HospoGo Logo" 
                className="h-12 md:h-14 w-auto object-contain block antialiased drop-shadow-[0_0_14px_rgba(50,205,50,0.45)]"
                loading="eager"
                width={360}
                height={56}
              />
            </div>
          </Link>
          
          <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4 flex-shrink-0 min-w-0">
            {user ? (
              <>
                {/* Desktop Menu Items */}
                <div className="hidden md:flex items-center space-x-4">
                  {/* Find Shifts Link - Only visible for Professional users */}
                  {user.currentRole === 'professional' || (user.roles && user.roles.includes('professional')) ? (
                    <Link to="/jobs">
                      <Button variant="ghost" className="text-navbar-foreground hover:bg-white/10" data-testid="link-find-shifts-desktop">Find Shifts</Button>
                    </Link>
                  ) : null}
                </div>

                {/* Common Items (Visible on Mobile & Desktop) */}
                {/* Notifications */}
                <div className="flex-shrink-0">
                  <NotificationBell />
                </div>
                
                {/* Messages - New In-App Messaging */}
                <Link 
                  to="/messages" 
                  className="flex-shrink-0"
                  onMouseEnter={handleMessagesHover}
                >
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-navbar-foreground hover:bg-white/10 relative flex-shrink-0"
                    title="Messages"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-brand-neon text-brand-dark text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-[0_0_10px_rgba(186,255,57,0.35)]" data-testid="unread-badge">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </Link>

                {/* User Profile Dropdown - Visible on all screens */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 ml-2 ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 flex-shrink-0" data-testid="button-profile-menu" aria-label="User menu">
                      <UserAvatar className="h-10 w-10" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-popover dark:bg-steel-800 border-border dark:border-steel-600 text-popover-foreground dark:text-white z-floating" align="end">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-2 md:space-y-1">
                        <p className="text-sm font-medium leading-none flex items-center gap-2">
                          <span>{user.displayName || 'User'}</span>
                          {verification.isPendingAudit ? (
                            <span
                              className="inline-flex items-center text-amber-500"
                              title="Verification Pending"
                              aria-label="Verification Pending"
                            >
                              <AlertCircle className="h-4 w-4" />
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-steel-600" />
                    <DropdownMenuGroup>
                      <DropdownMenuItem className="focus:bg-steel-700 focus:text-white cursor-pointer" onClick={() => navigate('/profile')}>
                        <User className="mr-2 h-4 w-4" />
                        <span>My Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="focus:bg-steel-700 focus:text-white cursor-pointer" onClick={() => navigate('/dashboard')}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Business Dashboard</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="focus:bg-steel-700 focus:text-white cursor-pointer" onClick={() => navigate('/settings')}>
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
                      {/* CEO Insights Section - Only visible to Rick (Founder Access) */}
                      {(user.email === 'rick@hospogo.com' || user.email === 'rick@snipshift.com.au') && (
                        <>
                          <DropdownMenuSeparator className="bg-steel-600" />
                          <DropdownMenuLabel className="text-xs text-[#BAFF39] font-semibold flex items-center gap-2">
                            <Crown className="h-3.5 w-3.5 text-[#BAFF39] drop-shadow-[0_0_4px_rgba(186,255,57,0.6)]" />
                            CEO Insights
                          </DropdownMenuLabel>
                          <DropdownMenuItem asChild className="focus:bg-steel-700 focus:text-white cursor-pointer">
                            <Link to="/admin/lead-tracker">
                              <Target className="mr-2 h-4 w-4 text-[#BAFF39]" />
                              <span>Lead Tracker</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="focus:bg-steel-700 focus:text-white cursor-pointer">
                            <Link to="/admin/marketplace">
                              <TrendingUp className="mr-2 h-4 w-4 text-[#BAFF39]" />
                              <span>Marketplace Liquidity</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="focus:bg-steel-700 focus:text-white cursor-pointer">
                            <Link to="/admin/revenue">
                              <DollarSign className="mr-2 h-4 w-4 text-[#BAFF39]" />
                              <span>Revenue Forecast</span>
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator className="bg-steel-600" />
                    <DropdownMenuItem onClick={handleLogout} className="!text-red-600 dark:!text-red-400 !focus:bg-red-600 !focus:text-white hover:!bg-red-600 hover:!text-white cursor-pointer" data-testid="button-logout">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign Out</span>
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
                           <div className="flex items-center gap-3">
                             <UserAvatar className="h-10 w-10" />
                             <div className="overflow-hidden">
                             <p className="font-medium truncate text-foreground dark:text-steel-100 flex items-center gap-2">
                               <span className="truncate">{user.displayName || user.name || 'User'}</span>
                               {verification.isPendingAudit ? (
                                 <span
                                   className="inline-flex items-center text-amber-500 flex-shrink-0"
                                   title="Verification Pending"
                                   aria-label="Verification Pending"
                                 >
                                   <AlertCircle className="h-4 w-4" />
                                 </span>
                               ) : null}
                             </p>
                               <p className="text-xs text-muted-foreground dark:text-steel-300 truncate">{user.email}</p>
                             </div>
                           </div>
                        </div>

                        {/* Find Shifts Link - Only visible for Professional users */}
                        {(user.currentRole === 'professional' || (user.roles && user.roles.includes('professional'))) && (
                          <SheetClose asChild>
                            <Link to="/jobs">
                              <Button variant="ghost" className="w-full justify-start text-foreground dark:text-steel-100 hover:bg-muted dark:hover:bg-steel-800" data-testid="link-find-shifts-mobile">
                                Find Shifts
                              </Button>
                            </Link>
                          </SheetClose>
                        )}

                         {(() => {
                           // Filter out roles the user already has from the potential missing roles
                           const missingRoles: AppRole[] = (['professional', 'hub'] as AppRole[]).filter(r => !(user?.roles || []).includes(r) && !(user?.roles || []).includes(r === 'hub' ? 'business' : r));
                           return missingRoles.length > 0 && (
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
                           );
                         })()}

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
                                  <Button variant="ghost" className="w-full justify-start text-foreground dark:text-steel-100 hover:bg-brand-neon/10">
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
            ) : !isLoading && !hasUser ? (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="text-navbar-foreground hover:bg-white/10">Login</Button>
                </Link>
                <Link to="/signup">
                  <Button className="bg-brand-neon text-brand-dark hover:bg-brand-neon/90 shadow-[0_0_10px_rgba(186,255,57,0.35)] hover:shadow-[0_0_14px_rgba(186,255,57,0.45)]">
                    Sign Up
                  </Button>
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}
