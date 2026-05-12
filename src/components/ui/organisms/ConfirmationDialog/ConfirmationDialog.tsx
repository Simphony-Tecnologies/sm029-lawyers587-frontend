'use client';
import { Fragment, type ReactNode } from 'react';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { cn } from '@/lib/cn';

export type ConfirmationVariant = 'default' | 'danger';

export interface ConfirmationField {
  label: string;
  value: ReactNode;
  highlight?: boolean;
}

export interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  variant?: ConfirmationVariant;
  title: string;
  subtitle?: string;
  fields?: ConfirmationField[];
  children?: ReactNode;
  notice?: ReactNode;
  cancelLabel?: string;
  confirmLabel: string;
  onConfirm: () => void;
  loading?: boolean;
  confirmDisabled?: boolean;
}

export const ConfirmationDialog = ({
  open,
  onClose,
  variant = 'default',
  title,
  subtitle,
  fields,
  children,
  notice,
  cancelLabel = 'Cancel',
  confirmLabel,
  onConfirm,
  loading = false,
  confirmDisabled = false,
}: ConfirmationDialogProps) => {
  const isDanger = variant === 'danger';

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as='div' className='relative z-50' onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter='ease-out duration-150'
          enterFrom='opacity-0'
          enterTo='opacity-100'
          leave='ease-in duration-100'
          leaveFrom='opacity-100'
          leaveTo='opacity-0'
        >
          <div
            aria-hidden
            className='fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]'
          />
        </TransitionChild>

        <div className='fixed inset-0 flex items-center justify-center p-4'>
          <TransitionChild
            as={Fragment}
            enter='ease-out duration-150'
            enterFrom='opacity-0 scale-95'
            enterTo='opacity-100 scale-100'
            leave='ease-in duration-100'
            leaveFrom='opacity-100 scale-100'
            leaveTo='opacity-0 scale-95'
          >
            <DialogPanel className='w-full max-w-[480px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_64px_rgba(11,15,25,0.20)]'>
              <div
                className={cn(
                  'border-b px-7 pb-5 pt-6',
                  isDanger ? 'border-rose-100/80' : 'border-slate-100'
                )}
              >
                <DialogTitle
                  className={cn(
                    'mb-1.5 text-[18px] font-extrabold tracking-[-0.02em]',
                    isDanger ? 'text-customRed' : 'text-slate-900'
                  )}
                >
                  {title}
                </DialogTitle>
                {subtitle ? (
                  <p className='text-[13px] font-medium leading-[1.5] text-slate-500'>
                    {subtitle}
                  </p>
                ) : null}
              </div>

              <div className='px-7 pb-6 pt-5'>
                {fields && fields.length > 0 ? (
                  <div className='mb-4 rounded-[11px] border border-slate-200 bg-slate-50 px-4.5 py-1 [padding-left:18px] [padding-right:18px]'>
                    {fields.map((field, idx) => (
                      <div
                        key={`${field.label}-${idx}`}
                        className={cn(
                          'flex items-center justify-between gap-4 py-2 text-xs',
                          idx < fields.length - 1 &&
                            'border-b border-slate-100'
                        )}
                      >
                        <span className='text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500'>
                          {field.label}
                        </span>
                        <span
                          className={cn(
                            'truncate text-right text-xs font-bold',
                            field.highlight ? 'text-sky-500' : 'text-slate-900'
                          )}
                        >
                          {field.value}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}

                {children}

                {notice ? (
                  <div
                    className={cn(
                      'mt-4 flex items-start gap-2.5 rounded-[9px] border px-3.5 py-3 text-xs font-medium leading-[1.5] text-slate-700',
                      isDanger
                        ? 'border-rose-200/80 bg-red-50'
                        : 'border-amber-200/80 bg-amber-50'
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold text-white',
                        isDanger ? 'bg-customRed' : 'bg-amber-500'
                      )}
                    >
                      !
                    </span>
                    <span>{notice}</span>
                  </div>
                ) : null}
              </div>

              <div className='flex items-center justify-end gap-2 border-t border-slate-100 px-7 pb-5 pt-4'>
                <button
                  type='button'
                  onClick={onClose}
                  disabled={loading}
                  className='inline-flex h-[38px] items-center gap-1.5 rounded-[9px] border border-slate-200 bg-white px-4 text-[13px] font-bold tracking-[-0.005em] text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50'
                >
                  {cancelLabel}
                </button>
                <button
                  type='button'
                  onClick={onConfirm}
                  disabled={loading || confirmDisabled}
                  className={cn(
                    'inline-flex h-[38px] items-center gap-1.5 rounded-[9px] border px-4 text-[13px] font-bold tracking-[-0.005em] text-white transition-colors focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60',
                    isDanger
                      ? 'border-customRed bg-customRed hover:bg-red-600 focus-visible:ring-customRed/40'
                      : 'border-slate-900 bg-slate-900 hover:bg-slate-800 focus-visible:ring-slate-700/40'
                  )}
                >
                  {loading ? 'Working…' : confirmLabel}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
};
ConfirmationDialog.displayName = 'ConfirmationDialog';
