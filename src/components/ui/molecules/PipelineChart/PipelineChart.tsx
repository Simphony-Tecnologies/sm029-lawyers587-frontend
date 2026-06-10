'use client';
import { useMemo } from 'react';
import { cn } from '@/lib/cn';

export interface PipelineSegment {
  key: string;
  label: string;
  value: number;
  color: string;
  dotClass: string;
}

export interface PipelineChartProps {
  segments: PipelineSegment[];
  className?: string;
}

const RADIUS = 52;
const STROKE = 14;
const SIZE = (RADIUS + STROKE) * 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const PipelineChart = ({ segments, className }: PipelineChartProps) => {
  const total = useMemo(
    () => segments.reduce((sum, s) => sum + s.value, 0),
    [segments]
  );

  const arcs = useMemo(() => {
    if (total === 0) return [];
    let offset = 0;
    return segments
      .filter((s) => s.value > 0)
      .map((seg) => {
        const pct = seg.value / total;
        const dashLen = pct * CIRCUMFERENCE;
        const gap = CIRCUMFERENCE - dashLen;
        const arc = {
          ...seg,
          pct,
          dasharray: `${dashLen} ${gap}`,
          offset: -offset,
        };
        offset += dashLen;
        return arc;
      });
  }, [segments, total]);

  return (
    <div
      className={cn(
        'flex items-center gap-8 rounded-2xl border border-slate-200 bg-white px-6 py-5',
        className
      )}
    >
      {/* Donut */}
      <div className='relative flex-shrink-0'>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className='block -rotate-90'
        >
          {/* Background ring */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill='none'
            stroke='#f1f5f9'
            strokeWidth={STROKE}
          />
          {/* Data arcs */}
          {arcs.map((arc) => (
            <circle
              key={arc.key}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill='none'
              stroke={arc.color}
              strokeWidth={STROKE}
              strokeDasharray={arc.dasharray}
              strokeDashoffset={arc.offset}
              strokeLinecap='round'
              className='transition-all duration-500'
            />
          ))}
        </svg>
        {/* Center label */}
        <div className='absolute inset-0 flex flex-col items-center justify-center'>
          <span className='text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400'>
            Total
          </span>
          <span className='text-[22px] font-extrabold leading-none tracking-[-0.02em] text-slate-900'>
            {total}
          </span>
          <span className='text-[10px] font-medium text-slate-400'>Leads</span>
        </div>
      </div>

      {/* Legend */}
      <div className='flex flex-col gap-2.5'>
        <span className='text-[13px] font-extrabold tracking-[-0.01em] text-slate-900'>
          Pipeline Overview
        </span>
        <div className='flex flex-col gap-1.5'>
          {segments.map((seg) => {
            const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
            return (
              <div
                key={seg.key}
                className='flex items-center gap-2 text-[12px]'
              >
                <span
                  aria-hidden
                  className={cn('h-2 w-2 rounded-full', seg.dotClass)}
                />
                <span className='font-semibold text-slate-700'>
                  {seg.label}
                </span>
                <span className='tabular-nums text-slate-400'>
                  {seg.value}{' '}
                  <span className='text-[10px]'>({pct}%)</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
PipelineChart.displayName = 'PipelineChart';
