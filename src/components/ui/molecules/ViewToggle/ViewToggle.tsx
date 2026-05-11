'use client';
import { forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type ViewToggleOption<T extends string = string> = {
  value: T;
  icon: ReactNode;
  label: string;
};

export interface ViewToggleProps<T extends string = string> {
  options: ViewToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export const ViewToggle = forwardRef<HTMLDivElement, ViewToggleProps>(
  ({ options, value, onChange, className }, ref) => (
    <div
      ref={ref}
      role='group'
      className={cn(
        'inline-flex overflow-hidden rounded-lg border border-slate-200',
        className
      )}
    >
      {options.map((opt, idx) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type='button'
            aria-label={opt.label}
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex h-[34px] w-[34px] items-center justify-center text-xs font-semibold transition-colors focus:outline-none',
              active ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50',
              idx < options.length - 1 && 'border-r border-slate-200'
            )}
          >
            {opt.icon}
          </button>
        );
      })}
    </div>
  )
);
ViewToggle.displayName = 'ViewToggle';
