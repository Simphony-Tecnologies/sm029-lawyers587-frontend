import { forwardRef, type SVGAttributes } from 'react';
import { cn } from '@/lib/cn';

export type SparklineTone = 'violet' | 'emerald' | 'amber' | 'coral' | 'slate';

export interface SparklineProps extends SVGAttributes<SVGSVGElement> {
  data: number[];
  tone?: SparklineTone;
}

const STROKE: Record<SparklineTone, string> = {
  violet: 'stroke-indigo-500',
  emerald: 'stroke-emerald-500',
  amber: 'stroke-amber-500',
  coral: 'stroke-customRed',
  slate: 'stroke-slate-500',
};

const FILL: Record<SparklineTone, string> = {
  violet: 'fill-indigo-500/10',
  emerald: 'fill-emerald-500/10',
  amber: 'fill-amber-500/10',
  coral: 'fill-customRed/10',
  slate: 'fill-slate-500/10',
};

const buildPaths = (data: number[]) => {
  if (data.length < 2) return { line: '', area: '' };
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = 100 / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = 4 + ((max - v) / range) * 16;
    return [x, y] as const;
  });

  const line = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(' ');
  const area = `${line} L 100 24 L 0 24 Z`;

  return { line, area };
};

export const Sparkline = forwardRef<SVGSVGElement, SparklineProps>(
  ({ data, tone = 'slate', className, ...rest }, ref) => {
    const { line, area } = buildPaths(data);

    if (!line) return null;

    return (
      <svg
        ref={ref}
        viewBox='0 0 100 24'
        preserveAspectRatio='none'
        className={cn('h-6 w-full', className)}
        {...rest}
      >
        <path d={area} className={FILL[tone]} />
        <path
          d={line}
          className={cn(STROKE[tone], 'fill-none')}
          strokeWidth='1.5'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    );
  }
);
Sparkline.displayName = 'Sparkline';
