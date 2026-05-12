import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface NavGroupLabelProps extends HTMLAttributes<HTMLDivElement> {}

export const NavGroupLabel = forwardRef<HTMLDivElement, NavGroupLabelProps>(
  ({ className, children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'px-2.5 pb-1.5 pt-4 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 first:pt-1',
          className
        )}
        {...rest}
      >
        {children}
      </div>
    );
  }
);
NavGroupLabel.displayName = 'NavGroupLabel';
