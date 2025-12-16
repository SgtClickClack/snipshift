import React from 'react';
import { cn } from '@/lib/utils';
import { User, Store } from 'lucide-react';

interface RoleSelectionProps {
  selectedRole: 'professional' | 'shop' | null;
  onSelect: (role: 'professional' | 'shop') => void;
}

/**
 * STRICT MODE: Only two roles allowed - Professional and Shop
 * This is hardcoded to prevent regression to 4-role selection.
 * DO NOT add Client, Admin, or any other roles here.
 */
const ROLES = [
  {
    id: 'professional',
    label: 'Professional Barber',
    description: 'I want to pick up shifts and get paid.',
    icon: User,
  },
  {
    id: 'shop',
    label: 'Barbershop',
    description: 'I need to fill empty chairs with talent.',
    icon: Store,
  },
] as const;

export function RoleSelection({ selectedRole, onSelect }: RoleSelectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {ROLES.map((role) => {
        const Icon = role.icon;
        const isSelected = selectedRole === role.id;
        
        return (
          <button
            key={role.id}
            onClick={() => onSelect(role.id)}
            className={cn(
              "flex flex-col items-start p-6 space-y-4 border-2 rounded-xl transition-all hover:border-primary/50",
              isSelected 
                ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                : "border-muted bg-card hover:bg-accent/5"
            )}
          >
            <div className={cn(
              "p-3 rounded-full",
              isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="text-left space-y-1">
              <h3 className="font-semibold tracking-tight text-lg">{role.label}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {role.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

