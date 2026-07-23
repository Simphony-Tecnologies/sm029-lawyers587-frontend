// Estado del formulario del wizard de signup (cliente). El File es null hasta
// que el usuario sube el documento; el contrato de red vive en api.types.ts.
export interface SignupFormValues {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  license_number: string;
  law_firm: string;
  file: File | null;
}

export type SignupFieldErrors = Partial<Record<keyof SignupFormValues, string>>;

export const EMPTY_SIGNUP_VALUES: SignupFormValues = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  phone: '',
  license_number: '',
  law_firm: '',
  file: null,
};
