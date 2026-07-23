'use client';

import { useState } from 'react';
import { MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { FormField, fieldInputClass } from '@/components/ui/molecules';
import { cn } from '@/lib/cn';
import type { SignupFieldErrors, SignupFormValues } from '@/types/signup.types';

interface StepAccountProps {
  values: SignupFormValues;
  errors: SignupFieldErrors;
  onChange: (field: keyof SignupFormValues, value: string) => void;
  disabled?: boolean;
}

export const StepAccount = ({
  values,
  errors,
  onChange,
  disabled,
}: StepAccountProps) => {
  const [show, setShow] = useState(false);

  return (
    <div className='flex flex-col gap-4'>
      <FormField
        label='Email address'
        htmlFor='signup-email'
        error={errors.email}
        required
      >
        <input
          id='signup-email'
          type='email'
          autoComplete='email'
          placeholder='you@lawfirm.com'
          value={values.email}
          disabled={disabled}
          onChange={(e) => onChange('email', e.target.value)}
          className={fieldInputClass(Boolean(errors.email))}
        />
      </FormField>

      <FormField
        label='Password'
        htmlFor='signup-password'
        error={errors.password}
        hint='At least 8 characters'
        required
      >
        <div className='relative'>
          <input
            id='signup-password'
            type={show ? 'text' : 'password'}
            autoComplete='new-password'
            placeholder='••••••••'
            value={values.password}
            disabled={disabled}
            onChange={(e) => onChange('password', e.target.value)}
            className={cn(fieldInputClass(Boolean(errors.password)), 'pr-11')}
          />
          <button
            type='button'
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
            className='absolute right-3 top-1/2 -translate-y-1/2 text-lg text-slate-400 hover:text-slate-600'
          >
            {show ? <MdVisibilityOff /> : <MdVisibility />}
          </button>
        </div>
      </FormField>
    </div>
  );
};
