import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  /**
   * Icon component from Lucide React
   */
  icon: LucideIcon;
  /**
   * Main title text
   */
  title: string;
  /**
   * Descriptive text explaining the empty state
   */
  description: string;
  /**
   * Optional action button
   */
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'chrome' | 'accent' | 'charcoal' | 'steel';
    size?: 'default' | 'sm' | 'lg' | 'icon';
  };
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * EmptyState Component
 * 
 * A standardized empty state component that provides a helpful, professional
 * experience when no data is present. Maintains the Brisbane brand voice:
 * helpful, professional, and clear.
 * 
 * @example
 * ```tsx
 * <EmptyState
 *   icon={Search}
 *   title="No shifts found"
 *   description="We couldn't find any shifts matching your criteria. Try adjusting your filters."
 *   action={{
 *     label: "Clear Filters",
 *     onClick: handleClearFilters,
 *     variant: "outline"
 *   }}
 * />
 * ```
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-8 md:py-12 px-4',
        className
      )}
    >
      <div className="mb-4 bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mx-auto mb-6">{description}</p>
      {action && (
        <Button
          variant={action.variant || 'outline'}
          size={action.size || 'default'}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
