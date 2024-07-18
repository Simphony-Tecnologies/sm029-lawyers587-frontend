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
        data: data.role.name,
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
  getData: async (source: string): Promise<ResponseEndpoint> => {
    try {
      const response = await fetch(source);
      const dataFull = await response.json();
      const data = dataFull.map(
        ({ id, password, ...rest }: LawyerData) => rest
      );

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
