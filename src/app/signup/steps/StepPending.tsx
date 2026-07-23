'use client';

import { MdHourglassTop } from 'react-icons/md';

interface StepPendingProps {
  onGoToLogin: () => void;
}

export const StepPending = ({ onGoToLogin }: StepPendingProps) => (
  <div className='flex flex-col items-center gap-5 text-center'>
    <span className='flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600'>
      <MdHourglassTop className='text-3xl' />
    </span>

    <div className='flex flex-col gap-2'>
      <div className='flex items-center justify-center gap-2'>
        <h2 className='text-lg font-extrabold text-slate-900'>
          Pending verification
        </h2>
        <span className='inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700'>
          Pending
        </span>
      </div>
      <p className='max-w-sm text-sm text-slate-500'>
        An administrator will review your license document and approve your
        account. You&apos;ll receive an email once it&apos;s verified — then you
        can sign in.
      </p>
    </div>

    <button
      type='button'
      onClick={onGoToLogin}
      className='w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
    >
      Go to login
    </button>
  </div>
);
