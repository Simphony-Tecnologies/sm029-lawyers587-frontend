import { ResponseEndpoint } from '@/types/Response/response.interface';
import { setCookie, destroyCookie } from 'nookies';

const readCookie = (name: string): string | undefined => {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]+)`)
  );
  if (!match) return undefined;
  const value = decodeURIComponent(match[1]);
  if (!value || value === 'undefined' || value === 'null') return undefined;
  return value;
};

const resolveToken = (override?: string): string | undefined => {
  if (override) return override;
  const fromCookie = readCookie('currentUser');
  if (typeof document !== 'undefined' && !fromCookie) {
    console.warn('[auth] no token in cookie — needs login');
  }
  return fromCookie;
};

const buildHeaders = (
  token: string | undefined,
  extra: Record<string, string> = {}
): HeadersInit => {
  const headers: Record<string, string> = { ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const jsonHeaders = (token?: string) =>
  buildHeaders(token, { 'Content-Type': 'application/json' });

const unwrapList = (body: any): any[] => {
  if (Array.isArray(body?.data?.data)) return body.data.data;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body)) return body;
  return [];
};

const unwrapEntity = (body: any): any => {
  if (body?.data && body.data?.data !== undefined) return body.data.data;
  if (body?.data !== undefined) return body.data;
  return body;
};

const safeStatus = (resp: Response) => resp.status || 500;

export const database = {
  auth: async (email: string, password: string) => {
    try {
      const url = `${process.env.NEXT_PUBLIC_URL}/auth/login`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: any = new Error(
          errorData.message || 'Authentication failed'
        );
        error.statusCode = response.status;
        throw error;
      }

      const body = await response.json();
      const data = unwrapEntity(body);

      console.log('[auth] login keys:', Object.keys(data || {}));
      console.log('[auth] access_token length:', data?.access_token?.length || 0);

      if (!data?.access_token) {
        return {
          success: false,
          code: 500,
          data: null,
          messages:
            'Login response missing access_token (check backend response shape)',
        };
      }

      setCookie(null, 'currentUser', data.access_token, {
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });

      return { success: true, code: 200, data };
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
      const url = `${process.env.NEXT_PUBLIC_URL}/auth/reset-password`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: any = new Error(
          errorData.message || 'Authentication failed'
        );
        error.statusCode = response.status;
        throw error;
      }
      return { success: true, code: 200, data: response };
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
      const url = `${process.env.NEXT_PUBLIC_URL}/auth/request-password-reset`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: any = new Error(
          errorData.message || 'Authentication failed'
        );
        error.statusCode = response.status;
        throw error;
      }
      const data = await response.json();
      return { success: true, code: 200, data };
    } catch (error: any) {
      return {
        success: false,
        code: error.statusCode || 500,
        data: null,
        messages: error.message || 'An unexpected error occurred',
      };
    }
  },

  authIdRol: async (id: any, token?: string) => {
    try {
      const url = `${process.env.NEXT_PUBLIC_URL}/lawyers/${id}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: jsonHeaders(resolveToken(token)),
        cache: 'no-store',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: any = new Error(
          errorData.message || 'Authentication failed'
        );
        error.statusCode = response.status;
        throw error;
      }
      const body = await response.json();
      const entity = unwrapEntity(body);
      const roleName = entity?.role?.name;
      return { success: true, code: 200, data: roleName };
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
    return { success: true, message: 'Signed out successfully' };
  },

  getLawyer: async (id: any, token?: string) => {
    try {
      const url = `${process.env.NEXT_PUBLIC_URL}/lawyers/${id}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: jsonHeaders(resolveToken(token)),
        cache: 'no-store',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: any = new Error(
          errorData.message || 'Authentication failed'
        );
        error.statusCode = response.status;
        throw error;
      }
      const data = await response.json();
      return { success: true, code: 200, data };
    } catch (error: any) {
      return {
        success: false,
        code: error.statusCode || 500,
        data: null,
        messages: error.message || 'An unexpected error occurred',
      };
    }
  },

  fetchData: async (
    source: string,
    token?: string
  ): Promise<ResponseEndpoint> => {
    try {
      const response = await fetch(source, {
        headers: jsonHeaders(resolveToken(token)),
        cache: 'no-store',
      });
      if (!response.ok) {
        return {
          success: false,
          code: safeStatus(response),
          data: [],
          messages: response.statusText || 'request failed',
        };
      }
      const data = await response.json();
      return { success: true, code: 200, data };
    } catch (error) {
      return {
        success: false,
        code: 400,
        data: [],
        messages: 'error connecting to database',
      };
    }
  },

  getData: async (
    source: string,
    token?: string
  ): Promise<ResponseEndpoint> => {
    try {
      const response = await fetch(source, {
        headers: jsonHeaders(resolveToken(token)),
        cache: 'no-store',
      });
      if (!response.ok) {
        return {
          success: false,
          code: safeStatus(response),
          data: [],
          messages: response.statusText || 'request failed',
        };
      }
      const body = await response.json();
      const list = unwrapList(body).map(({ password, ...rest }: any) => rest);
      return { success: true, code: 200, data: list };
    } catch (error) {
      return {
        success: false,
        code: 400,
        data: [],
        messages: 'error connecting to database',
      };
    }
  },

  getLeadsAssigned: async (token?: string): Promise<ResponseEndpoint> => {
    const url = `${process.env.NEXT_PUBLIC_URL}/leads-assigned`;
    try {
      const response = await fetch(url, {
        headers: jsonHeaders(resolveToken(token)),
        cache: 'no-store',
      });
      if (!response.ok) {
        return {
          success: false,
          code: safeStatus(response),
          data: [],
          messages: response.statusText || 'request failed',
        };
      }
      const data = await response.json();
      return { success: true, code: 200, data };
    } catch (error) {
      return {
        success: false,
        code: 400,
        data: [],
        messages: 'error connecting to database',
      };
    }
  },

  getSelectTypeLawyer: async (token?: string): Promise<ResponseEndpoint> => {
    const url = `${process.env.NEXT_PUBLIC_URL}/lawyers-services`;
    try {
      const response = await fetch(url, {
        headers: jsonHeaders(resolveToken(token)),
        cache: 'no-store',
      });
      if (!response.ok) {
        return {
          success: false,
          code: safeStatus(response),
          data: [],
          messages: response.statusText || 'request failed',
        };
      }
      const data = await response.json();
      return { success: true, code: 200, data };
    } catch (error) {
      return {
        success: false,
        code: 400,
        data: [],
        messages: 'error connecting to database',
      };
    }
  },

  CreateLawyer: async (
    sendData: object,
    token?: string
  ): Promise<ResponseEndpoint> => {
    try {
      const url = `${process.env.NEXT_PUBLIC_URL}/lawyers`;
      const response = await fetch(url, {
        method: 'POST',
        headers: jsonHeaders(resolveToken(token)),
        body: JSON.stringify(sendData),
      });
      const data = await response.json().catch(() => ({}));
      return {
        success: response.ok && data?.success !== false,
        code: response.status,
        data,
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
    sendData: object,
    token?: string
  ): Promise<ResponseEndpoint> => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: jsonHeaders(resolveToken(token)),
        body: JSON.stringify(sendData),
      });
      const data = await response.json().catch(() => ({}));
      return {
        success: response.ok && data?.success !== false,
        code: data?.statusCode ?? response.status,
        data: data?.data ?? data,
        messages: data?.message,
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

  postData: async (
    url: string,
    sendData: object,
    token?: string
  ): Promise<ResponseEndpoint> => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: jsonHeaders(resolveToken(token)),
        body: JSON.stringify(sendData),
      });
      const data = await response.json().catch(() => ({}));
      return {
        success: response.ok,
        code: response.status,
        data,
        messages: response.ok
          ? 'Successfully created'
          : data?.message || response.statusText,
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

  uploadProfile: async (
    formData: any,
    token?: string
  ): Promise<ResponseEndpoint> => {
    const url = `${process.env.NEXT_PUBLIC_URL}/lawyers/upload-profile-image`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: buildHeaders(resolveToken(token)),
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      return {
        success: response.ok && data?.success !== false,
        code: data?.statusCode ?? response.status,
        data: data?.data ?? data,
        messages: data?.message,
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
    sendData: object,
    token?: string
  ): Promise<ResponseEndpoint> => {
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: jsonHeaders(resolveToken(token)),
        body: JSON.stringify(sendData),
      });
      const data = await response.json().catch(() => ({}));
      return {
        success: response.ok,
        code: data?.statusCode ?? response.status,
        data,
        messages: data?.message,
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

  patchData: async (
    url: string,
    sendData: object,
    token?: string
  ): Promise<ResponseEndpoint> => {
    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: jsonHeaders(resolveToken(token)),
        body: JSON.stringify(sendData),
      });
      const data = await response.json().catch(() => ({}));
      return {
        success: response.ok,
        code: data?.statusCode ?? response.status,
        data,
        messages: data?.message,
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
    id?: number | undefined,
    token?: string
  ): Promise<ResponseEndpoint> => {
    try {
      const url = `${process.env.NEXT_PUBLIC_URL}/lawyers/${id}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: jsonHeaders(resolveToken(token)),
        body: JSON.stringify(sendData),
      });
      const data = await response.json().catch(() => ({}));
      return {
        success: response.ok,
        code: data?.statusCode ?? response.status,
        data,
        messages: data?.message,
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

  deleteData: async (
    url: string,
    token?: string
  ): Promise<ResponseEndpoint> => {
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: jsonHeaders(resolveToken(token)),
      });
      return {
        success: response.ok,
        code: response.status,
        data: [],
        messages: response.ok
          ? 'data deleted successfully'
          : response.statusText,
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

  DeleteLawyer: async (
    id?: number | undefined,
    token?: string
  ): Promise<ResponseEndpoint> => {
    try {
      const url = `${process.env.NEXT_PUBLIC_URL}/lawyers/${id}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: jsonHeaders(resolveToken(token)),
      });
      const data = await response.json().catch(() => ({}));
      return {
        success: data?.success ?? response.ok,
        code: data?.statusCode ?? response.status,
        data,
        messages: data?.message,
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
