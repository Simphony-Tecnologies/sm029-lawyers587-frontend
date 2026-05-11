import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Avatar, toneFromString, type AvatarTone } from '@/components/ui/atoms/Avatar';

export interface LawyerIdentityProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  initials?: string;
  code?: string;
  service?: string;
  email?: string;
  phone?: string;
  avatarSrc?: string | null;
  tone?: AvatarTone;
  actions?: ReactNode;
}

const initialsFrom = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '·';

export const LawyerIdentity = forwardRef<HTMLDivElement, LawyerIdentityProps>(
  (
    {
      name,
      initials,
      code,
      service,
      email,
      phone,
      avatarSrc,
      tone,
      actions,
      className,
      ...rest
    },
    ref
  ) => {
    const computedTone = tone ?? toneFromString(name);
    const computedInitials = initials ?? initialsFrom(name);
    const metaItems = [service, email, phone].filter(Boolean) as string[];

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-wrap items-start justify-between gap-4',
          className
        )}
        {...rest}
      >
        <div className='flex items-center gap-4'>
          <Avatar
            size='2xl'
            shape='tile'
            tone={computedTone}
            initials={computedInitials}
            src={avatarSrc}
          />
          <div className='flex min-w-0 flex-col gap-1'>
            <h1 className='text-2xl font-extrabold leading-[1.1] tracking-[-0.025em] text-slate-900'>
              {name}
            </h1>
            <div className='flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500'>
              {code ? (
                <span className='rounded bg-slate-100 px-1.5 py-[3px] text-[10px] font-bold uppercase tracking-wider text-slate-400'>
                  {code}
                </span>
              ) : null}
              {metaItems.map((item, idx) => (
                <span key={`${item}-${idx}`} className='inline-flex items-center gap-2'>
                  {(idx > 0 || code) && (
                    <span aria-hidden className='text-slate-300'>·</span>
                  )}
                  <span className='truncate'>{item}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
        {actions ? <div className='flex shrink-0 items-center gap-2'>{actions}</div> : null}
      </div>
    );
  }
);
LawyerIdentity.displayName = 'LawyerIdentity';
