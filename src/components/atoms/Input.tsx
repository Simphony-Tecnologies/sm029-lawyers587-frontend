import { useState } from 'react';
import Select from 'react-select';
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
}: {
  defaultValue?: any;
  name: string;
  label?: string;
  required?: boolean;
  type?: 'text' | 'number' | 'select' | 'multiselect';
  values?: any;
  onChange?: any;
  statusColors?: any;
  placeholder?: string;
}) => {
  const [selectedColor, setSelectedColor] = useState(
    statusColors ? statusColors[defaultValue] : null
  );
  const handleChangeColor = (event: any) => {
    const newValue = event.target.value;
    if (statusColors) {
      setSelectedColor(statusColors[newValue]);
    }
  };
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
          //value={selectedValue}
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
      ) : type === 'multiselect' ? (
        <div className=''>
          <Select
            defaultValue={defaultValue}
            isMulti
            name={name}
            options={values}
            className='basic-multi-select  '
            classNamePrefix='select'
            onChange={onChange}
          />
        </div>
      ) : (
        <input
          type={type}
          defaultValue={defaultValue}
          name={name}
          required={required}
          placeholder={placeholder}
          className='border border-gray-300 rounded-md w-full p-1 text-sm text-gray-500'
        />
      )}
    </div>
  );
};

export default Input;
