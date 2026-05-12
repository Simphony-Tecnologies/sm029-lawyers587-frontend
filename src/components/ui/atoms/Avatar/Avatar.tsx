import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const avatarStyles = cva(
  'relative inline-flex shrink-0 items-center justify-center font-bold text-white select-none',
  {
    variants: {
      size: {
        xs: 'h-6 w-6 text-[9px]',
        sm: 'h-8 w-8 text-[11px]',
        md: 'h-9 w-9 text-[13px]',
        lg: 'h-10 w-10 text-xs',
        xl: 'h-12 w-12 text-sm',
        '2xl': 'h-[52px] w-[52px] text-lg shadow-[0_6px_16px_rgba(14,165,233,0.25)]',
      },
      tone: {
        coral: 'bg-[linear-gradient(135deg,#F4A8A0_0%,#C44E43_100%)]',
        primary: 'bg-[linear-gradient(135deg,#5A78A8_0%,#00234D_100%)]',
        slate: 'bg-[linear-gradient(135deg,#94A3B8_0%,#1E293B_100%)]',
        sky: 'bg-[linear-gradient(135deg,#0EA5E9_0%,#0369A1_100%)]',
        violet: 'bg-[linear-gradient(135deg,#8B5CF6_0%,#5B21B6_100%)]',
        amber: 'bg-[linear-gradient(135deg,#F59E0B_0%,#B45309_100%)]',
        rose: 'bg-[linear-gradient(135deg,#EC4899_0%,#9D174D_100%)]',
        emerald: 'bg-[linear-gradient(135deg,#10B981_0%,#047857_100%)]',
      },
      shape: {
        circle: 'rounded-full',
        rounded: 'rounded-[10px]',
        tile: 'rounded-[14px]',
      },
    },
    defaultVariants: {
      size: 'sm',
      tone: 'coral',
      shape: 'circle',
    },
  }
);

export type AvatarTone =
  | 'coral'
  | 'primary'
  | 'slate'
  | 'sky'
  | 'violet'
  | 'amber'
  | 'rose'
  | 'emerald';

export type AvatarStatus = 'online' | 'offline';

export interface AvatarProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarStyles> {
  initials: string;
  src?: string | null;
  alt?: string;
  status?: AvatarStatus;
}

const HASH_TONES: AvatarTone[] = [
  'sky',
  'violet',
  'amber',
  'rose',
  'emerald',
];

export const toneFromString = (str: string): AvatarTone => {
  if (!str) return 'slate';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  return HASH_TONES[Math.abs(hash) % HASH_TONES.length];
};

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  (
    { initials, src, alt, size, tone, shape, status, className, ...rest },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(avatarStyles({ size, tone, shape }), className)}
        {...rest}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt ?? initials}
            className={cn(
              'h-full w-full object-cover',
              shape === 'rounded' && 'rounded-[10px]',
              shape === 'tile' && 'rounded-[14px]',
              (!shape || shape === 'circle') && 'rounded-full'
            )}
          />
        ) : (
          <span className='leading-none'>{initials.slice(0, 2).toUpperCase()}</span>
        )}
        {status ? (
          <span
            aria-hidden
            className={cn(
              'absolute -bottom-px -right-px h-[9px] w-[9px] rounded-full border-2 border-white',
              status === 'online' ? 'bg-customGreen' : 'bg-slate-300'
            )}
          />
        ) : null}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';
