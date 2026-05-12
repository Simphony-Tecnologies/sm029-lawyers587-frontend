import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface OnlineDotProps extends HTMLAttributes<HTMLSpanElement> {
  online?: boolean;
}

export const OnlineDot = forwardRef<HTMLSpanElement, OnlineDotProps>(
  ({ online = true, className, ...rest }, ref) => {
    return (
      <span
        ref={ref}
        aria-hidden
        className={cn(
          'block h-[7px] w-[7px] shrink-0 rounded-full border-[1.5px] border-white',
          online ? 'bg-customGreen' : 'bg-slate-300',
          className
        )}
        {...rest}
      />
    );
  }
);
OnlineDot.displayName = 'OnlineDot';
