'use client';
import React, { useState } from 'react';
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

type SortDirection = 'ascending' | 'descending';

type SortConfig = {
  key: string;
  direction: SortDirection;
};

type SortableTableProps = {
  columns: string[];
  data: { [key: string]: string | number }[];
  statusColors?: { [key: string]: string };
  onEdit?: (index: number) => void;
  onDelete?: (index: number) => void;
  onStatus?: (index: number) => void;
  onRoute?: (index: number) => void;
};

const SortableTable = ({
  columns,
  data,
  statusColors,
  onEdit,
  onDelete,
  onStatus,
  onRoute,
}: SortableTableProps) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const totalPages = Math.ceil(data ? data.length : 0 / itemsPerPage);
  dayjs.extend(utc);
  const onSort = (column: string) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig?.key === column && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key: column, direction });
  };

  const sortedData = React.useMemo(() => {
    if (!sortConfig) return data;

    const sorted = [...data].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }, [data, sortConfig]);

  const paginatedData = sortedData?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

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

  return (
    <div className='flex flex-col gap-10'>
      {/* {columns.length <= 0 && <SkeletonTable />} */}
      <div className=' overflow-x-auto shadow-sm sm:rounded-lg border'>
        <table className='min-w-full bg-white'>
          <thead className='bg-gray-50'>
            <tr>
              {columns?.map((column) => (
                <th
                  key={column}
                  onClick={() => onSort(column)}
                  className={`px-4 py-2 border-b-2 border-gray-200 cursor-pointer`}
                >
                  <div className='uppercase flex items-center text-start'>
                    {column}
                    {sortConfig?.key === column && (
                      <span>
                        {sortConfig.direction === 'ascending' ? (
                          <div className='text-gray-500'>
                            <MdImportExport />
                          </div>
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
            </tr>
          </thead>
          <tbody>
            {paginatedData?.map((item: any, index) => (
              <tr
                key={item.code}
                className={`${onRoute && 'hover:bg-gray-200 cursor-pointer'}`}
              >
                {columns?.map((column) => (
                  <td
                    onClick={() =>
                      onRoute && onRoute(calculateGlobalIndex(index))
                    }
                    key={column}
                    className={` px-4 py-2 border-b border-gray-200`}
                  >
                    {column === 'date' ? (
                      dayjs
                        .utc(item[column] as string)
                        .local()
                        .format('MM/DD/YYYY')
                    ) : column === 'last active' ? (
                      item[column] === null ? (
                        ''
                      ) : (
                        dayjs
                          .utc(item[column] as number)
                          .local()
                          .format('MM/DD/YYYY')
                      )
                    ) : column === 'service type' ? (
                      item[column].name
                    ) : column === 'status' && statusColors ? (
                      <p
                        onClick={() =>
                          onStatus && onStatus(calculateGlobalIndex(index))
                        }
                        className={`px-2 py-1 rounded font-semibold max-w-30 w-full  text-center ${
                          onStatus && 'cursor-pointer'
                        }`}
                        style={{
                          backgroundColor: statusColors[item[column]] + 20,
                          color: statusColors[item[column]],
                        }}
                      >
                        {item[column]}
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
                        onClick={() => onEdit(calculateGlobalIndex(index))}
                        className='text-white bg-customGreen bg-opacity-70 p-1 rounded-full mr-2 hover:bg-customGreen'
                      >
                        <MdEdit />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(calculateGlobalIndex(index))}
                        className='text-white bg-customRed bg-opacity-70 p-1 rounded-full mr-2 hover:bg-customRed'
                      >
                        <MdOutlineDelete />
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
            {[5, 10, 15].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
          <span className='ml-2'>of {data?.length}</span>
        </div>
        <div>
          <button
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
            className={`px-3 py-1 border rounded-l-md  ${
              currentPage === 1 ? 'bg-gray-300 cursor-default' : 'bg-white '
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
                : 'bg-white '
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
