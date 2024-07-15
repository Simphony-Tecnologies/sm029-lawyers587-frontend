import React from 'react';

const Input = ({ defaultValue, name }: { defaultValue: any; name: string }) => {
  return (
    <div>
      <label className="capitalize" htmlFor={name}>
        {name}
      </label>
      <input
        defaultValue={defaultValue}
        name={name}
        className="border border-gray-300 rounded-md w-full p-1 text-sm text-gray-500"
      />
    </div>
  );
};

export default Input;
