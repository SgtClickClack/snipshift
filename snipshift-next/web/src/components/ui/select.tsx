import React from 'react';

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({ value, onValueChange, children }) => {
  return <div>{children}</div>;
};

Select.displayName = 'Select';

export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className = '', ...props }, ref) => {
    return <button ref={ref} className={className} {...props} />;
  }
);

SelectTrigger.displayName = 'SelectTrigger';

export interface SelectValueProps {
  placeholder?: string;
}

export const SelectValue: React.FC<SelectValueProps> = ({ placeholder }) => {
  return <span>{placeholder}</span>;
};

SelectValue.displayName = 'SelectValue';

export interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className = '', ...props }, ref) => {
    return <div ref={ref} className={className} {...props} />;
  }
);

SelectContent.displayName = 'SelectContent';

export interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className = '', value, ...props }, ref) => {
    return <div ref={ref} className={className} data-value={value} {...props} />;
  }
);

SelectItem.displayName = 'SelectItem';

