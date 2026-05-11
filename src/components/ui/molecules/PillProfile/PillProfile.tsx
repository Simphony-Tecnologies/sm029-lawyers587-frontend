'use client';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/atoms/Avatar';

export interface PillProfileProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  name: string;
  role: string;
  initials: string;
  avatarSrc?: string | null;
  online?: boolean;
}

export const PillProfile = forwardRef<HTMLButtonElement, PillProfileProps>(
  (
    {
      name,
      role,
      initials,
      avatarSrc,
      online = true,
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
        'flex items-center gap-2.5 rounded-full border-none bg-transparent py-1 pl-1.5 pr-3.5 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-customRed/40 data-[active]:bg-slate-100 data-[open]:bg-slate-100',
        className
      )}
      {...rest}
    >
      <Avatar
        size='sm'
        shape='circle'
        initials={initials}
        src={avatarSrc}
        status={online ? 'online' : undefined}
      />
      <span className='flex flex-col gap-px text-left leading-tight'>
        <span className='text-xs font-bold tracking-[-0.005em] text-slate-900'>
          {name}
        </span>
        <span className='text-[10px] font-semibold tracking-[0.02em] text-slate-500'>
          {role}
        </span>
      </span>
    </button>
  )
);
PillProfile.displayName = 'PillProfile';
