'use client';

import { FileDropzone, FormField } from '@/components/ui/molecules';
import { ACCEPT_ATTR, MAX_FILE_MB } from '@/lib/signupValidation';
import type { SignupFieldErrors, SignupFormValues } from '@/types/signup.types';

interface StepLicenseProps {
  values: SignupFormValues;
  errors: SignupFieldErrors;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

export const StepLicense = ({
  values,
  errors,
  onChange,
  disabled,
}: StepLicenseProps) => (
  <FormField
    label='License document'
    htmlFor='signup-file'
    error={errors.file}
    required
  >
    <FileDropzone
      id='signup-file'
      value={values.file}
      onChange={onChange}
      accept={ACCEPT_ATTR}
      error={errors.file}
      disabled={disabled}
      hint={`Image (PNG, JPG, WEBP) or PDF · max ${MAX_FILE_MB} MB`}
    />
  </FormField>
);
