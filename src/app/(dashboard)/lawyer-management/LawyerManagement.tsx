'use client';
import Input from '@/components/atoms/Input';
import Tilte from '@/components/atoms/Tilte';
import Modal from '@/components/organisms/Modal';
import SortableTable from '@/components/organisms/SortableTable';
import { modalLawyer } from '@/configs/modalLawyer.config';
import { useState, useEffect } from 'react';
import { MdOutlineImage, MdSaveAlt } from 'react-icons/md';
type LawyerData = {
  code: string;
  lawyer_name: string;
  email: string;
  phone_number: string;
  service_type: string;
  leads_pulled: number;
  active_leads: number;
  no_leads_lost: number;
  last_active: number;
  status: 'Assignable' | 'Unassignable';
};
const LawyerManagement = () => {
  const [data, setData] = useState<LawyerData[]>([]);
  const [columns, setColumns] = useState([]);
  const [error, setError] = useState(null);
  let [isOpen, setIsOpen] = useState(false);
  const [dataIndex, setDataIndex] = useState<LawyerData>();

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
    setIsOpen(true);
    if (data) {
      setDataIndex(data[index]);
      modalLawyer[0].defaultValue = data[index].lawyer_name;
      modalLawyer[1].defaultValue = data[index].service_type;
      modalLawyer[2].defaultValue = data[index].email;
      modalLawyer[3].defaultValue = data[index].phone_number;
      modalLawyer[4].defaultValue = data[index].leads_pulled.toString();
      modalLawyer[5].defaultValue = data[index].active_leads.toString();
    }
  };

  const handleDelete = (index: number) => {
    const newData = data.filter((_, i) => i !== index);
    setData(newData);
  };

  return (
    <div className="container mx-auto p-4">
      <Modal title="Lawyer Details" isOpen={isOpen} setIsOpen={setIsOpen}>
        <div className="p-5 border-2 border-t-none border-solid rounded-lg border-gray-200">
          <div className="flex flex-col gap-5">
            <div className="text-gray-500 text-sm">Code: {dataIndex?.code}</div>
            <div className="flex items-center gap-2">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-300 cursor-pointer">
                <MdOutlineImage size={32} />
              </div>
              <p className="hover:underline">Change image</p>
              <MdSaveAlt size={24} />
            </div>
            <form className="grid grid-cols-2 gap-5">
              {modalLawyer.map((res) => (
                <Input name={res.name} defaultValue={res.defaultValue} />
              ))}
              <div className="col-span-2">
                <label htmlFor="Notes">Notes</label>
                <textarea
                  //defaultValue={dataIndex?.lawyer_name}
                  name="Notes"
                  className="border border-gray-300 rounded-md w-full p-1 text-sm text-gray-500"
                />
              </div>
            </form>
          </div>
        </div>
        Info about the leads assigned to this lawyer
      </Modal>
      <Tilte name="Lawyer Management" />
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
