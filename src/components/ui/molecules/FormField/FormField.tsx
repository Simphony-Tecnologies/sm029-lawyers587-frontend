import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

// Clase compartida para inputs de texto del wizard (borde rojo si hay error).
export const fieldInputClass = (hasError?: boolean): string =>
  cn(
    'w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400',
    'focus:border-primary focus:ring-2 focus:ring-primary/25',
    hasError ? 'border-rose-400' : 'border-slate-300'
  );

export const FormField = ({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: FormFieldProps) => (
  <div className={cn('flex flex-col gap-1.5', className)}>
    <label
      htmlFor={htmlFor}
      className='text-xs font-semibold text-slate-700'
    >
      {label}
      {required && <span className='text-rose-500'> *</span>}
    </label>
    {children}
    {error ? (
      <p className='text-xs font-medium text-rose-600'>{error}</p>
    ) : hint ? (
      <p className='text-xs text-slate-400'>{hint}</p>
    ) : null}
  </div>
);

FormField.displayName = 'FormField';
