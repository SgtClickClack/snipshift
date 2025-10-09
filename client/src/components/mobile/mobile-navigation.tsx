import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Menu, 
  X, 
  Home, 
  Briefcase, 
  Users, 
  MessageCircle, 
  User, 
  Settings, 
  LogOut,
  Bell,
  Scissors
} from "lucide-react";

interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileNavigation({ isOpen, onClose }: MobileNavigationProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    onClose();
    navigate('/');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 md:hidden"
      data-testid="mobile-menu"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Menu Panel */}
      <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-3">
              <Scissors className="h-8 w-8 text-steel-600" />
              <span className="text-xl font-bold text-steel-900">SnipShift</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              data-testid="mobile-menu-close"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* User Info */}
          {user && (
            <div className="p-4 border-b bg-steel-50">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-steel-900">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-sm text-steel-600 capitalize">
                    {user.currentRole}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleNavigation('/')}
                data-testid="mobile-nav-home"
              >
                <Home className="mr-3 h-5 w-5" />
                Home
              </Button>
              
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleNavigation('/mobile/jobs')}
                data-testid="mobile-nav-jobs"
              >
                <Briefcase className="mr-3 h-5 w-5" />
                Jobs
              </Button>
              
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleNavigation('/mobile/community')}
                data-testid="mobile-nav-community"
              >
                <Users className="mr-3 h-5 w-5" />
                Community
              </Button>
              
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleNavigation('/mobile/messages')}
                data-testid="mobile-nav-messages"
              >
                <MessageCircle className="mr-3 h-5 w-5" />
                Messages
              </Button>
              
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleNavigation('/notifications')}
                data-testid="mobile-nav-notifications"
              >
                <Bell className="mr-3 h-5 w-5" />
                Notifications
              </Button>
            </div>
          </nav>

          {/* User Menu */}
          <div className="p-4 border-t">
            <div className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleNavigation('/mobile/dashboard')}
                data-testid="user-profile-link"
              >
                <User className="mr-3 h-5 w-5" />
                Dashboard
              </Button>
              
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleNavigation('/profile')}
                data-testid="user-settings-link"
              >
                <Settings className="mr-3 h-5 w-5" />
                Profile
              </Button>
              
              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleLogout}
                data-testid="logout-link"
              >
                <LogOut className="mr-3 h-5 w-5" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
