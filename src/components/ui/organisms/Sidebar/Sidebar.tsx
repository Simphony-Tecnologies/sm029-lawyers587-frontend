'use client';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SidebarProps extends HTMLAttributes<HTMLElement> {
  brand: ReactNode;
  nav: ReactNode;
  foot: ReactNode;
}

export const Sidebar = forwardRef<HTMLElement, SidebarProps>(
  ({ brand, nav, foot, className, ...rest }, ref) => {
    return (
      <aside
        ref={ref}
        className={cn(
          'flex h-screen w-[252px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(11,15,25,0.12)]',
          className
        )}
        {...rest}
      >
        {brand}
        <nav className='flex flex-1 flex-col gap-0.5 overflow-y-auto p-3'>
          {nav}
        </nav>
        <div className='flex flex-col gap-2 border-t border-slate-100 p-3 pb-3.5'>
          {foot}
        </div>
      </aside>
    );
  }
);
Sidebar.displayName = 'Sidebar';
