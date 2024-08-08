import React from 'react';

const SkeletonText = ({ lines = 1 }) => {
  const skeletonLines = [];

  for (let i = 0; i < lines; i++) {
    skeletonLines.push(
      <div
        key={i}
        className='h-4 bg-gray-300 rounded animate-pulse mb-2 last:mb-0 '
        style={{ width: `${100 - i * 10}%` }}
      ></div>
    );
  }

  return <div className='space-y-2 '>{skeletonLines}</div>;
};

export default SkeletonText;
