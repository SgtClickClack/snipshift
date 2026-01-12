import React from 'react';
import { cn } from '@/lib/utils';
import { User, Building2 } from 'lucide-react';

interface RoleSelectionProps {
  selectedRole: 'professional' | 'venue' | null;
  onSelect: (role: 'professional' | 'venue') => void;
}

/**
 * STRICT MODE: Only two roles allowed - Staff/Pro and Venue
 * This is hardcoded to prevent regression to multi-role selection.
 * DO NOT add Client, Admin, or any other roles here.
 */
const ROLES = [
  {
    id: 'professional',
    label: 'Staff / Pro',
    description: 'I want to pick up shifts and get paid.',
    icon: User,
  },
  {
    id: 'venue',
    label: 'Venue',
    description: 'I need to fill shifts with talented staff.',
    icon: Building2,
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
              "flex flex-col items-start p-6 space-y-4 border-2 rounded-xl transition-all",
              isSelected 
                ? "border-brand-neon bg-brand-neon/10 ring-2 ring-brand-neon/30 shadow-neon-realistic" 
                : "border-muted bg-card hover:border-brand-neon/50 hover:bg-brand-neon/5"
            )}
          >
            <div className={cn(
              "p-3 rounded-full transition-all",
              isSelected 
                ? "bg-brand-neon text-brand-dark shadow-neon-realistic" 
                : "bg-muted text-muted-foreground"
            )}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="text-left space-y-1">
              <h3 className={cn(
                "font-semibold tracking-tight text-lg",
                isSelected && "text-brand-neon"
              )}>{role.label}</h3>
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

