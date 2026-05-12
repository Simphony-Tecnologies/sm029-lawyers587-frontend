'use client';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { MdLogout } from 'react-icons/md';
import { cn } from '@/lib/cn';

export interface SignOutItemProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

export const SignOutItem = forwardRef<HTMLButtonElement, SignOutItemProps>(
  ({ label = 'Sign out', className, type, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        className={cn(
          'group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-red-50 hover:text-customRed',
          className
        )}
        {...rest}
      >
        <span className='flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[13px] text-slate-500 transition-colors group-hover:text-customRed'>
          <MdLogout size={14} />
        </span>
        {label}
      </button>
    );
  }
);
SignOutItem.displayName = 'SignOutItem';
