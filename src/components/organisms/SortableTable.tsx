'use client';
import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import {
  MdEdit,
  MdImportExport,
  MdOutlineArrowBackIos,
  MdOutlineArrowForwardIos,
  MdOutlineDelete,
} from 'react-icons/md';
import SkeletonTable from '../atoms/SkeletonTable';
import SkeletonText from '../atoms/SkeletonText';
import { useAuth } from '@/store/useAuth.store';

type SortDirection = 'ascending' | 'descending';

type SortConfig = {
  key: string;
  direction: SortDirection;
};

type SortableTableProps = {
  columns: string[];
  data: { [key: string]: string | number }[] | null;
  statusColors?: { [key: string]: string };
  onEdit?: (index: number) => void;
  onDelete?: (index: number) => void;
  onStatus?: (index: number) => void;
  onRoute?: (index: number) => void;
  onSelectRow?: (index: number) => void;
  selectedRows?: any;
  onContact?: (index: number) => void;
  isDeleteMultiple?: boolean;
  onDeleteMultiple?: (index: number) => void;
  onLastActive?: any;
  pullButton?: any;
};

const SortableTable = ({
  columns,
  data,
  statusColors,
  onEdit,
  onDelete,
  onStatus,
  onRoute,
  onSelectRow,
  selectedRows,
  onContact,
  isDeleteMultiple,
  onDeleteMultiple,
  onLastActive,
  pullButton,
}: SortableTableProps) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [indexedData, setIndexedData] = useState<any[]>([]);
  const { user } = useAuth();
  const rol = user?.role?.name;
  useEffect(() => {
    if (data) {
      const dataWithIndex = data.map((item, index) => ({
        ...item,
        originalIndex: index,
      }));
      setIndexedData(dataWithIndex);
    }
  }, [data]);

  const totalPages = Math.ceil((data ? data.length : 0) / itemsPerPage);
  dayjs.extend(utc);

  const onSort = (column: string) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig?.key === column && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key: column, direction });
  };

  const sortedData = React.useMemo(() => {
    if (!sortConfig) return indexedData;

    const sorted = [...indexedData].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }, [indexedData, sortConfig]);

  const paginatedData = sortedData?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleItemsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const goToPreviousPage = () => {
    setCurrentPage((prevPage) => prevPage - 1);
  };

  const goToNextPage = () => {
    setCurrentPage((prevPage) => prevPage + 1);
  };

  const calculateGlobalIndex = (localIndex: number) => {
    return (currentPage - 1) * itemsPerPage + localIndex;
  };

  if (!data) {
    return <SkeletonTable />;
  }

  if (data.length <= 0) {
    return <div>No data found</div>;
  }

  return (
    <div className='flex flex-col gap-10'>
      <div className='overflow-x-auto shadow-sm sm:rounded-lg border'>
        <table className='min-w-full bg-white'>
          <thead className='bg-gray-50'>
            <tr>
              {onSelectRow && (
                <th className='px-4 py-2 border-b-2 border-gray-200'>
                  {pullButton}
                  {/* <input type='checkbox' disabled /> */}
                </th>
              )}
              {columns
                ?.filter((column: string) => column !== 'date_updated')
                .map((column) => (
                  <th
                    key={column}
                    onClick={() => onSort(column)}
                    className='px-4 py-2 border-b-2 border-gray-200 cursor-pointer'
                  >
                    <div className='uppercase flex items-center text-start'>
                      {column}
                      {sortConfig?.key === column && (
                        <span>
                          {sortConfig.direction === 'ascending' ? (
                            <MdImportExport className='text-gray-500' />
                          ) : (
                            <MdImportExport />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              {(onEdit || onDelete) && (
                <th className='px-4 py-2 border-b-2 border-gray-200 uppercase text-start'>
                  Actions
                </th>
              )}
              {isDeleteMultiple && (
                <th className='px-4 py-2 border-b-2 border-gray-200 uppercase text-start'>
                  Delete
                </th>
              )}
              {onContact && (
                <th className='px-4 py-2 border-b-2 border-gray-200 uppercase text-start'>
                  CONTACT
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedData?.map((item: any, localIndex) => (
              <tr key={calculateGlobalIndex(localIndex)}>
                {onSelectRow && (
                  <td className='px-4 py-2 border-b border-gray-200 mx-auto '>
                    <div className='flex text-center justify-center '>
                      <input
                        id={`checkbox-${item.originalIndex}`} // Usa un id único basado en el índice original
                        className='peer hidden'
                        type='checkbox'
                        checked={selectedRows[item.originalIndex] || false}
                        onChange={() => onSelectRow(item)}
                      />
                      <label
                        htmlFor={`checkbox-${item.originalIndex}`} // Asegúrate de que el label apunte al id único
                        className='flex items-center justify-center w-6 h-6 border border-green-500 rounded bg-white cursor-pointer relative text-white peer-checked:text-green-500'
                      >
                        <i className='fi fi-rr-check absolute text-lg '></i>
                      </label>
                    </div>
                  </td>
                )}
                {columns
                  ?.filter((column: string) => column !== 'date_updated')
                  .map((column: any) => (
                    <td
                      key={column}
                      className={` px-4 py-2 border-b border-gray-200 `}
                      //onContextMenu={(e) => e.preventDefault()}
                    >
                      {column === 'date' ? (
                        dayjs
                          .utc(item[column] as string)
                          .local()
                          .format('MM/DD/YYYY')
                      ) : column === 'email' ? (
                        <p
                          className={`${
                            rol === 'lawyer' &&
                            item.status === 'ASSIGNED' &&
                            ' blur-sm select-none'
                          }`}
                        >
                          {rol === 'lawyer' && item.status === 'ASSIGNED'
                            ? 'xxx@587lawyers.com'
                            : item[column]}
                        </p>
                      ) : column === 'phone number' ? (
                        <p
                          className={`${
                            rol === 'lawyer' &&
                            item.status === 'ASSIGNED' &&
                            ' blur-sm select-none'
                          }`}
                        >
                          {rol === 'lawyer' && item.status === 'ASSIGNED'
                            ? '0000000000'
                            : item[column]}
                        </p>
                      ) : column === 'lawyer name' ? (
                        <p
                          onClick={() => onRoute && onRoute(item.originalIndex)}
                          className={`${
                            onRoute && 'hover:underline cursor-pointer'
                          }`}
                        >
                          {item[column]}
                        </p>
                      ) : column === 'last active' ? (
                        item[column] === null ? (
                          ''
                        ) : (
                          <div
                            className='cursor-pointer'
                            onClick={() => onLastActive(item)}
                          >
                            {dayjs
                              .utc(item[column] as number)
                              .local()
                              .format('MM/DD/YYYY')}
                          </div>
                        )
                      ) : column === 'service type' ? (
                        !item[column] ? (
                          <div className='w-full'>
                            <SkeletonText />
                          </div>
                        ) : (
                          item[column].map((item: any, index: number) => (
                            <div key={index}>
                              {item.label.replace(' Lawyer', '')}
                            </div>
                          ))
                        )
                      ) : column === 'service' ? (
                        <p>{item[column].replace(' Lawyer', '')}</p>
                      ) : column === 'status' && statusColors ? (
                        <p
                          onClick={() =>
                            onStatus && onStatus(item.originalIndex)
                          }
                          className={`px-2 py-1 rounded font-semibold max-w-30 text-nowrap w-full text-center capitalize-first ${
                            onStatus && 'cursor-pointer'
                          }`}
                          style={{
                            backgroundColor: `${statusColors[item[column]]}20`,
                            color: statusColors[item[column]],
                          }}
                        >
                          {item[column] === null ? (
                            <div className='w-full'>
                              <SkeletonText />
                            </div>
                          ) : item[column] === 'LOST' ? (
                            'Send Back'
                          ) : item[column] === 'EXPIRED' ? (
                            'Dead'
                          ) : (
                            item[column]
                          )}
                        </p>
                      ) : (
                        item[column]?.toString()
                      )}
                    </td>
                  ))}
                {(onEdit || onDelete) && (
                  <td className='px-4 py-2 border-b border-gray-200'>
                    {onEdit && (
                      <button
                        onClick={() => onEdit(item.originalIndex)}
                        className='text-white bg-customGreen bg-opacity-70 p-1 rounded-full mr-2 hover:bg-customGreen'
                      >
                        <MdEdit />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(item.originalIndex)}
                        className='text-white bg-customRed bg-opacity-70 p-1 rounded-full mr-2 hover:bg-customRed'
                      >
                        <MdOutlineDelete />
                      </button>
                    )}
                  </td>
                )}
                {isDeleteMultiple && onDeleteMultiple && (
                  <td className='px-4 py-2 border-b border-gray-200 mx-auto'>
                    <div className='flex text-center justify-center'>
                      <input
                        id={`checkbox-${item.originalIndex}`} // Usa un id único basado en el índice original
                        className='peer hidden'
                        type='checkbox'
                        checked={selectedRows[item.originalIndex] || false}
                        onChange={() => onDeleteMultiple(item.originalIndex)}
                      />
                      <label
                        htmlFor={`checkbox-${item.originalIndex}`}
                        className='flex items-center justify-center w-6 h-6 border border-red-500 rounded bg-white cursor-pointer relative text-white peer-checked:text-red-500'
                      >
                        <i className='fi fi-rr-check absolute text-lg '></i>
                      </label>
                    </div>
                  </td>
                )}
                {onContact && (
                  <td className='px-4 py-2 border-b border-gray-200  text-center'>
                    {/* <button
                      onClick={() =>
                        item.status !== 'DISABLED' &&
                        onContact(item.originalIndex)
                      }
                      className={`${
                        item.status === 'EXPIRED' || item.status === 'DISABLED'
                          ? ' cursor-not-allowed text-gray-400'
                          : 'hover:underline cursor-pointer'
                      }`}
                      disabled={
                        item.status === 'DISABLED' || item.status === 'EXPIRED'
                      }
                    >
                      Contact
                    </button> */}
                    {item.status === 'EXPIRED' || item.status === 'DISABLED' ? (
                      <button className='text-white bg-gray-500 bg-opacity-70 p-1 rounded-full mr-2 hover:cursor-not-allowed'>
                        <MdEdit />
                      </button>
                    ) : (
                      <button
                        onClick={() => onContact(item.originalIndex)}
                        className='text-white bg-customGreen bg-opacity-70 p-1 rounded-full mr-2 hover:bg-customGreen'
                      >
                        <MdEdit />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className='flex justify-between items-center mb-4'>
        <div>
          <span className='mr-2'>Showing</span>
          <select
            value={itemsPerPage}
            onChange={handleItemsPerPageChange}
            className='px-2 py-1 border border-gray-300 rounded'
          >
            {[10, 25, 50, data?.length].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize === data?.length ? 'All' : pageSize}
              </option>
            ))}
          </select>
          <span className='ml-2'>of {data?.length}</span>
        </div>
        <div>
          <button
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
            className={`px-3 py-1 border rounded-l-md ${
              currentPage === 1 ? 'bg-gray-300 cursor-default' : 'bg-white'
            }`}
          >
            <MdOutlineArrowBackIos />
          </button>
          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 border rounded-r-md ${
              currentPage === totalPages
                ? 'bg-gray-300 cursor-default'
                : 'bg-white'
            }`}
          >
            <MdOutlineArrowForwardIos />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SortableTable;
