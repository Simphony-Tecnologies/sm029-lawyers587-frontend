import React from 'react';

const Input = ({
  defaultValue,
  name,
  label,
  required,
  type,
  values,
}: {
  defaultValue?: any;
  name: string;
  label?: string;
  required?: boolean;
  type?: 'text' | 'number' | 'select';
  values?: any;
}) => {
  return (
    <div>
      <label className='capitalize font-bold' htmlFor={name}>
        {label}
      </label>
      {type === 'select' ? (
        <select
          className='flex flex-row w-full max-w-lg border border-gray-300 p-1 rounded-lg placeholder:font-light text-text '
          name={name}
          defaultValue={defaultValue}
        >
          <option value='' disabled>
            select
          </option>
          {values.map((value: any, index: number) => (
            <option value={value.value} key={index}>
              {value.name}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          defaultValue={defaultValue}
          name={name}
          required={required}
          className='border border-gray-300 rounded-md w-full p-1 text-sm text-gray-500'
        />
      )}
    </div>
  );
};

export default Input;
