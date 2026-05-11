'use client';
import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const menuItemStyles = cva(
  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold tracking-[-0.005em] transition-colors focus:outline-none',
  {
    variants: {
      variant: {
        default:
          'text-slate-700 hover:bg-slate-50 hover:text-slate-900 data-[active]:bg-slate-50 data-[active]:text-slate-900',
        destructive:
          'text-slate-700 hover:bg-red-50 hover:text-customRed data-[active]:bg-red-50 data-[active]:text-customRed',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const iconStyles = cva(
  'flex h-4 w-4 shrink-0 items-center justify-center transition-colors',
  {
    variants: {
      variant: {
        default: 'text-slate-500 group-hover:text-slate-900',
        destructive: 'text-slate-500 group-hover:text-customRed',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

type CommonProps = VariantProps<typeof menuItemStyles> & {
  icon?: ReactNode;
  meta?: ReactNode;
  active?: boolean;
};

type MenuItemAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: undefined;
  };

type MenuItemAsLink = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps | 'href'> & {
    href: string;
  };

export type MenuItemProps = MenuItemAsButton | MenuItemAsLink;

export const MenuItem = forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  MenuItemProps
>(({ icon, meta, variant, active, className, children, ...rest }, ref) => {
  const composed = cn('group', menuItemStyles({ variant }), className);

  const inner = (
    <>
      {icon ? (
        <span aria-hidden className={iconStyles({ variant })}>
          {icon}
        </span>
      ) : null}
      <span className='truncate'>{children}</span>
      {meta ? (
        <span className='ml-auto flex items-center text-slate-300'>{meta}</span>
      ) : null}
    </>
  );

  if ('href' in rest && rest.href) {
    const { href, ...anchorRest } =
      rest as AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={composed}
        data-active={active ? 'true' : undefined}
        {...anchorRest}
      >
        {inner}
      </a>
    );
  }

  const { type, ...buttonRest } = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type ?? 'button'}
      className={composed}
      data-active={active ? 'true' : undefined}
      {...buttonRest}
    >
      {inner}
    </button>
  );
});
MenuItem.displayName = 'MenuItem';
