// components/SkeletonTable.tsx
import React from 'react';

const SkeletonTable = () => {
  return (
    <div className='flex flex-col gap-10 animate-pulse'>
      <div className='relative overflow-x-auto shadow-sm sm:rounded-lg border'>
        <table className='min-w-full bg-white'>
          <thead className='bg-gray-50'>
            <tr>
              {Array.from({ length: 5 }).map((_, index) => (
                <th
                  key={index}
                  className='px-4 py-2 border-b-2 border-gray-200'
                >
                  <div className='h-8 bg-gray-300 rounded'></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: 5 }).map((_, colIndex) => (
                  <td
                    key={colIndex}
                    className='px-4 py-2 border-b border-gray-200'
                  >
                    <div className='h-6 bg-gray-300 rounded'></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SkeletonTable;
