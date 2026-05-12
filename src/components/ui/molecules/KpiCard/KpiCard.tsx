'use client';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { IconBadge } from '@/components/ui/atoms/IconBadge';
import { Sparkline, type SparklineTone } from '@/components/ui/atoms/Sparkline';
import { TrendPill } from '@/components/ui/atoms/TrendPill';

export type KpiTone = SparklineTone;

export interface KpiCardProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  label: string;
  period?: string;
  value: number | string;
  tone: KpiTone;
  icon: ReactNode;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: string;
    meta?: string;
  };
  spark?: number[];
  caption?: ReactNode;
}

export const KpiCard = forwardRef<HTMLButtonElement, KpiCardProps>(
  (
    {
      label,
      period,
      value,
      tone,
      icon,
      trend,
      spark,
      caption,
      type,
      className,
      ...rest
    },
    ref
  ) => (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={cn(
        'group flex w-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-customRed/40 hover:border-slate-300 hover:shadow-[0_8px_24px_rgba(11,15,25,0.06)]',
        className
      )}
      {...rest}
    >
      <div className='flex items-start justify-between gap-2.5'>
        <div className='flex flex-col gap-0.5'>
          <span className='text-xs font-bold tracking-[-0.005em] text-slate-600'>
            {label}
          </span>
          {period ? (
            <span className='text-[10px] font-semibold uppercase tracking-wider text-slate-400'>
              {period}
            </span>
          ) : null}
        </div>
        <IconBadge size='md' tone={tone} aria-hidden>
          {icon}
        </IconBadge>
      </div>

      <div className='flex items-baseline gap-2.5'>
        <span className='text-[30px] font-extrabold leading-none tracking-[-0.035em] tabular-nums text-slate-900'>
          {value}
        </span>
        {trend ? <TrendPill direction={trend.direction} value={trend.value} /> : null}
        {trend?.meta ? (
          <span className='ml-auto text-[10px] font-medium text-slate-400'>
            {trend.meta}
          </span>
        ) : null}
      </div>

      {(spark && spark.length > 0) || caption ? (
        <div className='flex items-end justify-between gap-2.5'>
          {spark && spark.length > 0 ? (
            <Sparkline data={spark} tone={tone} className='flex-1' />
          ) : (
            <span aria-hidden className='flex-1' />
          )}
          {caption ? (
            <span className='text-[10px] font-semibold tabular-nums text-slate-400'>
              {caption}
            </span>
          ) : null}
        </div>
      ) : null}
    </button>
  )
);
KpiCard.displayName = 'KpiCard';
