'use client';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { cn } from '@/lib/cn';

export interface SidebarToggleProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  open: boolean;
}

export const SidebarToggle = forwardRef<HTMLButtonElement, SidebarToggleProps>(
  ({ open, type, className, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        aria-label={open ? 'Hide sidebar' : 'Show sidebar'}
        aria-expanded={open}
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-900 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customRed/40',
          className
        )}
        {...rest}
      >
        {open ? <MdChevronLeft size={14} /> : <MdChevronRight size={14} />}
      </button>
    );
  }
);
SidebarToggle.displayName = 'SidebarToggle';
