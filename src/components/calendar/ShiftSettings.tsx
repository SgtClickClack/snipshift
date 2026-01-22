/**
 * ShiftSettings – shared fields for shift creation and edit modals
 *
 * Exposes Staff Required (capacity) and other settings for use in
 * CreateShiftModal and any edit-shift modal.
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface StaffRequiredFieldProps {
  /** Number of workers needed; must be >= 1. Defaults to 1 when undefined. */
  value: number | undefined;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  helperText?: string;
  className?: string;
  inputClassName?: string;
  'data-testid'?: string;
}

/** Staff Required numeric input. Defaults to 1, used for capacity in shift create/edit. */
export function StaffRequiredField({
  value,
  onChange,
  min = 1,
  max = 99,
  label = 'Staff Required',
  helperText = 'Number of workers needed for this shift (default 1)',
  className,
  inputClassName = 'bg-zinc-900 border-zinc-700',
  'data-testid': dataTestId = 'staff-required-input',
}: StaffRequiredFieldProps) {
  const n = Math.max(min, Math.min(max, value ?? 1));

  return (
    <div className={className}>
      <Label htmlFor="staffRequired">{label}</Label>
      <Input
        id="staffRequired"
        type="number"
        min={min}
        max={max}
        value={n}
        onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value, 10) || min)))}
        className={inputClassName}
        data-testid={dataTestId}
      />
      {helperText && <p className="text-xs text-muted-foreground mt-1">{helperText}</p>}
    </div>
  );
}
