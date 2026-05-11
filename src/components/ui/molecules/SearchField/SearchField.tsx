'use client';
import { forwardRef, type InputHTMLAttributes } from 'react';
import { MdSearch } from 'react-icons/md';
import { cn } from '@/lib/cn';

export interface SearchFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  containerClassName?: string;
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  (
    { placeholder = 'Search...', containerClassName, className, ...rest },
    ref
  ) => (
    <div
      role='search'
      className={cn(
        'flex h-[38px] w-[280px] items-center gap-2 rounded-[9px] border border-slate-200 bg-white px-3.5 transition-colors focus-within:border-slate-400',
        containerClassName
      )}
    >
      <MdSearch size={14} className='shrink-0 text-slate-400' aria-hidden />
      <input
        ref={ref}
        type='search'
        placeholder={placeholder}
        aria-label={typeof placeholder === 'string' ? placeholder : 'Search'}
        className={cn(
          'h-full w-full bg-transparent text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none',
          className
        )}
        {...rest}
      />
    </div>
  )
);
SearchField.displayName = 'SearchField';
