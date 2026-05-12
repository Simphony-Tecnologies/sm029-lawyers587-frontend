import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type LiveDotState = 'active' | 'inactive';

export interface LiveDotProps extends HTMLAttributes<HTMLSpanElement> {
  state?: LiveDotState;
  label?: string;
}

export const LiveDot = forwardRef<HTMLSpanElement, LiveDotProps>(
  ({ state = 'active', label, className, ...rest }, ref) => {
    if (label) {
      return (
        <span
          ref={ref}
          className={cn(
            'inline-flex items-center gap-2 text-xs font-semibold tracking-[-0.005em]',
            state === 'active' ? 'text-slate-700' : 'text-slate-400',
            className
          )}
          {...rest}
        >
          <span
            aria-hidden
            className={cn(
              'h-[7px] w-[7px] flex-shrink-0 rounded-full',
              state === 'active' ? 'bg-customGreen' : 'bg-slate-300'
            )}
          />
          {label}
        </span>
      );
    }
    return (
      <span
        ref={ref}
        aria-hidden
        className={cn(
          'inline-block h-[7px] w-[7px] rounded-full',
          state === 'active' ? 'bg-customGreen' : 'bg-slate-300',
          className
        )}
        {...rest}
      />
    );
  }
);
LiveDot.displayName = 'LiveDot';
