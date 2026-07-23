'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { MdArrowBack } from 'react-icons/md';
import Logo from '@/assets/587LAWYERS.COM.png';
import { Stepper } from '@/components/ui/molecules';
import { database } from '@/services/database';
import {
  firstStepWithError,
  mapBackendMessages,
  validateLicense,
  validateStep,
} from '@/lib/signupValidation';
import {
  EMPTY_SIGNUP_VALUES,
  type SignupFieldErrors,
  type SignupFormValues,
} from '@/types/signup.types';
import type { SignupRequest, SignupResponseLawyer } from '@/types/api.types';
import { StepAccount } from './steps/StepAccount';
import { StepProfessional } from './steps/StepProfessional';
import { StepLicense } from './steps/StepLicense';
import { StepCode } from './steps/StepCode';
import { StepPending } from './steps/StepPending';

const STEP_LABELS = ['Account', 'Professional', 'License', 'Your ID', 'Review'];
const LAST_INPUT_STEP = 2;

const Signup = () => {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<SignupFormValues>(EMPTY_SIGNUP_VALUES);
  const [errors, setErrors] = useState<SignupFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SignupResponseLawyer | null>(null);

  const clearError = (field: keyof SignupFormValues) =>
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  const handleChange = (field: keyof SignupFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    clearError(field);
  };

  const handleFileChange = (file: File | null) => {
    setValues((prev) => ({ ...prev, file }));
    clearError('file');
  };

  const handleNext = () => {
    const stepErrors = validateStep(step, values);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setErrors({});
    setStep((s) => Math.max(0, s - 1));
  };

  const routeSubmitError = (
    code: number,
    messages: string | string[]
  ) => {
    if (code === 409) {
      setErrors({
        email: typeof messages === 'string' ? messages : 'Email already registered',
      });
      setStep(0);
      return;
    }
    if (code === 400 && Array.isArray(messages)) {
      const mapped = mapBackendMessages(messages);
      if (Object.keys(mapped).length > 0) {
        setErrors(mapped);
        setStep(firstStepWithError(mapped));
        return;
      }
      toast.error(messages.join(', '));
      return;
    }
    if (code === 400 && typeof messages === 'string') {
      setErrors({ file: messages });
      setStep(LAST_INPUT_STEP);
      return;
    }
    const text = Array.isArray(messages) ? messages.join(', ') : messages;
    toast.error(text || 'Something went wrong. Please try again.');
  };

  const handleSubmit = async () => {
    const licenseErrors = validateLicense(values);
    if (Object.keys(licenseErrors).length > 0 || !values.file) {
      setErrors(licenseErrors);
      return;
    }

    setSubmitting(true);
    const payload: SignupRequest = {
      email: values.email.trim(),
      password: values.password,
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      phone: values.phone.trim(),
      license_number: values.license_number.trim(),
      law_firm: values.law_firm.trim(),
      file: values.file,
    };

    const res = await database.signup(payload);
    setSubmitting(false);

    if (res.success && res.data) {
      setErrors({});
      setResult(res.data.lawyer);
      setStep(3);
      return;
    }
    routeSubmitError(res.code, res.messages);
  };

  return (
    <div className='flex min-h-screen w-full flex-col items-center justify-center bg-slate-50 px-4 py-10'>
      <Toaster />
      <div className='w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'>
        <div className='mb-6 flex flex-col items-center gap-4'>
          <Image src={Logo} alt='587 Lawyers' className='h-auto w-28' />
          <Stepper steps={STEP_LABELS} current={step} className='w-full' />
        </div>

        {step < 3 && (
          <div className='mb-5 text-center'>
            <h1 className='text-xl font-extrabold text-slate-900'>
              Create your account
            </h1>
            <p className='mt-1 text-sm text-slate-500'>
              {step === 0 && 'Start with your login credentials.'}
              {step === 1 && 'Tell us about your professional profile.'}
              {step === 2 && 'Upload your license for verification.'}
            </p>
          </div>
        )}

        {step === 0 && (
          <StepAccount
            values={values}
            errors={errors}
            onChange={handleChange}
            disabled={submitting}
          />
        )}
        {step === 1 && (
          <StepProfessional
            values={values}
            errors={errors}
            onChange={handleChange}
            disabled={submitting}
          />
        )}
        {step === 2 && (
          <StepLicense
            values={values}
            errors={errors}
            onChange={handleFileChange}
            disabled={submitting}
          />
        )}
        {step === 3 && result && (
          <StepCode lawyer={result} onContinue={() => setStep(4)} />
        )}
        {step === 4 && (
          <StepPending onGoToLogin={() => router.push('/')} />
        )}

        {step <= LAST_INPUT_STEP && (
          <>
            <div className='mt-6 flex items-center justify-between gap-3'>
              {step > 0 ? (
                <button
                  type='button'
                  onClick={handleBack}
                  disabled={submitting}
                  className='inline-flex items-center gap-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50'
                >
                  <MdArrowBack className='text-base' /> Back
                </button>
              ) : (
                <span />
              )}

              {step < LAST_INPUT_STEP ? (
                <button
                  type='button'
                  onClick={handleNext}
                  className='rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-opacity-90'
                >
                  Next
                </button>
              ) : (
                <button
                  type='button'
                  onClick={handleSubmit}
                  disabled={submitting}
                  className='inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-70'
                >
                  {submitting && (
                    <span className='h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white' />
                  )}
                  {submitting ? 'Creating…' : 'Create account'}
                </button>
              )}
            </div>

            <p className='mt-5 text-center text-sm text-slate-500'>
              Already have an account?{' '}
              <Link
                href='/'
                className='font-semibold text-primary hover:underline'
              >
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Signup;
