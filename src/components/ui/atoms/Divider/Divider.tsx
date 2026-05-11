import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface DividerProps extends HTMLAttributes<HTMLDivElement> {}

export const Divider = forwardRef<HTMLDivElement, DividerProps>(
  ({ className, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        role='separator'
        aria-orientation='horizontal'
        className={cn('mx-2.5 my-2 h-px bg-slate-100', className)}
        {...rest}
      />
    );
  }
);
Divider.displayName = 'Divider';
