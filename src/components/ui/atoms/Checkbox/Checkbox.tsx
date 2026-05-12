'use client';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type CheckboxState = 'unchecked' | 'checked' | 'partial';

export interface CheckboxProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  state?: CheckboxState;
  size?: 'sm' | 'md';
  onChange?: (nextChecked: boolean) => void;
}

const sizeMap = {
  sm: 'h-4 w-4 rounded',
  md: 'h-[18px] w-[18px] rounded-[5px]',
};

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
  (
    {
      state = 'unchecked',
      size = 'md',
      onChange,
      onClick,
      className,
      type,
      'aria-label': ariaLabel = 'Toggle selection',
      ...rest
    },
    ref
  ) => {
    const isActive = state === 'checked' || state === 'partial';

    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        role='checkbox'
        aria-checked={
          state === 'partial' ? 'mixed' : state === 'checked' ? 'true' : 'false'
        }
        aria-label={ariaLabel}
        onClick={(e) => {
          onClick?.(e);
          if (e.defaultPrevented) return;
          onChange?.(state !== 'checked');
        }}
        className={cn(
          'inline-flex flex-shrink-0 items-center justify-center border-[1.5px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-customRed/40',
          sizeMap[size],
          isActive
            ? 'border-slate-900 bg-slate-900'
            : 'border-slate-300 bg-white hover:border-slate-400',
          className
        )}
        {...rest}
      >
        {state === 'checked' ? (
          <span
            aria-hidden
            className='block h-[5px] w-[8px] -translate-y-[1px] -rotate-45 border-b-[2px] border-l-[2px] border-white'
          />
        ) : state === 'partial' ? (
          <span
            aria-hidden
            className='block h-0 w-2 border-b-[2px] border-white'
          />
        ) : null}
      </button>
    );
  }
);
Checkbox.displayName = 'Checkbox';
