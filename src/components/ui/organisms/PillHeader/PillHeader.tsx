'use client';
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface PillHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export const PillHeader = forwardRef<HTMLDivElement, PillHeaderProps>(
  ({ className, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center gap-1.5 rounded-full border border-slate-200 bg-white p-1.5 shadow-[0_1px_2px_rgba(11,15,25,0.04),0_8px_24px_rgba(11,15,25,0.06)] transition hover:border-slate-300 hover:shadow-[0_1px_2px_rgba(11,15,25,0.04),0_12px_32px_rgba(11,15,25,0.10)]',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
);
PillHeader.displayName = 'PillHeader';
