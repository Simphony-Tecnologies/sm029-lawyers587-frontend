import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const iconBadgeStyles = cva(
  'inline-flex items-center justify-center shrink-0',
  {
    variants: {
      size: {
        sm: 'h-7 w-7 rounded-lg',
        md: 'h-9 w-9 rounded-[10px] border',
      },
      tone: {
        violet: 'bg-indigo-50 text-indigo-500 border-indigo-100',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        amber: 'bg-amber-50 text-amber-700 border-amber-200',
        coral: 'bg-red-50 text-customRed border-red-200',
        sky: 'bg-sky-50 text-sky-500 border-sky-100',
        slate: 'bg-slate-100 text-slate-700 border-slate-200',
      },
    },
    defaultVariants: { size: 'md', tone: 'slate' },
  }
);

export interface IconBadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof iconBadgeStyles> {
  children: ReactNode;
}

export const IconBadge = forwardRef<HTMLSpanElement, IconBadgeProps>(
  ({ size, tone, className, children, ...rest }, ref) => (
    <span
      ref={ref}
      className={cn(iconBadgeStyles({ size, tone }), className)}
      {...rest}
    >
      {children}
    </span>
  )
);
IconBadge.displayName = 'IconBadge';
