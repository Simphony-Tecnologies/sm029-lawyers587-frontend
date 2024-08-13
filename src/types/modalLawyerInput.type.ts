type select = {
  name?: string;
  value: string | boolean | number;
  label?: string | boolean | number;
};

type ModalLawyerInput = {
  label: string;
  name: string;
  defaultValue?: string | number | boolean | [];
  type:
    | 'text'
    | 'number'
    | 'select'
    | 'date'
    | 'email'
    | 'password'
    | 'file'
    | 'datetime-local'
    | 'multiselect';
  required: boolean;
  values?: select[];

  mode?: string;
};
