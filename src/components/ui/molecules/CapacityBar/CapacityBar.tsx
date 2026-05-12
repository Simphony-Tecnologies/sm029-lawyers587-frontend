'use client';
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type CapacityState = 'idle' | 'low' | 'mid' | 'high' | 'full' | 'paused' | 'pending';

export interface CapacityBarProps extends HTMLAttributes<HTMLDivElement> {
  current: number;
  max: number;
  /** Override auto-derived state (idle/low/mid/high/full or paused/pending) */
  state?: CapacityState;
  /** Hide the percentage / state label on the right */
  hideLabel?: boolean;
}

const labelMap: Record<CapacityState, (current: number, max: number) => string> = {
  idle: (c, m) => (m > 0 ? `${Math.round((c / m) * 100)}%` : '—'),
  low: (c, m) => `${Math.round((c / m) * 100)}%`,
  mid: (c, m) => `${Math.round((c / m) * 100)}%`,
  high: (c, m) => `${Math.round((c / m) * 100)}%`,
  full: () => 'full',
  paused: () => 'paused',
  pending: () => 'pending',
};

const fillClassByState: Record<CapacityState, string> = {
  idle: 'bg-slate-400',
  low: 'bg-slate-700',
  mid: 'bg-slate-700',
  high: 'bg-customRed',
  full: 'bg-customRed',
  paused: 'bg-slate-300 opacity-40',
  pending: 'bg-slate-300',
};

const labelClassByState: Record<CapacityState, string> = {
  idle: 'text-slate-400',
  low: 'text-slate-400',
  mid: 'text-slate-400',
  high: 'text-customRed',
  full: 'text-customRed font-bold',
  paused: 'text-slate-400',
  pending: 'text-customRed font-bold',
};

const deriveState = (current: number, max: number): CapacityState => {
  if (max <= 0) return 'pending';
  const pct = current / max;
  if (pct >= 1) return 'full';
  if (pct >= 0.85) return 'high';
  if (pct >= 0.5) return 'mid';
  if (pct > 0) return 'low';
  return 'idle';
};

export const CapacityBar = forwardRef<HTMLDivElement, CapacityBarProps>(
  ({ current, max, state, hideLabel = false, className, ...rest }, ref) => {
    const safeMax = Math.max(0, max);
    const safeCurrent = Math.max(0, Math.min(current, safeMax || current));
    const finalState = state ?? deriveState(safeCurrent, safeMax);
    const pct = safeMax > 0 ? Math.min(100, (safeCurrent / safeMax) * 100) : 0;
    const numMuted = finalState === 'pending' || finalState === 'paused';

    return (
      <div
        ref={ref}
        className={cn('flex min-w-0 flex-col gap-1.5', className)}
        {...rest}
      >
        <div className='flex items-baseline gap-1.5'>
          <span
            className={cn(
              'text-[13px] font-extrabold leading-none tracking-[-0.01em] tabular-nums',
              numMuted ? 'text-slate-300' : 'text-slate-900'
            )}
          >
            {safeCurrent}
          </span>
          <span className='text-[11px] font-semibold tabular-nums text-slate-400'>
            / {safeMax}
          </span>
          {hideLabel ? null : (
            <span
              className={cn(
                'ml-auto text-[10px] font-semibold leading-none',
                labelClassByState[finalState]
              )}
            >
              {labelMap[finalState](safeCurrent, safeMax)}
            </span>
          )}
        </div>
        <div className='h-1 overflow-hidden rounded-full bg-slate-100'>
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-300',
              fillClassByState[finalState]
            )}
            style={{
              width: finalState === 'paused' ? `${pct || 50}%` : `${pct}%`,
            }}
            aria-hidden
          />
        </div>
      </div>
    );
  }
);
CapacityBar.displayName = 'CapacityBar';
