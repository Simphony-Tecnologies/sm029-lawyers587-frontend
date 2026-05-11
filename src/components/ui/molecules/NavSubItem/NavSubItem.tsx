'use client';
import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

export interface NavSubItemProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;
  label: string;
  badge?: ReactNode;
  active?: boolean;
}

export const NavSubItem = forwardRef<HTMLAnchorElement, NavSubItemProps>(
  ({ href, label, badge, active = false, className, ...rest }, ref) => {
    return (
      <Link
        ref={ref}
        href={href}
        className={cn(
          'flex items-center gap-2.5 rounded-lg py-1.5 pl-10 pr-2.5 text-xs font-medium tracking-[-0.005em] text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900',
          active && 'font-semibold text-slate-900',
          className
        )}
        {...rest}
      >
        <span
          aria-hidden
          className={cn(
            'h-1 w-1 shrink-0 rounded-full',
            active ? 'bg-customRed' : 'bg-slate-300'
          )}
        />
        <span className='truncate'>{label}</span>
        {badge ? <span className='ml-auto'>{badge}</span> : null}
      </Link>
    );
  }
);
NavSubItem.displayName = 'NavSubItem';
