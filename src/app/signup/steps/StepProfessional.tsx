'use client';

import { FormField, fieldInputClass } from '@/components/ui/molecules';
import type { SignupFieldErrors, SignupFormValues } from '@/types/signup.types';

interface StepProfessionalProps {
  values: SignupFormValues;
  errors: SignupFieldErrors;
  onChange: (field: keyof SignupFormValues, value: string) => void;
  disabled?: boolean;
}

export const StepProfessional = ({
  values,
  errors,
  onChange,
  disabled,
}: StepProfessionalProps) => (
  <div className='flex flex-col gap-4'>
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
      <FormField
        label='First name'
        htmlFor='signup-firstName'
        error={errors.firstName}
        required
      >
        <input
          id='signup-firstName'
          type='text'
          autoComplete='given-name'
          value={values.firstName}
          disabled={disabled}
          onChange={(e) => onChange('firstName', e.target.value)}
          className={fieldInputClass(Boolean(errors.firstName))}
        />
      </FormField>

      <FormField
        label='Last name'
        htmlFor='signup-lastName'
        error={errors.lastName}
        required
      >
        <input
          id='signup-lastName'
          type='text'
          autoComplete='family-name'
          value={values.lastName}
          disabled={disabled}
          onChange={(e) => onChange('lastName', e.target.value)}
          className={fieldInputClass(Boolean(errors.lastName))}
        />
      </FormField>
    </div>

    <FormField
      label='Phone'
      htmlFor='signup-phone'
      error={errors.phone}
      required
    >
      <input
        id='signup-phone'
        type='tel'
        autoComplete='tel'
        placeholder='+1 555 000 0000'
        value={values.phone}
        disabled={disabled}
        onChange={(e) => onChange('phone', e.target.value)}
        className={fieldInputClass(Boolean(errors.phone))}
      />
    </FormField>

    <FormField
      label='License number'
      htmlFor='signup-license'
      error={errors.license_number}
      required
    >
      <input
        id='signup-license'
        type='text'
        value={values.license_number}
        disabled={disabled}
        onChange={(e) => onChange('license_number', e.target.value)}
        className={fieldInputClass(Boolean(errors.license_number))}
      />
    </FormField>

    <FormField
      label='Law firm'
      htmlFor='signup-firm'
      error={errors.law_firm}
      hint='If it matches a registered firm, the name may be normalized'
      required
    >
      <input
        id='signup-firm'
        type='text'
        autoComplete='organization'
        value={values.law_firm}
        disabled={disabled}
        onChange={(e) => onChange('law_firm', e.target.value)}
        className={fieldInputClass(Boolean(errors.law_firm))}
      />
    </FormField>
  </div>
);
