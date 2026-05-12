import { ResponseEndpoint } from '@/types/Response/response.interface';
import { setCookie, destroyCookie } from 'nookies';
import type {
  ApiResult,
  AssignLeadDTO,
  AssignLeadResult,
  AuditEvent,
  BulkArchiveDTO,
  BulkAssignDTO,
  BulkDeleteDTO,
  BulkResult,
  BulkStatusDTO,
  CommentFilters,
  CreateCommentDTO,
  ExportFormat,
  HistoryFilters,
  LawyerFilters,
  LawyerHistoryResponse,
  LawyerListItem,
  LawyerStats,
  LeadComment,
  LeadDTO,
  LeadFilters,
  Paginated,
  PoolFilters,
  PullLeadDTO,
  TimelineEntry,
  TimelineFilters,
  UnassignLeadDTO,
  UpdateLawyerPasswordDTO,
  UpdateLawyerStatusDTO,
} from '@/types/api.types';

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

// ────────────────────────────────────────────────────────────────────────────
// API v2 — endpoints nuevos (new.md). Aditivo: no reemplaza nada arriba.
// ────────────────────────────────────────────────────────────────────────────

const baseUrl = (): string => process.env.NEXT_PUBLIC_URL || '';

const buildQuery = (params?: Record<string, unknown>): string => {
  if (!params) return '';
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    usp.append(k, String(v));
  });
  const q = usp.toString();
  return q ? `?${q}` : '';
};

const unwrapApi = <T>(body: any, ok: boolean, status: number): ApiResult<T> => {
  const success = ok && body?.success !== false;
  return {
    success,
    code: body?.statusCode ?? status,
    data: success ? ((body?.data ?? body) as T) : null,
    message: body?.message || body?.error,
  };
};

async function apiRequest<T>(
  path: string,
  init: RequestInit,
  token?: string
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${baseUrl()}${path}`, {
      ...init,
      headers: {
        ...jsonHeaders(resolveToken(token)),
        ...(init.headers as Record<string, string> | undefined),
      },
      cache: 'no-store',
    });
    const body = await response.json().catch(() => ({}));
    return unwrapApi<T>(body, response.ok, response.status);
  } catch (error: any) {
    return {
      success: false,
      code: 0,
      data: null,
      message: error?.message || 'network error',
    };
  }
}

async function apiBlob(
  path: string,
  token?: string,
  accept?: string
): Promise<ApiResult<Blob>> {
  try {
    const response = await fetch(`${baseUrl()}${path}`, {
      method: 'GET',
      headers: buildHeaders(resolveToken(token), accept ? { Accept: accept } : {}),
      cache: 'no-store',
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return {
        success: false,
        code: response.status,
        data: null,
        message: body?.message || body?.error || response.statusText,
      };
    }
    const blob = await response.blob();
    return { success: true, code: response.status, data: blob };
  } catch (error: any) {
    return {
      success: false,
      code: 0,
      data: null,
      message: error?.message || 'network error',
    };
  }
}

export const api = {
  leads: {
    list: (filters?: LeadFilters, token?: string) =>
      apiRequest<Paginated<LeadDTO>>(
        `/leads${buildQuery(filters as Record<string, unknown>)}`,
        { method: 'GET' },
        token
      ),

    get: (id: number, token?: string) =>
      apiRequest<LeadDTO>(`/leads/${id}`, { method: 'GET' }, token),

    update: (id: number, body: Record<string, unknown>, token?: string) =>
      apiRequest<LeadDTO>(
        `/leads/${id}`,
        { method: 'PUT', body: JSON.stringify(body) },
        token
      ),

    archive: (id: number, token?: string) =>
      apiRequest<{ id: number; status: 'ARCHIVED' }>(
        `/leads/${id}/archive`,
        { method: 'PUT' },
        token
      ),

    assign: (id: number, body: AssignLeadDTO, token?: string) =>
      apiRequest<AssignLeadResult>(
        `/leads/${id}/assign`,
        { method: 'PATCH', body: JSON.stringify(body) },
        token
      ),

    unassign: (id: number, body: UnassignLeadDTO, token?: string) =>
      apiRequest<AssignLeadResult>(
        `/leads/${id}/unassign`,
        { method: 'PATCH', body: JSON.stringify(body) },
        token
      ),

    timeline: (id: number, filters?: TimelineFilters, token?: string) =>
      apiRequest<Paginated<TimelineEntry>>(
        `/leads/${id}/timeline${buildQuery(filters as Record<string, unknown>)}`,
        { method: 'GET' },
        token
      ),

    history: (id: number, filters?: HistoryFilters, token?: string) =>
      apiRequest<Paginated<AuditEvent>>(
        `/leads/${id}/history${buildQuery(filters as Record<string, unknown>)}`,
        { method: 'GET' },
        token
      ),

    comments: {
      list: (leadId: number, filters?: CommentFilters, token?: string) =>
        apiRequest<Paginated<LeadComment>>(
          `/leads/${leadId}/comments${buildQuery(filters as Record<string, unknown>)}`,
          { method: 'GET' },
          token
        ),
      create: (leadId: number, body: CreateCommentDTO, token?: string) =>
        apiRequest<LeadComment>(
          `/leads/${leadId}/comments`,
          { method: 'POST', body: JSON.stringify(body) },
          token
        ),
    },

    bulk: {
      assign: (body: BulkAssignDTO, token?: string) =>
        apiRequest<BulkResult>(
          `/leads/bulk/assign`,
          { method: 'PATCH', body: JSON.stringify(body) },
          token
        ),
      status: (body: BulkStatusDTO, token?: string) =>
        apiRequest<BulkResult>(
          `/leads/bulk/status`,
          { method: 'PATCH', body: JSON.stringify(body) },
          token
        ),
      archive: (body: BulkArchiveDTO, token?: string) =>
        apiRequest<BulkResult>(
          `/leads/bulk/archive`,
          { method: 'PATCH', body: JSON.stringify(body) },
          token
        ),
      delete: (body: BulkDeleteDTO, token?: string) =>
        apiRequest<BulkResult>(
          `/leads/bulk`,
          { method: 'DELETE', body: JSON.stringify(body) },
          token
        ),
    },

    pool: (filters?: PoolFilters, token?: string) =>
      apiRequest<Paginated<LeadDTO>>(
        `/leads/pool${buildQuery(filters as Record<string, unknown>)}`,
        { method: 'GET' },
        token
      ),

    pull: (body: PullLeadDTO, token?: string) =>
      apiRequest<AssignLeadResult>(
        `/leads/pull`,
        { method: 'POST', body: JSON.stringify(body) },
        token
      ),

    exportCsv: (filters?: LeadFilters, token?: string) =>
      apiBlob(
        `/leads/export${buildQuery({ ...(filters || {}), format: 'csv' })}`,
        token,
        'text/csv'
      ),

    exportHistory: (
      id: number,
      format: ExportFormat = 'csv',
      filters?: HistoryFilters,
      token?: string
    ) =>
      apiBlob(
        `/leads/${id}/history/export${buildQuery({ ...(filters || {}), format })}`,
        token,
        format === 'csv' ? 'text/csv' : 'application/pdf'
      ),
  },

  lawyers: {
    list: (filters?: LawyerFilters, token?: string) =>
      apiRequest<Paginated<LawyerListItem>>(
        `/lawyers${buildQuery(filters as Record<string, unknown>)}`,
        { method: 'GET' },
        token
      ),

    stats: (token?: string) =>
      apiRequest<LawyerStats>(`/lawyers/stats`, { method: 'GET' }, token),

    updateStatus: (id: number, body: UpdateLawyerStatusDTO, token?: string) =>
      apiRequest<LawyerListItem>(
        `/lawyers/${id}/status`,
        { method: 'PATCH', body: JSON.stringify(body) },
        token
      ),

    updatePassword: (
      id: number,
      body: UpdateLawyerPasswordDTO,
      token?: string
    ) =>
      apiRequest<{ id: number }>(
        `/lawyers/${id}/password`,
        { method: 'PATCH', body: JSON.stringify(body) },
        token
      ),

    history: (id: number, filters?: HistoryFilters, token?: string) =>
      apiRequest<LawyerHistoryResponse>(
        `/lawyers/${id}/history${buildQuery(filters as Record<string, unknown>)}`,
        { method: 'GET' },
        token
      ),

    exportCsv: (filters?: LawyerFilters, token?: string) =>
      apiBlob(
        `/lawyers/export${buildQuery({ ...(filters || {}), format: 'csv' })}`,
        token,
        'text/csv'
      ),

    exportHistory: (
      id: number,
      format: ExportFormat = 'csv',
      filters?: HistoryFilters,
      token?: string
    ) =>
      apiBlob(
        `/lawyers/${id}/history/export${buildQuery({ ...(filters || {}), format })}`,
        token,
        format === 'csv' ? 'text/csv' : 'application/pdf'
      ),
  },
};

// Helper para disparar descarga de archivo desde un Blob.
export const downloadBlob = (blob: Blob, filename: string): void => {
  if (typeof window === 'undefined') return;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};
