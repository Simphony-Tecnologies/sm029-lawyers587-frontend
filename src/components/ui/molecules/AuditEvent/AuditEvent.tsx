import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type AuditEventTone =
  | 'emerald'
  | 'violet'
  | 'amber'
  | 'sky'
  | 'rose'
  | 'slate';

const DOT_CLASS: Record<AuditEventTone, string> = {
  emerald: 'bg-emerald-500',
  violet: 'bg-indigo-500',
  amber: 'bg-amber-500',
  sky: 'bg-sky-500',
  rose: 'bg-rose-500',
  slate: 'bg-slate-400',
};

export interface AuditEventProps extends HTMLAttributes<HTMLDivElement> {
  tone: AuditEventTone;
  type: string;
  detail: ReactNode;
  lead?: string;
  time?: string;
}

export const AuditEvent = forwardRef<HTMLDivElement, AuditEventProps>(
  ({ tone, type, detail, lead, time, className, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        'grid grid-cols-[36px_140px_1fr_130px_120px] items-center border-b border-slate-100 px-5 py-3.5 text-xs text-slate-700 last:border-b-0',
        className
      )}
      {...rest}
    >
      <div className='flex items-center'>
        <span
          aria-hidden
          className={cn('h-2 w-2 rounded-full', DOT_CLASS[tone])}
        />
      </div>
      <div className='font-semibold text-slate-900'>{type}</div>
      <div className='min-w-0 truncate text-slate-600'>{detail}</div>
      <div className='font-semibold tabular-nums text-slate-500'>
        {lead ?? '—'}
      </div>
      <div className='tabular-nums text-slate-400'>{time ?? '—'}</div>
    </div>
  )
);
AuditEvent.displayName = 'AuditEvent';
