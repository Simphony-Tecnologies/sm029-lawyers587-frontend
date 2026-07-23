import { Fragment } from 'react';
import { MdCheck } from 'react-icons/md';
import { cn } from '@/lib/cn';

export interface StepperProps {
  steps: string[];
  current: number; // índice 0-based del paso activo
  className?: string;
}

export const Stepper = ({ steps, current, className }: StepperProps) => (
  <ol className={cn('flex w-full items-center', className)}>
    {steps.map((label, index) => {
      const isComplete = index < current;
      const isCurrent = index === current;
      const isLast = index === steps.length - 1;
      return (
        <Fragment key={label}>
          <li className='flex flex-col items-center gap-1.5'>
            <span
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition-colors',
                isComplete && 'border-primary bg-primary text-white',
                isCurrent &&
                  'border-primary bg-white text-primary ring-4 ring-primary/15',
                !isComplete &&
                  !isCurrent &&
                  'border-slate-300 bg-white text-slate-400'
              )}
            >
              {isComplete ? <MdCheck className='text-base' /> : index + 1}
            </span>
            <span
              className={cn(
                'hidden max-w-[84px] text-center text-[10px] font-semibold leading-tight sm:block',
                isCurrent || isComplete ? 'text-primary' : 'text-slate-400'
              )}
            >
              {label}
            </span>
          </li>
          {!isLast && (
            <span
              className={cn(
                'mx-1 mb-4 h-0.5 flex-1 rounded-full transition-colors sm:mx-2',
                isComplete ? 'bg-primary' : 'bg-slate-200'
              )}
            />
          )}
        </Fragment>
      );
    })}
  </ol>
);

Stepper.displayName = 'Stepper';
