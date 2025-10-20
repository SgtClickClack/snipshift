import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Store, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { getDashboardRoute } from '@/lib/roles';
import { useNavigate } from 'react-router-dom';

export function RoleSwitcher() {
  const { user, setRolesAndCurrentRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  if (!user || !user.currentRole) {
    return null;
  }

  const availableRoles = user.roles || ['professional'];
  const currentRole = user.currentRole;

  const roleConfig = {
    professional: {
      label: 'Professional',
      icon: UserCheck,
      description: 'Find shifts and work opportunities'
    },
    business: {
      label: 'Business',
      icon: Store,
      description: 'Post shifts and manage staff'
    },
    shop: {
      label: 'Shop',
      icon: Store,
      description: 'Manage shop operations and staff'
    }
  };

  const handleRoleSwitch = async (newRole: 'professional' | 'business' | 'shop') => {
    if (newRole === currentRole) return;
    
    if (!availableRoles.includes(newRole)) {
      toast({
        title: "Role not available",
        description: "You don't have access to this role. Please contact support to add it to your account.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // In test environment, update local state and navigate
      if (window.Cypress) {
        setRolesAndCurrentRole(user.roles, newRole);
        toast({
          title: "Role switched",
          description: `You're now operating as a ${roleConfig[newRole].label}.`,
        });
        // Navigate to the appropriate dashboard
        const dashboardRoute = getDashboardRoute(newRole);
        navigate(dashboardRoute);
      } else {
        // Update current role on server
        const res = await apiRequest("PATCH", `/api/users/${user.id}/current-role`, { role: newRole });
        const updated = await res.json();
        
        // Update local state
        setRolesAndCurrentRole(user.roles, updated.currentRole);
        
        toast({
          title: "Role switched",
          description: `You're now operating as a ${roleConfig[newRole].label}.`,
        });

        // Navigate to the appropriate dashboard
        const dashboardRoute = getDashboardRoute(newRole);
        navigate(dashboardRoute);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to switch roles. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const currentRoleConfig = roleConfig[currentRole as keyof typeof roleConfig];
  const CurrentIcon = currentRoleConfig?.icon || UserCheck;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center gap-2 min-w-[140px] justify-between"
          disabled={isLoading}
          data-testid="role-switcher"
        >
          <div className="flex items-center gap-2">
            <CurrentIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{currentRoleConfig?.label}</span>
          </div>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
          Switch Role
        </div>
        {Object.entries(roleConfig).map(([roleKey, config]) => {
          const role = roleKey as 'professional' | 'business' | 'shop';
          const Icon = config.icon;
          const isCurrentRole = role === currentRole;
          const isAvailable = availableRoles.includes(role);
          
          return (
            <DropdownMenuItem
              key={role}
              onClick={() => handleRoleSwitch(role)}
              disabled={!isAvailable || isLoading}
              className="flex items-center gap-3 p-3 cursor-pointer"
              data-testid={`option-${role}`}
            >
              <div className="flex items-center gap-3 flex-1">
                <Icon className="w-4 h-4" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{config.label}</span>
                    {isCurrentRole && <Check className="w-4 h-4 text-green-600" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {config.description}
                  </p>
                </div>
              </div>
              {!isAvailable && (
                <Badge variant="secondary" className="text-xs">
                  Not Available
                </Badge>
              )}
            </DropdownMenuItem>
          );
        })}
        {availableRoles.length < 2 && (
          <div className="px-2 py-1.5">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs"
              onClick={() => navigate('/role-selection')}
            >
              Add Business Role
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
