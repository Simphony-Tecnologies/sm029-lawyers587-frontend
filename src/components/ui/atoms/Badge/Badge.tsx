import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeStyles = cva(
  'inline-flex items-center justify-center rounded-full font-bold tabular-nums leading-none',
  {
    variants: {
      variant: {
        count: 'bg-slate-100 text-slate-600',
        alert: 'bg-customRed text-white',
        new: 'bg-red-50 text-customRed',
      },
      size: {
        sm: 'h-4 min-w-[16px] px-[5px] text-[9px]',
        md: 'h-[18px] min-w-[20px] px-[6px] text-[10px]',
      },
    },
    defaultVariants: {
      variant: 'count',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeStyles> {}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant, size, className, children, ...rest }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeStyles({ variant, size }), className)}
        {...rest}
      >
        {children}
      </span>
    );
  }
);
Badge.displayName = 'Badge';
