import type { SignupFieldErrors, SignupFormValues } from '@/types/signup.types';
import { apiText } from '@/lib/apiText';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_FILE_MB = 10;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const FILE_REQUIRED_TEXT = 'Upload your license document';
const FILE_TYPE_TEXT = 'File must be an image (PNG, JPG, WEBP) or a PDF';
const FILE_SIZE_TEXT = `File must be ${MAX_FILE_MB} MB or smaller`;
export const ACCEPTED_MIME = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/pdf',
];
export const ACCEPT_ATTR = '.png,.jpg,.jpeg,.webp,.pdf';

// Campos por paso — orden usado para saltar al primer paso con error.
export const STEP_FIELDS: Array<Array<keyof SignupFormValues>> = [
  ['email', 'password'],
  ['firstName', 'lastName', 'phone', 'license_number', 'law_firm'],
  ['file'],
];

const required = (value: string, label: string): string | undefined =>
  value.trim().length === 0 ? `${label} is required` : undefined;

export const validateAccount = (
  values: SignupFormValues
): SignupFieldErrors => {
  const errors: SignupFieldErrors = {};
  if (values.email.trim().length === 0) {
    errors.email = 'Email is required';
  } else if (!EMAIL_RE.test(values.email.trim())) {
    errors.email = 'Enter a valid email address';
  }
  if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return errors;
};

export const validateProfessional = (
  values: SignupFormValues
): SignupFieldErrors => {
  const errors: SignupFieldErrors = {};
  const firstName = required(values.firstName, 'First name');
  if (firstName) errors.firstName = firstName;
  const lastName = required(values.lastName, 'Last name');
  if (lastName) errors.lastName = lastName;
  const phone = required(values.phone, 'Phone');
  if (phone) errors.phone = phone;
  const license = required(values.license_number, 'License number');
  if (license) errors.license_number = license;
  const firm = required(values.law_firm, 'Law firm');
  if (firm) errors.law_firm = firm;
  return errors;
};

export const validateLicense = (
  values: SignupFormValues
): SignupFieldErrors => {
  const errors: SignupFieldErrors = {};
  if (!values.file) {
    errors.file = FILE_REQUIRED_TEXT;
  } else if (!ACCEPTED_MIME.includes(values.file.type)) {
    errors.file = FILE_TYPE_TEXT;
  } else if (values.file.size > MAX_FILE_BYTES) {
    errors.file = FILE_SIZE_TEXT;
  }
  return errors;
};

// Un 400 de texto (o un 413) en el signup es un problema con el archivo. Los
// mensajes de ParseFilePipe son técnicos ("Validation failed (expected type
// is …)"): se traducen a los mismos textos de la validación del navegador.
export const mapBackendFileError = (
  code: number,
  messages: string | string[]
): string => {
  const raw = Array.isArray(messages) ? messages.join(' ') : messages;
  if (code === 413 || /size|too large/i.test(raw)) return FILE_SIZE_TEXT;
  if (/type/i.test(raw)) return FILE_TYPE_TEXT;
  return apiText(raw, FILE_REQUIRED_TEXT);
};

const STEP_VALIDATORS: Array<(v: SignupFormValues) => SignupFieldErrors> = [
  validateAccount,
  validateProfessional,
  validateLicense,
];

export const validateStep = (
  step: number,
  values: SignupFormValues
): SignupFieldErrors => STEP_VALIDATORS[step]?.(values) ?? {};

// Índice del primer paso (0-based) que contiene alguno de los campos con error.
export const firstStepWithError = (errors: SignupFieldErrors): number => {
  const index = STEP_FIELDS.findIndex((fields) =>
    fields.some((field) => Boolean(errors[field]))
  );
  return index === -1 ? 0 : index;
};

// Mapea el array de mensajes de class-validator (400) a errores por campo.
// Cada mensaje comienza con el nombre de la propiedad, ej. "email must be an email".
export const mapBackendMessages = (
  messages: string[]
): SignupFieldErrors => {
  const errors: SignupFieldErrors = {};
  const fields = STEP_FIELDS.flat();
  for (const message of messages) {
    const first = message.split(' ')[0];
    const field = fields.find((f) => f === first);
    if (field && !errors[field]) {
      errors[field] = message.charAt(0).toUpperCase() + message.slice(1);
    }
  }
  return errors;
};
