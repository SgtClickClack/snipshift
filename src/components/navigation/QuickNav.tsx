import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LayoutDashboard, Briefcase, ShieldCheck, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

// Mobile bottom navigation links for professionals
const NAV_ITEMS = [
  { 
    label: 'Overview', 
    view: 'overview', 
    testId: 'nav-overview',
    icon: LayoutDashboard,
  },
  { 
    label: 'Jobs', 
    view: 'jobs', 
    testId: 'nav-jobs',
    icon: Briefcase,
  },
  { 
    label: 'Vault', 
    view: 'profile', 
    testId: 'nav-vault',
    icon: ShieldCheck,
    extraParams: { section: 'vault' },
  },
  { 
    label: 'Schedule', 
    view: 'calendar', 
    testId: 'nav-schedule',
    icon: Calendar,
  },
];

type QuickNavView = typeof NAV_ITEMS[number]['view'];

interface QuickNavProps {
  onViewChange?: (view: QuickNavView) => void;
}

export const QuickNav: React.FC<QuickNavProps> = ({ onViewChange }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentView = searchParams.get('view') || 'overview';

  const handleClick = (item: typeof NAV_ITEMS[0]) => {
    // Build URL with proper query parameters
    const newParams = new URLSearchParams();
    newParams.set('view', item.view);
    
    // Add any extra parameters
    if ('extraParams' in item && item.extraParams) {
      Object.entries(item.extraParams).forEach(([key, value]) => {
        newParams.set(key, value);
      });
    }
    
    // Navigate with updated search params
    navigate(`/professional-dashboard?${newParams.toString()}`);
    
    // Callback for parent component
    if (onViewChange) {
      onViewChange(item.view);
    }
  };

  return (
    <>
      {/* Desktop: Hidden on mobile */}
      <nav className="hidden md:flex flex-col gap-4 p-4 bg-card rounded-lg border" data-testid="quick-navigation" data-presentation-hide="true">
        <h2 className="text-sm font-semibold text-muted-foreground" data-testid="quick-navigation-title">Quick Navigation</h2>
        <div className="flex gap-4">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.view;
            return (
              <button
                key={item.testId}
                onClick={() => handleClick(item)}
                data-testid={item.testId}
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all",
                  isActive 
                    ? "bg-[#BAFF39]/10 text-[#BAFF39]" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-105" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Bottom Navigation - Fixed to bottom */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 z-[var(--z-fixed)] bg-card/95 backdrop-blur-lg border-t border-border pb-safe"
        data-testid="mobile-bottom-nav"
        data-presentation-hide="true"
      >
        <div className="flex justify-around items-center h-16 px-2">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.view;
            return (
              <button
                key={item.testId}
                onClick={() => handleClick(item)}
                data-testid={`mobile-${item.testId}`}
                className={cn(
                  "group relative flex flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-[60px] py-2 px-3 rounded-lg transition-all",
                  isActive 
                    ? "text-[#BAFF39]" 
                    : "text-muted-foreground"
                )}
              >
                <Icon 
                  className={cn(
                    "h-5 w-5 transition-all group-hover:scale-105",
                    isActive && "drop-shadow-[0_0_8px_rgba(186,255,57,0.8)]"
                  )} 
                />
                <span className={cn(
                  "text-[10px] font-semibold tracking-wide",
                  isActive && "text-[#BAFF39]"
                )}>
                  {item.label}
                </span>
                {/* Active indicator dot */}
                {isActive && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#BAFF39] shadow-[0_0_6px_rgba(186,255,57,0.9)]" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Spacer for mobile to prevent content from being hidden behind fixed nav */}
      <div className="md:hidden h-16 pb-safe" aria-hidden="true" data-presentation-hide="true" />
    </>
  );
};
