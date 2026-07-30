import { forwardRef, type HTMLAttributes } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/cn';
import { sourceLabel, sourceVariant } from '@/lib/lead-source';

// Badge de origen de ingesta del lead (chatbot vs formulario web). Distinto del
// SourceBadge de `channel` (atribución de marketing). Muestra `label` si viene del
// backend (source_label); si no, deriva desde el `source` crudo.
const originBadgeStyles = cva(
  'inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide leading-none whitespace-nowrap',
  {
    variants: {
      variant: {
        chatbot: 'bg-indigo-50 text-indigo-700',
        web_form: 'bg-sky-50 text-sky-700',
        api: 'bg-slate-100 text-slate-600',
        system: 'bg-slate-100 text-slate-600',
        bulk: 'bg-stone-100 text-stone-600',
        unknown: 'bg-slate-100 text-slate-400',
      },
    },
    defaultVariants: { variant: 'web_form' },
  }
);

export interface OriginBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  source?: string | null;
  label?: string | null;
}

export const OriginBadge = forwardRef<HTMLSpanElement, OriginBadgeProps>(
  ({ source, label, className, ...rest }, ref) => {
    const variant = sourceVariant(source);
    const text = (label ?? '').trim() || sourceLabel(source);
    return (
      <span
        ref={ref}
        className={cn(originBadgeStyles({ variant }), className)}
        {...rest}
      >
        {text}
      </span>
    );
  }
);
OriginBadge.displayName = 'OriginBadge';
