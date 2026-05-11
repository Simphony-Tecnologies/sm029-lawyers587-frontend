import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/atoms/Avatar';

export interface MenuIdentityProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  email?: string;
  initials: string;
  avatarSrc?: string | null;
}

export const MenuIdentity = forwardRef<HTMLDivElement, MenuIdentityProps>(
  ({ name, email, initials, avatarSrc, className, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        'mb-1.5 flex items-center gap-2.5 border-b border-slate-100 px-2.5 pb-3 pt-2.5',
        className
      )}
      {...rest}
    >
      <Avatar
        size='md'
        shape='rounded'
        initials={initials}
        src={avatarSrc}
      />
      <div className='flex min-w-0 flex-1 flex-col gap-px leading-tight'>
        <span className='truncate text-[13px] font-extrabold tracking-[-0.01em] text-slate-900'>
          {name}
        </span>
        {email ? (
          <span className='truncate text-[11px] font-medium text-slate-500'>
            {email}
          </span>
        ) : null}
      </div>
    </div>
  )
);
MenuIdentity.displayName = 'MenuIdentity';
