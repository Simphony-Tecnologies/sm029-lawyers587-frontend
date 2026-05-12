'use client';
import { Fragment, useEffect, useState } from 'react';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { MdClose } from 'react-icons/md';
import { cn } from '@/lib/cn';

export interface LawyerPasswordPayload {
  password: string;
}

export interface LawyerPasswordModalProps {
  open: boolean;
  onClose: () => void;
  lawyerCode?: string;
  onSubmit: (payload: LawyerPasswordPayload) => Promise<void> | void;
  loading?: boolean;
}

export const LawyerPasswordModal = ({
  open,
  onClose,
  lawyerCode,
  onSubmit,
  loading = false,
}: LawyerPasswordModalProps) => {
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNext('');
    setConfirm('');
    setError(null);
  }, [open]);

  const handleSubmit = async () => {
    if (loading) return;
    if (!next || !confirm) {
      setError('Both fields are required');
      return;
    }
    if (next !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (next.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError(null);
    await onSubmit({ password: next });
  };

  return (
    <Transition show={open} as={Fragment}>
      <Dialog
        as='div'
        className='relative z-[55]'
        onClose={loading ? () => {} : onClose}
      >
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
            <DialogPanel className='relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_64px_rgba(11,15,25,0.22)]'>
              <span
                aria-hidden
                className='absolute inset-x-0 top-0 z-[2] h-[3px] bg-slate-900'
              />
              <div className='flex items-center justify-between gap-3 border-b border-slate-100 px-6 pb-4 pt-5'>
                <div className='flex min-w-0 flex-col gap-0.5'>
                  <span className='flex items-center text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500'>
                    Lawyer Management
                    {lawyerCode ? (
                      <>
                        <span aria-hidden className='mx-1 text-slate-300'>
                          ·
                        </span>
                        <strong className='font-bold text-customRed'>
                          #{lawyerCode}
                        </strong>
                      </>
                    ) : null}
                  </span>
                  <DialogTitle className='text-[18px] font-extrabold leading-[1.2] tracking-[-0.02em] text-slate-900'>
                    Update password
                  </DialogTitle>
                </div>
                <button
                  type='button'
                  onClick={onClose}
                  disabled={loading}
                  className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:opacity-50'
                  aria-label='Close'
                >
                  <MdClose size={14} />
                </button>
              </div>

              <div className='flex flex-col gap-4 px-6 py-5'>
                <PasswordField
                  id='lawyer-password-new'
                  label='New Password'
                  value={next}
                  onChange={setNext}
                  placeholder='Enter new password'
                  disabled={loading}
                />
                <PasswordField
                  id='lawyer-password-confirm'
                  label='Confirm Password'
                  value={confirm}
                  onChange={setConfirm}
                  placeholder='Re-enter new password'
                  disabled={loading}
                />
                {error ? (
                  <span className='text-[11px] font-semibold text-customRed'>
                    {error}
                  </span>
                ) : null}
              </div>

              <div className='flex items-center justify-end gap-2 border-t border-slate-100 px-6 pb-5 pt-4'>
                <button
                  type='button'
                  onClick={onClose}
                  disabled={loading}
                  className='inline-flex h-[38px] items-center rounded-[9px] border border-slate-200 bg-white px-4 text-xs font-bold tracking-[-0.005em] text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50'
                >
                  Cancel
                </button>
                <button
                  type='button'
                  onClick={handleSubmit}
                  disabled={loading}
                  className='inline-flex h-[38px] items-center rounded-[9px] border border-slate-900 bg-slate-900 px-4 text-xs font-bold tracking-[-0.005em] text-white transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-700/40 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  {loading ? 'Saving…' : 'Save'}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
};
LawyerPasswordModal.displayName = 'LawyerPasswordModal';

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const PasswordField = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: PasswordFieldProps) => (
  <div className='flex flex-col gap-1.5'>
    <label
      htmlFor={id}
      className='text-[11px] font-bold uppercase tracking-[0.04em] text-slate-700'
    >
      {label}
    </label>
    <input
      id={id}
      type='password'
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        'h-10 w-full rounded-[9px] border-[1.5px] border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-900 outline-none transition-colors',
        'placeholder:font-normal placeholder:text-slate-400',
        'focus:border-slate-900 focus:shadow-[0_0_0_3px_rgba(11,15,25,0.06)]',
        'disabled:cursor-not-allowed disabled:opacity-60'
      )}
    />
  </div>
);
