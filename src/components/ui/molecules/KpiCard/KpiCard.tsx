'use client';
import { forwardRef, useId, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { MdInfoOutline } from 'react-icons/md';
import { cn } from '@/lib/cn';
import { IconBadge } from '@/components/ui/atoms/IconBadge';
import { Sparkline, type SparklineTone } from '@/components/ui/atoms/Sparkline';
import { TrendPill } from '@/components/ui/atoms/TrendPill';

// 'sky' existe en IconBadge; la sparkline no tiene ese tono y usa 'slate'.
export type KpiTone = SparklineTone | 'sky';

export interface KpiCardProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  label: string;
  /** Subtítulo en mayúsculas (estilo eyebrow). */
  period?: string;
  /** Subtítulo en tipo oración (p. ej. "Needs assignment"). Tiene prioridad sobre `period`. */
  hint?: string;
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
  /** Definición de la métrica: se muestra en un tooltip (ⓘ) junto al label. */
  info?: string;
}

export const KpiCard = forwardRef<HTMLButtonElement, KpiCardProps>(
  (
    {
      label,
      period,
      hint,
      value,
      tone,
      icon,
      trend,
      spark,
      caption,
      info,
      type,
      className,
      ...rest
    },
    ref
  ) => {
    const infoId = useId();
    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        aria-describedby={info ? infoId : undefined}
        className={cn(
          'group relative flex w-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-customRed/40 hover:border-slate-300 hover:shadow-[0_8px_24px_rgba(11,15,25,0.06)]',
          className
        )}
        {...rest}
      >
        <div className='flex items-start justify-between gap-2.5'>
          <div className='flex flex-col gap-0.5'>
            <span className='flex items-center gap-1 text-xs font-bold tracking-[-0.005em] text-slate-600'>
              {label}
              {info ? (
                <span className='group/info inline-flex'>
                  <MdInfoOutline
                    size={13}
                    aria-hidden
                    className='text-slate-400 transition-colors group-hover/info:text-slate-600'
                  />
                  {/* Anclado a la card (no al ícono) para no desbordar el
                      contenedor. Visible con hover sobre el ⓘ o con foco de
                      teclado en la card; el lector lo lee como descripción. */}
                  <span
                    id={infoId}
                    aria-hidden
                    className='pointer-events-none absolute inset-x-4 top-12 z-20 rounded-lg bg-slate-900 px-2.5 py-2 text-[11px] font-medium leading-snug tracking-normal text-white opacity-0 shadow-lg transition-opacity group-focus-visible:opacity-100 group-hover/info:opacity-100'
                  >
                    {info}
                  </span>
                </span>
              ) : null}
            </span>
            {hint ? (
              <span className='text-[11px] font-medium text-slate-500'>
                {hint}
              </span>
            ) : period ? (
              <span className='text-[10px] font-semibold uppercase tracking-wider text-slate-400'>
                {period}
              </span>
            ) : null}
          </div>
          <IconBadge size='md' tone={tone} aria-hidden>
            {icon}
          </IconBadge>
        </div>

        <div className='mt-auto flex items-baseline gap-2.5'>
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
              <Sparkline
                data={spark}
                tone={tone === 'sky' ? 'slate' : tone}
                className='flex-1'
              />
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
    );
  }
);
KpiCard.displayName = 'KpiCard';
