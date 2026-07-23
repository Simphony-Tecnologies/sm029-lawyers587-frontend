'use client';

import { MdBadge, MdCheckCircle } from 'react-icons/md';
import type { SignupResponseLawyer } from '@/types/api.types';

interface StepCodeProps {
  lawyer: SignupResponseLawyer;
  onContinue: () => void;
}

export const StepCode = ({ lawyer, onContinue }: StepCodeProps) => (
  <div className='flex flex-col items-center gap-5 text-center'>
    <span className='flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600'>
      <MdCheckCircle className='text-3xl' />
    </span>

    <div className='flex flex-col gap-1'>
      <h2 className='text-lg font-extrabold text-slate-900'>
        Registration received
      </h2>
      <p className='text-sm text-slate-500'>
        Welcome, {lawyer.firstName} {lawyer.lastName}. Keep your reference code
        handy.
      </p>
    </div>

    <div className='flex w-full flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-5'>
      <span className='flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500'>
        <MdBadge className='text-sm' /> Your reference code
      </span>
      <span className='select-all text-2xl font-extrabold tracking-wide text-primary'>
        {lawyer.code}
      </span>
      <span className='text-xs text-slate-400'>{lawyer.law_firm}</span>
    </div>

    <button
      type='button'
      onClick={onContinue}
      className='w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-opacity-90'
    >
      Continue
    </button>
  </div>
);
