'use client';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { MdKeyboardArrowDown } from 'react-icons/md';
import { cn } from '@/lib/cn';

export interface FilterButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
  count?: number | string;
  /** When true, show a chevron even on active state (use for dropdown triggers). */
  dropdown?: boolean;
  trailing?: ReactNode;
}

export const FilterButton = forwardRef<HTMLButtonElement, FilterButtonProps>(
  (
    {
      label,
      active = false,
      count,
      dropdown = false,
      trailing,
      type,
      className,
      ...rest
    },
    ref
  ) => {
    const showChevron = !active || dropdown;
    const showActiveDot = active && !dropdown && count === undefined;

    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        className={cn(
          'inline-flex h-[34px] items-center gap-1.5 rounded-lg border px-3 text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-customRed/40',
          active
            ? 'border-slate-900 bg-slate-900 text-white'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900',
          className
        )}
        {...rest}
      >
        <span>{label}</span>
        {count !== undefined ? (
          <span
            aria-hidden
            className={cn(
              'inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[9px] font-bold tabular-nums',
              active
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-600'
            )}
          >
            {count}
          </span>
        ) : null}
        {trailing ? <span className='inline-flex'>{trailing}</span> : null}
        {showChevron ? (
          <MdKeyboardArrowDown
            size={12}
            className={cn(active ? 'text-white/70' : 'text-slate-400')}
            aria-hidden
          />
        ) : null}
        {showActiveDot ? (
          <span
            aria-hidden
            className='h-[5px] w-[5px] rounded-full bg-white'
          />
        ) : null}
      </button>
    );
  }
);
FilterButton.displayName = 'FilterButton';
