'use client';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { MdNotificationsNone } from 'react-icons/md';
import { IconButton } from '@/components/ui/atoms/IconButton';

export interface PillBellProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  hasNotifications?: boolean;
}

export const PillBell = forwardRef<HTMLButtonElement, PillBellProps>(
  ({ hasNotifications = false, className, ...rest }, ref) => (
    <IconButton ref={ref} variant='ghost' size='md' className={className} {...rest}>
      <MdNotificationsNone size={16} />
      {hasNotifications ? (
        <span
          aria-hidden
          className='absolute right-[9px] top-[8px] h-[7px] w-[7px] rounded-full border-2 border-white bg-customRed'
        />
      ) : null}
      <span className='sr-only'>
        {hasNotifications ? 'Notifications, unread items' : 'Notifications'}
      </span>
    </IconButton>
  )
);
PillBell.displayName = 'PillBell';
