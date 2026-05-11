import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface PillDividerProps extends HTMLAttributes<HTMLSpanElement> {}

export const PillDivider = forwardRef<HTMLSpanElement, PillDividerProps>(
  ({ className, ...rest }, ref) => (
    <span
      ref={ref}
      aria-hidden
      className={cn('h-6 w-px shrink-0 bg-slate-200', className)}
      {...rest}
    />
  )
);
PillDivider.displayName = 'PillDivider';
