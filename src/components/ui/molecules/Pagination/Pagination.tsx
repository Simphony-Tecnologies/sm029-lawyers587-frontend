'use client';
import { forwardRef } from 'react';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { cn } from '@/lib/cn';

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
  siblingCount?: number;
}

const buildRange = (
  current: number,
  total: number,
  siblings: number
): (number | 'dots')[] => {
  if (total <= 1) return [1];
  const pages = new Set<number>([1, total, current]);
  for (let i = 1; i <= siblings; i++) {
    if (current - i > 1) pages.add(current - i);
    if (current + i < total) pages.add(current + i);
  }
  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: (number | 'dots')[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('dots');
    result.push(sorted[i]);
  }
  return result;
};

export const Pagination = forwardRef<HTMLDivElement, PaginationProps>(
  ({ page, pageCount, onPageChange, className, siblingCount = 1 }, ref) => {
    if (pageCount <= 0) return null;
    const range = buildRange(page, pageCount, siblingCount);

    const goto = (p: number) => {
      const clamped = Math.max(1, Math.min(pageCount, p));
      if (clamped !== page) onPageChange(clamped);
    };

    return (
      <nav
        ref={ref}
        aria-label='Pagination'
        className={cn('flex items-center gap-1', className)}
      >
        <button
          type='button'
          aria-label='Previous page'
          disabled={page <= 1}
          onClick={() => goto(page - 1)}
          className='flex h-[30px] w-[30px] items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40'
        >
          <MdChevronLeft size={14} />
        </button>
        {range.map((item, idx) =>
          item === 'dots' ? (
            <span
              key={`dots-${idx}`}
              aria-hidden
              className='flex h-[30px] w-[30px] items-center justify-center text-[11px] font-semibold text-slate-400'
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type='button'
              aria-current={item === page ? 'page' : undefined}
              onClick={() => goto(item)}
              className={cn(
                'flex h-[30px] w-[30px] items-center justify-center rounded-md text-[11px] font-semibold transition-colors',
                item === page
                  ? 'border border-slate-900 bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              {item}
            </button>
          )
        )}
        <button
          type='button'
          aria-label='Next page'
          disabled={page >= pageCount}
          onClick={() => goto(page + 1)}
          className='flex h-[30px] w-[30px] items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40'
        >
          <MdChevronRight size={14} />
        </button>
      </nav>
    );
  }
);
Pagination.displayName = 'Pagination';
