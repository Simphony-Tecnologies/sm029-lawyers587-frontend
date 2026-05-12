'use client';
import { forwardRef, type SelectHTMLAttributes } from 'react';
import { MdKeyboardArrowDown } from 'react-icons/md';
import { cn } from '@/lib/cn';

export interface RowsPerPageSelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
  options?: number[];
}

export const RowsPerPageSelect = forwardRef<
  HTMLSelectElement,
  RowsPerPageSelectProps
>(({ value, onChange, options = [10, 20, 50, 100], className, ...rest }, ref) => (
  <div
    className={cn(
      'inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 transition-colors hover:border-slate-300',
      className
    )}
  >
    <select
      ref={ref}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label='Rows per page'
      className='appearance-none bg-transparent pr-1 text-[11px] font-semibold text-slate-700 focus:outline-none'
      {...rest}
    >
      {options.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
    <MdKeyboardArrowDown size={12} className='text-slate-400' aria-hidden />
  </div>
));
RowsPerPageSelect.displayName = 'RowsPerPageSelect';
