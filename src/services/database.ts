import { ResponseEndpoint } from '@/types/Response/response.interface';
import { setCookie, destroyCookie } from 'nookies';
export const database = {
  auth: async (email: string, password: string) => {
    try {
      const url: string | undefined = process.env.NEXT_PUBLIC_URL_AUTH;

      if (!url) {
        throw new Error('Authentication URL is not defined');
      }

      const response: Response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const error: any = new Error(
          errorData.message || 'Authentication failed'
        );
        error.statusCode = response.status;
        throw error;
      }

      const data = await response.json();
      setCookie(null, 'currentUser', data.access_token, {
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
        secure: 'production',
        sameSite: 'lax',
      });

      return {
        success: true,
        code: 200,
        data: data,
      };
    } catch (error: any) {
      return {
        success: false,
        code: error.statusCode || 500,
        data: null,
        messages: error.message || 'An unexpected error occurred',
      };
    }
  },
  resetPassword: async (token: string, newPassword: string) => {
    try {
      const url: string | undefined =
        process.env.NEXT_PUBLIC_URL_RESET_PASSWORD;

      if (!url) {
        throw new Error('Authentication URL is not defined');
      }

      const response: Response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: token, newPassword: newPassword }),
      });
      //const data = await response.json();

      if (!response.ok) {
        const errorData = await response.json();
        const error: any = new Error(
          errorData.message || 'Authentication failed'
        );
        error.statusCode = response.status;
        throw error;
      }

      // setCookie(null, 'currentUser', token, {
      //   maxAge: 30 * 24 * 60 * 60,
      //   path: '/',
      //   secure: 'production',
      //   sameSite: 'lax',
      // });

      return {
        success: true,
        code: 200,
        data: response,
      };
    } catch (error: any) {
      return {
        success: false,
        code: error.statusCode || 500,
        data: null,
        messages: error.message || 'An unexpected error occurred',
      };
    }
  },
  requestPassword: async (email: string) => {
    try {
      const url: string | undefined =
        process.env.NEXT_PUBLIC_URL_REQUEST_PASSWORD;

      if (!url) {
        throw new Error('Authentication URL is not defined');
      }

      const response: Response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const error: any = new Error(
          errorData.message || 'Authentication failed'
        );
        error.statusCode = response.status;
        throw error;
      }

      const data = await response.json();

      return {
        success: true,
        code: 200,
        data: data,
      };
    } catch (error: any) {
      return {
        success: false,
        code: error.statusCode || 500,
        data: null,
        messages: error.message || 'An unexpected error occurred',
      };
    }
  },
  authIdRol: async (id: any) => {
    try {
      const url:
        | string
        | undefined = `${process.env.NEXT_PUBLIC_URL_LAWYER_MANAGMENT}/${id}`;
      const response: Response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        const error: any = new Error(
          errorData.message || 'Authentication failed'
        );
        error.statusCode = response.status;
        throw error;
      }
      const data = await response.json();
      return {
        success: true,
        code: 200,
        data: data.data.role.name,
      };
    } catch (error: any) {
      return {
        success: false,
        code: error.statusCode || 500,
        data: null,
        messages: error.message || 'An unexpected error occurred',
      };
    }
  },
  signout: () => {
    destroyCookie(null, 'currentUser', { path: '/' });
    return {
      success: true,
      message: 'Signed out successfully',
    };
  },
  getLawyer: async (id: any) => {
    try {
      const url:
        | string
        | undefined = `${process.env.NEXT_PUBLIC_URL_LAWYER_MANAGMENT}/${id}`;
      const response: Response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        const error: any = new Error(
          errorData.message || 'Authentication failed'
        );
        error.statusCode = response.status;
        throw error;
      }
      const data = await response.json();
      // const data = dataFull.data.map(
      //   ({ password, ...rest }: LawyerData) => rest
      // );
      return {
        success: true,
        code: 200,
        data: data,
      };
    } catch (error: any) {
      return {
        success: false,
        code: error.statusCode || 500,
        data: null,
        messages: error.message || 'An unexpected error occurred',
      };
    }
  },
  fetchData: async (source: string): Promise<ResponseEndpoint> => {
    try {
      const response = await fetch(source);
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
  getData: async (source: string): Promise<ResponseEndpoint> => {
    try {
      const response = await fetch(source);
      const dataFull = await response.json();

      const data = dataFull.data.map(({ password, ...rest }: any) => rest);

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
  getLeadsAssigned: async (): Promise<ResponseEndpoint> => {
    const url = process.env.NEXT_PUBLIC_URL_LEADS_ASSIGNED || '';

    try {
      const response = await fetch(url);
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
  getSelectTypeLawyer: async (): Promise<ResponseEndpoint> => {
    const url = process.env.NEXT_PUBLIC_URL_LAWYERS_SERVICE || '';

    try {
      const response = await fetch(url);
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
  CreateLawyer: async (sendData: object): Promise<ResponseEndpoint> => {
    try {
      const url: string = process.env.NEXT_PUBLIC_URL_LAWYER_MANAGMENT || '';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sendData),
      });
      const data = await response.json();

      return {
        success: data.success,
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
  insertData: async (
    url: string,
    sendData: object
  ): Promise<ResponseEndpoint> => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sendData),
      });
      const data = await response.json();

      return {
        success: data.success,
        code: data.statusCode,
        data: data.data,
        messages: data.message,
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
  uploadProfile: async (formData: any): Promise<ResponseEndpoint> => {
    const url = `${process.env.NEXT_PUBLIC_URL_PROFILE_IMAGE}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      return {
        success: data.success,
        code: data.statusCode,
        data: data.data,
        messages: data.message,
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
  updateData: async (
    url: string,
    sendData: object
  ): Promise<ResponseEndpoint> => {
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sendData),
      });
      const data = await response.json();

      return {
        success: true,
        code: data.statusCode,
        data: data,
        messages: data.message,
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
  UpdateLawyer: async (
    sendData: LawyerData,
    id?: number | undefined
  ): Promise<ResponseEndpoint> => {
    try {
      const url: string = `${process.env.NEXT_PUBLIC_URL_LAWYER_MANAGMENT}/${id}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sendData),
      });
      const data = await response.json();

      return {
        success: true,
        code: data.statusCode,
        data: data,
        messages: data.message,
      };
    } catch (error) {
      return {
        success: false,
        code: 400,
        data: [],
        messages: 'error updating lawyer',
      };
    }
  },
  deleteData: async (url: string): Promise<ResponseEndpoint> => {
    //const url: string = `${process.env.NEXT_PUBLIC_URL_LAWYER_MANAGMENT}/${id}`;
    await fetch(url, {
      method: 'DELETE',
    });

    return {
      success: true,
      code: 200,
      data: [],
      messages: 'data deleted successfully',
    };
  },
  DeleteLawyer: async (id?: number | undefined): Promise<ResponseEndpoint> => {
    try {
      const url: string = `${process.env.NEXT_PUBLIC_URL_LAWYER_MANAGMENT}/${id}`;
      const response = await fetch(url, {
        method: 'DELETE',
      });
      const data = await response.json();

      return {
        success: data.success,
        code: data.statusCode,
        data: data,
        messages: data.message,
      };
    } catch (error) {
      return {
        success: false,
        code: 400,
        data: [],
        messages: 'error deleted lawyer',
      };
    }
  },
};
