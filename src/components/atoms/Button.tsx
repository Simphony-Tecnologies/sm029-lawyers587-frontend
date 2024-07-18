import React from 'react';
type button = {
  name: string;
  type: 'submit' | 'reset' | 'button' | undefined;
  onClick?: () => void;
};
const Button = ({ name, type, onClick }: button) => {
  return (
    <div>
      <button type={type} className='' onClick={onClick}>
        <p className='rounded-md bg-primary bg-opacity-90 hover:bg-opacity-100 text-white inline-block px-4 '>
          {name}
        </p>
      </button>
    </div>
  );
};

export default Button;
