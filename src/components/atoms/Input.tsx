import { useState } from 'react';
import Select from 'react-select';
import { MdVisibility, MdVisibilityOff } from 'react-icons/md';

const Input = ({
  defaultValue,
  name,
  label,
  required,
  type,
  values,
  onChange,
  statusColors,
  placeholder,
  handleChangeService,
}: {
  defaultValue?: any;
  name: string;
  label?: string;
  required?: boolean;
  type?:
    | 'text'
    | 'number'
    | 'select'
    | 'multiselect'
    | 'email'
    | 'tel'
    | 'password';
  values?: any;
  onChange?: any;
  statusColors?: any;
  placeholder?: string;
  handleChangeService?: any;
}) => {
  const [selectedColor, setSelectedColor] = useState(
    statusColors ? statusColors[defaultValue] : null
  );

  const [showPassword, setShowPassword] = useState(false);

  const handleChangeColor = (event: any) => {
    const newValue = event.target.value;
    if (statusColors) {
      setSelectedColor(statusColors[newValue]);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className='relative'>
      <label className='capitalize font-bold' htmlFor={name}>
        {label}
      </label>
      {type === 'select' ? (
        <select
          className='flex flex-row w-full max-w-lg border border-gray-300 p-1 rounded-lg placeholder:font-light text-text'
          name={name}
          defaultValue={defaultValue}
          onChange={handleChangeColor}
          style={{
            color: selectedColor,
            borderColor: selectedColor,
            outline: 'none',
          }}
        >
          <option value='' disabled>
            select
          </option>
          {values.map((value: any, index: number) => (
            <option
              value={value.value}
              key={index}
              style={
                statusColors && {
                  color: statusColors[value.value],
                  backgroundColor: statusColors[value.value] + 20,
                }
              }
            >
              {value.name}
            </option>
          ))}
        </select>
      ) : type === 'tel' ? (
        <input
          type={type}
          maxLength={10}
          minLength={10}
          pattern='\d{10}'
          defaultValue={defaultValue}
          id={name}
          name={name}
          required={required}
          placeholder={placeholder}
          autoComplete='on'
          className='border border-gray-300 rounded-md w-full p-1 text-sm text-gray-500'
          onChange={onChange}
        />
      ) : type === 'password' ? (
        <div className='flex items-center border border-gray-300 rounded-md'>
          <input
            type={showPassword ? 'text' : 'password'}
            defaultValue={defaultValue}
            name={name}
            id={name}
            required={required}
            placeholder={placeholder}
            className='w-full p-1 text-sm text-gray-500'
            autoComplete='new-password'
            onChange={onChange}
          />
          <button
            type='button'
            onClick={togglePasswordVisibility}
            className='p-2 text-gray-500 hover:text-gray-700'
          >
            {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
          </button>
        </div>
      ) : type === 'multiselect' ? (
        <div className=''>
          <Select
            defaultValue={defaultValue}
            isMulti
            name={name}
            options={values}
            className='basic-multi-select'
            classNamePrefix='select'
            onChange={handleChangeService}
            required={required}
          />
        </div>
      ) : (
        <input
          type={type}
          defaultValue={defaultValue}
          name={name}
          id={name}
          required={required}
          placeholder={placeholder}
          className='border border-gray-300 rounded-md w-full p-1 text-sm text-gray-500'
          autoComplete='on'
          onChange={onChange}
        />
      )}
    </div>
  );
};

export default Input;
