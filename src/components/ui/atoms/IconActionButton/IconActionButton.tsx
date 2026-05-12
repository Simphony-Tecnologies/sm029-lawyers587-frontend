'use client';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const styles = cva(
  'inline-flex flex-shrink-0 items-center justify-center rounded-[7px] border bg-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-40',
  {
    variants: {
      tone: {
        neutral:
          'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900',
        primary:
          'border-slate-200 text-slate-500 hover:border-slate-700 hover:bg-slate-50 hover:text-slate-900',
        warning:
          'border-slate-200 text-slate-500 hover:border-slate-500 hover:bg-slate-50 hover:text-slate-700',
        danger:
          'border-slate-200 text-slate-500 hover:border-customRed hover:bg-red-50 hover:text-customRed focus-visible:ring-customRed/30',
      },
      size: {
        sm: 'h-7 w-7 [&>svg]:h-3 [&>svg]:w-3',
        md: 'h-[30px] w-[30px] [&>svg]:h-3 [&>svg]:w-3',
        lg: 'h-9 w-9 [&>svg]:h-3.5 [&>svg]:w-3.5',
      },
    },
    defaultVariants: {
      tone: 'neutral',
      size: 'md',
    },
  }
);

export interface IconActionButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof styles> {
  icon: ReactNode;
  /** Required for screen readers since this button has no visible text. */
  label: string;
}

export const IconActionButton = forwardRef<
  HTMLButtonElement,
  IconActionButtonProps
>(({ icon, label, tone, size, type, className, ...rest }, ref) => (
  <button
    ref={ref}
    type={type ?? 'button'}
    aria-label={label}
    title={label}
    className={cn(styles({ tone, size }), className)}
    {...rest}
  >
    {icon}
  </button>
));
IconActionButton.displayName = 'IconActionButton';
