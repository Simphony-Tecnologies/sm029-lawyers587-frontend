import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface NavIconProps extends HTMLAttributes<HTMLSpanElement> {
  active?: boolean;
  children: ReactNode;
}

export const NavIcon = forwardRef<HTMLSpanElement, NavIconProps>(
  ({ active = false, className, children, ...rest }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[13px]',
          active ? 'bg-red-50 text-customRed' : 'text-slate-500',
          className
        )}
        {...rest}
      >
        {children}
      </span>
    );
  }
);
NavIcon.displayName = 'NavIcon';
