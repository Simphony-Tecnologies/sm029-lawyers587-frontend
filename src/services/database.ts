import { ResponseEndpoint } from '@/types/Response/response.interface';
import { setCookie, destroyCookie } from 'nookies';
import type {
  ApiResult,
  AssignLeadDTO,
  AssignLeadResult,
  AuditEvent,
  BlacklistEntry,
  BulkArchiveDTO,
  BulkAssignDTO,
  BulkDeleteDTO,
  BulkResult,
  BulkStatusDTO,
  CommentFilters,
  CreateBlacklistDTO,
  CreateCommentDTO,
  CreatePatternDTO,
  ExportFormat,
  HistoryFilters,
  LawyerFilters,
  LawyerHistoryResponse,
  LawyerListItem,
  LawyerPerformanceResponse,
  LawyerStats,
  LeadComment,
  LeadDTO,
  LeadFilters,
  MetricsDateFilters,
  Paginated,
  PerformanceFilters,
  PoolFilters,
  PullLeadDTO,
  SuspiciousPattern,
  TimelineEntry,
  TimelineFilters,
  TrashLeadDTO,
  UnassignLeadDTO,
  UpdateLawyerPasswordDTO,
  UpdateLawyerStatusDTO,
  UpdatePatternDTO,
  WidgetMetricsResponse,
  GlobalNotifSettingsDTO,
  NotificationDTO,
  NotificationHistoryFilters,
  NotificationPreferenceDTO,
  ScheduleNotificationDTO,
  SignupRequest,
  SignupResponse,
  SignupResult,
  VerificationQueueItem,
  VerificationActionBody,
  OnboardingState,
  OnboardingAction,
  OnboardingStatus,
  Firm,
  FirmLawyer,
  FirmSettings,
  MyFirmResponse,
  AddFirmLawyerBody,
  SetFirmAdminsBody,
  SetFirmAdminsResult,
  FirmLeadsQuery,
  MergeFirmsBody,
  MergeFirmsResult,
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

  // Registro self-service (Activity 24). Público, multipart/form-data.
  // Respuesta JSON cruda (NO GenericResponse): no se desenvuelve.
  // NO se fija Content-Type: el browser pone el boundary del multipart.
  // Los 400/409 se manejan en la pantalla, no en un interceptor global.
  signup: async (payload: SignupRequest): Promise<SignupResult> => {
    try {
      const url = `${process.env.NEXT_PUBLIC_URL}/auth/signup`;
      const fd = new FormData();
      fd.append('email', payload.email);
      fd.append('password', payload.password);
      fd.append('firstName', payload.firstName);
      fd.append('lastName', payload.lastName);
      fd.append('phone', payload.phone);
      fd.append('license_number', payload.license_number);
      fd.append('law_firm', payload.law_firm);
      fd.append('file', payload.file);

      const response = await fetch(url, { method: 'POST', body: fd });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          success: false,
          code: response.status,
          data: null,
          messages: body?.message ?? 'Signup failed',
        };
      }

      return {
        success: true,
        code: response.status,
        data: body as SignupResponse,
        messages: body?.message ?? '',
      };
    } catch (error: any) {
      return {
        success: false,
        code: 0,
        data: null,
        messages: error?.message || 'An unexpected error occurred',
      };
    }
  },

  // Cola de verificación (admin). JSON crudo (array directo o {data}).
  getPendingVerifications: async (token?: string) => {
    try {
      const url = `${process.env.NEXT_PUBLIC_URL}/lawyers/verification/pending`;
      const response = await fetch(url, {
        method: 'GET',
        headers: jsonHeaders(resolveToken(token)),
        cache: 'no-store',
      });
      const body = await response.json().catch(() => []);
      if (!response.ok) {
        return {
          success: false,
          code: safeStatus(response),
          data: [] as VerificationQueueItem[],
          messages: body?.message ?? 'request failed',
        };
      }
      const list = Array.isArray(body) ? body : unwrapList(body);
      return {
        success: true,
        code: 200,
        data: list as VerificationQueueItem[],
        messages: '',
      };
    } catch (error: any) {
      return {
        success: false,
        code: 0,
        data: [] as VerificationQueueItem[],
        messages: error?.message ?? 'error connecting to database',
      };
    }
  },

  // Documento de licencia (blob privado). Devuelve un object URL para abrir en
  // otra pestaña; el caller es responsable de URL.revokeObjectURL().
  getLicenseDocumentUrl: async (id: number, token?: string) => {
    try {
      const url = `${process.env.NEXT_PUBLIC_URL}/lawyers/${id}/license-document`;
      const response = await fetch(url, {
        method: 'GET',
        headers: buildHeaders(resolveToken(token)),
      });
      if (!response.ok) {
        return {
          success: false,
          code: safeStatus(response),
          data: null as string | null,
          messages: 'document not available',
        };
      }
      const blob = await response.blob();
      return {
        success: true,
        code: 200,
        data: URL.createObjectURL(blob),
        messages: '',
      };
    } catch (error: any) {
      return {
        success: false,
        code: 0,
        data: null as string | null,
        messages: error?.message ?? 'error connecting to database',
      };
    }
  },

  // Aprobar/rechazar (admin). PATCH /lawyers/:id/verification.
  verifyLawyer: async (
    id: number,
    body: VerificationActionBody,
    token?: string
  ) => {
    try {
      const url = `${process.env.NEXT_PUBLIC_URL}/lawyers/${id}/verification`;
      const response = await fetch(url, {
        method: 'PATCH',
        headers: jsonHeaders(resolveToken(token)),
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      return {
        success: response.ok,
        code: data?.statusCode ?? response.status,
        data,
        messages: data?.message ?? '',
      };
    } catch (error: any) {
      return {
        success: false,
        code: 0,
        data: null,
        messages: error?.message ?? 'error connecting to database',
      };
    }
  },

  // Onboarding del usuario autenticado. JSON crudo.
  getMyOnboarding: async (token?: string) => {
    try {
      const url = `${process.env.NEXT_PUBLIC_URL}/lawyers/me/onboarding`;
      const response = await fetch(url, {
        method: 'GET',
        headers: jsonHeaders(resolveToken(token)),
        cache: 'no-store',
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          success: false,
          code: safeStatus(response),
          data: null as OnboardingState | null,
          messages: body?.message ?? 'request failed',
        };
      }
      return {
        success: true,
        code: 200,
        data: body as OnboardingState,
        messages: '',
      };
    } catch (error: any) {
      return {
        success: false,
        code: 0,
        data: null as OnboardingState | null,
        messages: error?.message ?? 'error connecting to database',
      };
    }
  },

  // Guardar la elección de onboarding. PATCH /lawyers/me/onboarding.
  patchMyOnboarding: async (action: OnboardingAction, token?: string) => {
    try {
      const url = `${process.env.NEXT_PUBLIC_URL}/lawyers/me/onboarding`;
      const response = await fetch(url, {
        method: 'PATCH',
        headers: jsonHeaders(resolveToken(token)),
        body: JSON.stringify({ action }),
      });
      const data = await response.json().catch(() => ({}));
      return {
        success: response.ok,
        code: data?.statusCode ?? response.status,
        data: data as { status: OnboardingStatus },
        messages: data?.message ?? '',
      };
    } catch (error: any) {
      return {
        success: false,
        code: 0,
        data: null,
        messages: error?.message ?? 'error connecting to database',
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

    archive: (id: number, body?: { comment: string }, token?: string) =>
      apiRequest<{ id: number; status: 'ARCHIVED' }>(
        `/leads/${id}/archive`,
        {
          method: 'PUT',
          ...(body ? { body: JSON.stringify(body) } : {}),
        },
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

    review: (filters?: LeadFilters, token?: string) =>
      apiRequest<Paginated<LeadDTO>>(
        `/leads/review${buildQuery(filters as Record<string, unknown>)}`,
        { method: 'GET' },
        token
      ),

    trashList: (filters?: LeadFilters, token?: string) =>
      apiRequest<Paginated<LeadDTO>>(
        `/leads/trash${buildQuery(filters as Record<string, unknown>)}`,
        { method: 'GET' },
        token
      ),

    markValid: (id: number, token?: string) =>
      apiRequest<LeadDTO>(
        `/leads/${id}/mark-valid`,
        { method: 'PATCH' },
        token
      ),

    markSpam: (id: number, token?: string) =>
      apiRequest<LeadDTO>(
        `/leads/${id}/mark-spam`,
        { method: 'PATCH' },
        token
      ),

    trash: (id: number, body?: TrashLeadDTO, token?: string) =>
      apiRequest<{ id: number; status: 'TRASHED' }>(
        `/leads/${id}/trash`,
        {
          method: 'PUT',
          ...(body ? { body: JSON.stringify(body) } : {}),
        },
        token
      ),

    restore: (id: number, token?: string) =>
      apiRequest<LeadDTO>(
        `/leads/${id}/restore`,
        { method: 'PATCH' },
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

    metrics: {
      widgets: (filters?: MetricsDateFilters, token?: string) =>
        apiRequest<WidgetMetricsResponse>(
          `/leads/metrics/widgets${buildQuery(filters as Record<string, unknown>)}`,
          { method: 'GET' },
          token
        ),
    },
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

    metrics: {
      performance: (filters?: PerformanceFilters, token?: string) =>
        apiRequest<LawyerPerformanceResponse>(
          `/lawyers/metrics/performance${buildQuery(filters as Record<string, unknown>)}`,
          { method: 'GET' },
          token
        ),
    },
  },

  spam: {
    blacklist: {
      list: (filters?: { limit?: number; offset?: number }, token?: string) =>
        apiRequest<Paginated<BlacklistEntry>>(
          `/spam/blacklist${buildQuery(filters as Record<string, unknown>)}`,
          { method: 'GET' },
          token
        ),
      create: (body: CreateBlacklistDTO, token?: string) =>
        apiRequest<BlacklistEntry>(
          `/spam/blacklist`,
          { method: 'POST', body: JSON.stringify(body) },
          token
        ),
      delete: (id: number, token?: string) =>
        apiRequest<void>(
          `/spam/blacklist/${id}`,
          { method: 'DELETE' },
          token
        ),
    },
    patterns: {
      list: (filters?: { limit?: number; offset?: number }, token?: string) =>
        apiRequest<Paginated<SuspiciousPattern>>(
          `/spam/patterns${buildQuery(filters as Record<string, unknown>)}`,
          { method: 'GET' },
          token
        ),
      create: (body: CreatePatternDTO, token?: string) =>
        apiRequest<SuspiciousPattern>(
          `/spam/patterns`,
          { method: 'POST', body: JSON.stringify(body) },
          token
        ),
      update: (id: number, body: UpdatePatternDTO, token?: string) =>
        apiRequest<SuspiciousPattern>(
          `/spam/patterns/${id}`,
          { method: 'PATCH', body: JSON.stringify(body) },
          token
        ),
      delete: (id: number, token?: string) =>
        apiRequest<void>(
          `/spam/patterns/${id}`,
          { method: 'DELETE' },
          token
        ),
    },
  },

  notifications: {
    settings: {
      global: {
        get: (token?: string) =>
          apiRequest<GlobalNotifSettingsDTO>(
            '/notifications/settings/global',
            { method: 'GET' },
            token
          ),
        update: (body: Partial<GlobalNotifSettingsDTO>, token?: string) =>
          apiRequest<GlobalNotifSettingsDTO>(
            '/notifications/settings/global',
            { method: 'PUT', body: JSON.stringify(body) },
            token
          ),
      },
    },
    preferences: {
      get: (lawyerId: number, token?: string) =>
        apiRequest<NotificationPreferenceDTO[]>(
          `/notifications/preferences/${lawyerId}`,
          { method: 'GET' },
          token
        ),
      update: (
        lawyerId: number,
        prefs: Array<Partial<NotificationPreferenceDTO> & { notification_type: string }>,
        token?: string
      ) =>
        apiRequest<NotificationPreferenceDTO[]>(
          `/notifications/preferences/${lawyerId}`,
          { method: 'PUT', body: JSON.stringify({ preferences: prefs }) },
          token
        ),
    },
    history: (filters?: NotificationHistoryFilters, token?: string) =>
      apiRequest<Paginated<NotificationDTO>>(
        `/notifications/history/all${buildQuery(filters as Record<string, unknown>)}`,
        { method: 'GET' },
        token
      ),
    schedule: (body: ScheduleNotificationDTO, token?: string) =>
      apiRequest<NotificationDTO>(
        '/notifications/schedule',
        { method: 'POST', body: JSON.stringify(body) },
        token
      ),
    test: (body?: { lawyer_id?: number }, token?: string) =>
      apiRequest<NotificationDTO>(
        '/notifications/test',
        { method: 'POST', body: JSON.stringify(body || {}) },
        token
      ),
  },

  // ── Firm-level admin (Activity 25) ──────────────────────────────────────
  // Rutas /firms/* sin prefijo global. Todos requieren JWT Bearer (lo inyecta
  // resolveToken vía la cookie currentUser). El backend re-verifica rol/flags.
  firms: {
    // GET /firms/me — cualquier lawyer. `firm` puede ser null (pre-backfill).
    me: (token?: string) =>
      apiRequest<MyFirmResponse>('/firms/me', { method: 'GET' }, token),

    // GET /firms/me/lawyers — firm admin. Array crudo (id DESC, sin password).
    listLawyers: (token?: string) =>
      apiRequest<FirmLawyer[]>('/firms/me/lawyers', { method: 'GET' }, token),

    // POST /firms/me/lawyers — firm admin. Nace verified + active.
    addLawyer: (body: AddFirmLawyerBody, token?: string) =>
      apiRequest<FirmLawyer>(
        '/firms/me/lawyers',
        { method: 'POST', body: JSON.stringify(body) },
        token
      ),

    // PATCH /firms/me/admins — grant/revoke firm admin. 403 al quitar el último.
    setAdmin: (body: SetFirmAdminsBody, token?: string) =>
      apiRequest<SetFirmAdminsResult>(
        '/firms/me/admins',
        { method: 'PATCH', body: JSON.stringify(body) },
        token
      ),

    // PATCH /firms/me/settings — shallow-merge sobre el blob existente.
    updateSettings: (body: Partial<FirmSettings>, token?: string) =>
      apiRequest<Firm>(
        '/firms/me/settings',
        { method: 'PATCH', body: JSON.stringify(body) },
        token
      ),

    // GET /firms/me/leads — firm admin. Paginado server-side (limit/offset/total).
    leads: (query?: FirmLeadsQuery, token?: string) =>
      apiRequest<Paginated<LeadDTO>>(
        `/firms/me/leads${buildQuery(query as Record<string, unknown>)}`,
        { method: 'GET' },
        token
      ),

    // POST /firms/merge — admin GLOBAL (role.name === 'admin'), NO firm admin.
    merge: (body: MergeFirmsBody, token?: string) =>
      apiRequest<MergeFirmsResult>(
        '/firms/merge',
        { method: 'POST', body: JSON.stringify(body) },
        token
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
