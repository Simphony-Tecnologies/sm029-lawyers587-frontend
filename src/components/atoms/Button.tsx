import React from 'react';
type button = {
  name: string;
  type: 'submit' | 'reset' | 'button' | undefined;
  onClick?: () => void;
  color?: string;
};
const Button = ({ name, type, onClick, color = 'bg-primary' }: button) => {
  return (
    <div
      className={` rounded-md  bg-opacity-90 hover:bg-opacity-100 text-white inline-block px-4 py-1  ${color}`}
    >
      <button type={type} onClick={onClick}>
        <p>{name}</p>
      </button>
    </div>
  );
};

export default Button;
