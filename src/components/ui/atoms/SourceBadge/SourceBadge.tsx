import { forwardRef, type HTMLAttributes } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/cn';
import type { Channel } from '@/types/api.types';

// Badge de canal de adquisición. El `channel` viene derivado del backend;
// tolera valores nulos/desconocidos → 'unknown'.
const sourceBadgeStyles = cva(
  'inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide leading-none whitespace-nowrap',
  {
    variants: {
      variant: {
        google_ads: 'bg-violet-50 text-violet-700',
        google_organic: 'bg-sky-50 text-sky-700',
        bing_ads: 'bg-teal-50 text-teal-700',
        search_organic: 'bg-sky-50 text-sky-700',
        meta_ads: 'bg-indigo-50 text-indigo-700',
        meta_social: 'bg-indigo-50 text-indigo-700',
        social: 'bg-emerald-50 text-emerald-700',
        email: 'bg-amber-50 text-amber-700',
        referral: 'bg-slate-100 text-slate-600',
        direct: 'bg-slate-100 text-slate-600',
        import: 'bg-stone-100 text-stone-600',
        unknown: 'bg-slate-100 text-slate-400',
      },
    },
    defaultVariants: { variant: 'unknown' },
  }
);

const LABELS: Record<Channel, string> = {
  google_ads: 'Google Ads',
  google_organic: 'Google Organic',
  bing_ads: 'Bing Ads',
  search_organic: 'Search Organic',
  meta_ads: 'Meta Ads',
  meta_social: 'Meta Social',
  social: 'Social',
  email: 'Email',
  referral: 'Referral',
  direct: 'Direct',
  import: 'Import',
  unknown: 'Unknown',
};

const normalize = (channel?: Channel | string | null): Channel =>
  channel && channel in LABELS ? (channel as Channel) : 'unknown';

export interface SourceBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  channel?: Channel | string | null;
}

export const SourceBadge = forwardRef<HTMLSpanElement, SourceBadgeProps>(
  ({ channel, className, ...rest }, ref) => {
    const variant = normalize(channel);
    return (
      <span
        ref={ref}
        className={cn(sourceBadgeStyles({ variant }), className)}
        {...rest}
      >
        {LABELS[variant]}
      </span>
    );
  }
);
SourceBadge.displayName = 'SourceBadge';
