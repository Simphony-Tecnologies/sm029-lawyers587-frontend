import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface MenuDividerProps extends HTMLAttributes<HTMLDivElement> {}

export const MenuDivider = forwardRef<HTMLDivElement, MenuDividerProps>(
  ({ className, ...rest }, ref) => (
    <div
      ref={ref}
      role='separator'
      aria-orientation='horizontal'
      className={cn('mx-1 my-1.5 h-px bg-slate-100', className)}
      {...rest}
    />
  )
);
MenuDivider.displayName = 'MenuDivider';
