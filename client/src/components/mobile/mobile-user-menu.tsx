import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User, 
  Settings, 
  LogOut, 
  ChevronDown,
  Bell
} from "lucide-react";

export default function MobileUserMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
  };

  if (!user) return null;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        className="flex items-center space-x-2 p-2"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="mobile-user-menu"
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.avatar} />
          <AvatarFallback>
            {user.firstName?.[0]}{user.lastName?.[0]}
          </AvatarFallback>
        </Avatar>
        <ChevronDown className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div 
          className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg border z-50"
          data-testid="mobile-user-dropdown"
        >
          <div className="py-1">
            <div className="px-4 py-2 border-b">
              <p className="text-sm font-medium text-steel-900">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-steel-600">
                {user.email}
              </p>
            </div>
            
            <Button
              variant="ghost"
              className="w-full justify-start px-4 py-2 text-sm"
              onClick={() => setIsOpen(false)}
              data-testid="user-profile-link"
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start px-4 py-2 text-sm"
              onClick={() => setIsOpen(false)}
              data-testid="user-settings-link"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogout}
              data-testid="logout-link"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
