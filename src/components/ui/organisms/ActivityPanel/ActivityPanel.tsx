'use client';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { MdArrowForward } from 'react-icons/md';
import { cn } from '@/lib/cn';

export interface ActivityPanelProps extends HTMLAttributes<HTMLDivElement> {
  eyebrow?: string;
  title: string;
  onViewAll?: () => void;
  viewAllLabel?: string;
  empty?: boolean;
  emptyText?: string;
  children?: ReactNode;
}

export const ActivityPanel = forwardRef<HTMLDivElement, ActivityPanelProps>(
  (
    {
      eyebrow = 'Audit log',
      title,
      onViewAll,
      viewAllLabel = 'View all',
      empty = false,
      emptyText = 'No recent activity yet',
      children,
      className,
      ...rest
    },
    ref
  ) => (
    <section
      ref={ref}
      className={cn(
        'rounded-2xl border border-slate-200 bg-white px-5 pb-2 pt-5',
        className
      )}
      {...rest}
    >
      <header className='flex items-center justify-between border-b border-slate-100 pb-3.5'>
        <div className='flex flex-col gap-0.5'>
          <span className='text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400'>
            {eyebrow}
          </span>
          <h2 className='text-[15px] font-extrabold tracking-[-0.015em] text-slate-900'>
            {title}
          </h2>
        </div>
        {onViewAll ? (
          <button
            type='button'
            onClick={onViewAll}
            className='inline-flex items-center gap-1.5 bg-transparent text-xs font-bold text-slate-700 transition-colors hover:text-customRed focus:outline-none'
          >
            {viewAllLabel}
            <MdArrowForward size={11} />
          </button>
        ) : null}
      </header>

      <div className='flex flex-col'>
        {empty ? (
          <div className='flex flex-col items-center justify-center gap-1 py-10 text-center'>
            <span className='text-[13px] font-semibold text-slate-700'>
              {emptyText}
            </span>
            <span className='text-[11px] font-medium text-slate-400'>
              Audit log entries will appear here as they happen
            </span>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  )
);
ActivityPanel.displayName = 'ActivityPanel';
