import { forwardRef, type HTMLAttributes } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/cn';
import { SCORE_OPTIONS, isPossibleSpam, urgencyBucket } from '@/constants/leadAdvancedFilters';
import type { LeadScore } from '@/types/api.types';

// Fase 1 — Score del lead: urgencia IA (1–5) en tres niveles + marca de posible
// spam (spam_score ≥ 1). Mismo lenguaje visual que StatusPill / OriginBadge.
const scoreBadgeStyles = cva(
  'inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide leading-none whitespace-nowrap',
  {
    variants: {
      variant: {
        high: 'bg-red-50 text-customRed',
        medium: 'bg-amber-50 text-amber-700',
        low: 'bg-slate-100 text-slate-600',
        spam: 'bg-stone-100 text-stone-600',
      },
    },
    defaultVariants: { variant: 'low' },
  }
);

// Mismos labels que el filtro Score del panel y sus chips.
const labelOf = (score: LeadScore) =>
  SCORE_OPTIONS.find((o) => o.value === score)?.label ?? score;

export interface ScoreBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  urgency?: number | null;
  spamScore?: number | null;
}

/** Badge(s) de Score; "—" cuando el lead no tiene urgencia ni marca de spam. */
export const ScoreBadge = forwardRef<HTMLSpanElement, ScoreBadgeProps>(
  ({ urgency, spamScore, className, ...rest }, ref) => {
    const bucket = urgencyBucket(urgency);
    const spam = isPossibleSpam(spamScore);
    if (!bucket && !spam) {
      return (
        <span ref={ref} className={cn('text-[11px] text-slate-400', className)} {...rest}>
          —
        </span>
      );
    }
    return (
      <span ref={ref} className={cn('inline-flex flex-wrap items-center gap-1', className)} {...rest}>
        {bucket ? (
          <span className={scoreBadgeStyles({ variant: bucket })} title={`AI urgency ${urgency}/5`}>
            {labelOf(bucket)}
          </span>
        ) : null}
        {spam ? (
          <span className={scoreBadgeStyles({ variant: 'spam' })} title={`Spam score ${spamScore}/3`}>
            {labelOf('spam')}
          </span>
        ) : null}
      </span>
    );
  }
);
ScoreBadge.displayName = 'ScoreBadge';
