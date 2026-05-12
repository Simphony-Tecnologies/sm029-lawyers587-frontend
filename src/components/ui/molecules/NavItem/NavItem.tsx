'use client';
import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { MdChevronRight } from 'react-icons/md';
import { cn } from '@/lib/cn';
import { NavIcon } from '@/components/ui/atoms/NavIcon';

type CommonProps = {
  icon: ReactNode;
  label: string;
  badge?: ReactNode;
  active?: boolean;
  expandable?: boolean;
  expanded?: boolean;
};

type NavItemAsLink = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps | 'href'> & {
    href: string;
  };

type NavItemAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: undefined;
  };

export type NavItemProps = NavItemAsLink | NavItemAsButton;

const baseStyles =
  'group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium tracking-[-0.005em] text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900';

const activeStyles =
  'bg-slate-100 font-bold text-slate-900 before:absolute before:left-0 before:bottom-2 before:top-2 before:w-[3px] before:rounded-r-[2px] before:bg-customRed before:content-[""]';

export const NavItem = forwardRef<
  HTMLAnchorElement | HTMLButtonElement,
  NavItemProps
>(
  (
    {
      icon,
      label,
      badge,
      active = false,
      expandable = false,
      expanded = false,
      className,
      ...rest
    },
    ref
  ) => {
    const inner = (
      <>
        <NavIcon active={active}>{icon}</NavIcon>
        <span className='truncate'>{label}</span>
        {badge ? <span className='ml-auto'>{badge}</span> : null}
        {expandable ? (
          <MdChevronRight
            className={cn(
              'ml-auto text-slate-400 transition-transform duration-150',
              expanded && 'rotate-90'
            )}
            size={14}
          />
        ) : null}
      </>
    );

    const composed = cn(baseStyles, active && activeStyles, className);

    if ('href' in rest && rest.href) {
      const { href, ...anchorRest } =
        rest as AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={composed}
          {...anchorRest}
        >
          {inner}
        </Link>
      );
    }

    const { type, ...buttonRest } =
      rest as ButtonHTMLAttributes<HTMLButtonElement>;
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={type ?? 'button'}
        className={cn(composed, 'text-left')}
        {...buttonRest}
      >
        {inner}
      </button>
    );
  }
);
NavItem.displayName = 'NavItem';
