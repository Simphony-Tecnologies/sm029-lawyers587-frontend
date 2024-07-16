import { ResponseEndpoint } from '@/types/Response/response.interface';

export const database = {
  getData: async (source: string): Promise<ResponseEndpoint> => {
    try {
      const response = await fetch(source, { mode: 'no-cors' });
      const data = await response.json();
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
