'use client';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { MdKeyboardArrowDown } from 'react-icons/md';
import { cn } from '@/lib/cn';

export interface PeriodSelectProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

export const PeriodSelect = forwardRef<HTMLButtonElement, PeriodSelectProps>(
  ({ label, type, className, ...rest }, ref) => (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-[9px] border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-customRed/40',
        className
      )}
      {...rest}
    >
      {label}
      <MdKeyboardArrowDown size={14} className='text-slate-400' />
    </button>
  )
);
PeriodSelect.displayName = 'PeriodSelect';
