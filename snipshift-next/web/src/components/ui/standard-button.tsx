// Standardized button variants for consistent UI
import React from 'react';

import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StandardButtonProps extends ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'accent';
  size?: 'sm' | 'default' | 'lg';
}

const buttonVariants = {
  primary: 'bg-primary hover:bg-primary/90 text-primary-foreground',
  secondary: 'bg-secondary hover:bg-secondary/80 text-secondary-foreground',
  outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  destructive: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground',
  accent: 'bg-gradient-to-r from-red-accent to-red-accent-dark hover:from-red-accent-dark hover:to-red-accent text-white'
};

const buttonSizes = {
  sm: 'h-9 px-3 text-sm',
  default: 'h-10 px-4 py-2',
  lg: 'h-11 px-8 text-lg'
};

export function StandardButton({ 
  variant = 'primary', 
  size = 'default', 
  className, 
  children, 
  ...props 
}: StandardButtonProps) {
  return (
    <Button
      className={cn(
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

// Specific button components for common use cases
export function PrimaryButton(props: Omit<StandardButtonProps, 'variant'>) {
  return <StandardButton variant="primary" {...props} />;
}

export function AccentButton(props: Omit<StandardButtonProps, 'variant'>) {
  return <StandardButton variant="accent" {...props} />;
}

export function SecondaryButton(props: Omit<StandardButtonProps, 'variant'>) {
  return <StandardButton variant="secondary" {...props} />;
}

export function OutlineButton(props: Omit<StandardButtonProps, 'variant'>) {
  return <StandardButton variant="outline" {...props} />;
}

export function GhostButton(props: Omit<StandardButtonProps, 'variant'>) {
  return <StandardButton variant="ghost" {...props} />;
}

export function DestructiveButton(props: Omit<StandardButtonProps, 'variant'>) {
  return <StandardButton variant="destructive" {...props} />;
}

// Loading button component
interface LoadingButtonProps extends StandardButtonProps {
  loading?: boolean;
  loadingText?: string;
}

export function LoadingButton({ 
  loading = false, 
  loadingText = 'Loading...', 
  children, 
  disabled,
  ...props 
}: LoadingButtonProps) {
  return (
    <StandardButton
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {loadingText}
        </div>
      ) : (
        children
      )}
    </StandardButton>
  );
}
