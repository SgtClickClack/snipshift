import React from 'react';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ value = 0, className = '', ...props }, ref) => {
    return (
      <div ref={ref} className={className} {...props}>
        <div style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    );
  }
);

Progress.displayName = 'Progress';

