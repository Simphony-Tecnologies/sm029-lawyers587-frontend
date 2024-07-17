import { ResponseEndpoint } from '@/types/Response/response.interface';

export const database = {
  getData: async (source: string): Promise<ResponseEndpoint> => {
    try {
      const response = await fetch(source);
      const dataFull = await response.json();
      const data = dataFull.map(({ id, password, ...rest }) => rest);

      return {
        success: true,
        code: 200,
        data: data,
      };
    } catch (error) {
      return {
        success: false,
        code: 400,
        data: [],
        messages: 'error connecting to database',
      };
    }
  },
};
