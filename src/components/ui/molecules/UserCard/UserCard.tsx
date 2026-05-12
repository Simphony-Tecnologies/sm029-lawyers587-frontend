'use client';
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/atoms/Avatar';
import { OnlineDot } from '@/components/ui/atoms/OnlineDot';

export interface UserCardProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  role: string;
  initials: string;
  avatarSrc?: string | null;
  online?: boolean;
}

export const UserCard = forwardRef<HTMLDivElement, UserCardProps>(
  (
    { name, role, initials, avatarSrc, online = true, className, ...rest },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-slate-50',
          className
        )}
        {...rest}
      >
        <Avatar initials={initials} src={avatarSrc} />
        <div className='flex min-w-0 flex-1 flex-col gap-px leading-tight'>
          <span className='truncate text-xs font-bold text-slate-900'>
            {name}
          </span>
          <span className='text-[10px] font-medium text-slate-500'>{role}</span>
        </div>
        <OnlineDot online={online} />
      </div>
    );
  }
);
UserCard.displayName = 'UserCard';
