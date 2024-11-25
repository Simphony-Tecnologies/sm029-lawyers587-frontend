import { database } from '@/services/database';
import toast from 'react-hot-toast';

export const getServiceType = async () => {
  const resType = await database.getData(
    `${process.env.NEXT_PUBLIC_URL}/service_types` || ''
  );
  if (!resType.success) {
    return toast.error('Error to get service type');
  }

  return resType.data;
};
