'use client';
import Tilte from '@/components/atoms/Tilte';
import SortableTable from '@/components/organisms/SortableTable';
import { useState, useEffect } from 'react';

const LawyerManagement = () => {
  const [data, setData] = useState<{ [key: string]: string | number }[]>([]);
  const [columns, setColumns] = useState([]);
  const [error, setError] = useState(null);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('./data.json');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setData(data);

        if (data.length > 0) {
          const firstItem = data[0];
          const titles: any = Object.keys(firstItem);
          setColumns(titles);
        }
      } catch (error: any) {
        setError(error.message);
      }
    };

    fetchData();
  }, []);

  const statusColors = {
    Assignable: '#00B69B',
    Unassignable: '#FF4240',
  };

  const handleEdit = (index: number) => {
    const newName = prompt('Enter new name', data[index].name as string);
    if (newName) {
      const newData = [...data];
      newData[index].name = newName;
      setData(newData);
    }
  };

  const handleDelete = (index: number) => {
    const newData = data.filter((_, i) => i !== index);
    setData(newData);
  };

  return (
    <div className='container mx-auto p-4'>
      <Tilte name='Lawyer Management' />
      <SortableTable
        columns={columns}
        data={data}
        statusColors={statusColors}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default LawyerManagement;
