// Tipos del API v2 (alineados con new.md)
// Convención: wrapper backend `{ success, data, message?, error? }`
// Listados paginados: `{ data: T[], total: number }` dentro de `data`.

// ─── Enums / unions ──────────────────────────────────────────────────────────

export type LeadStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'IN PROGRESS'
  | 'CLOSED'
  | 'LOST'
  | 'PROBLEMATIC'
  | 'EXPIRED'
  | 'DISABLED'
  | 'ARCHIVED'
  | 'SEND_BACK'
  | 'WAITING_ON_CLIENT';

export type NoteType = 'internal' | 'client_facing' | 'urgent';

export type ActionType =
  | 'create'
  | 'update'
  | 'delete'
  | 'assign'
  | 'unassign'
  | 'status_change'
  | 'login'
  | 'edit_denied';

export type ExportFormat = 'csv' | 'pdf';

// ─── Sobres genéricos ────────────────────────────────────────────────────────

export interface Paginated<T> {
  data: T[];
  total: number;
}

export interface GenericResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Resultado normalizado que devuelven los métodos del cliente
export interface ApiResult<T> {
  success: boolean;
  code: number;
  data: T | null;
  message?: string;
}

// ─── Referencias compartidas ─────────────────────────────────────────────────

export interface LawyerRef {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
}

// ─── Leads ───────────────────────────────────────────────────────────────────

export interface LeadDTO {
  id: number;
  code: string;
  entry_date: string;
  created_at: string;
  fullName: string;
  email: string;
  phone: string;
  service: string;
  source: string;
  description: string;
  status: LeadStatus;
  assigned_lawyer: LawyerRef | null;
  assigned_lawyer_id: number | null;
  comments?: string;
  updated_at?: string;
}

export interface LeadFilters {
  search?: string;
  status?: LeadStatus | string;
  service?: string;
  source?: string;
  date_from?: string;
  date_to?: string;
  assigned_to?: number;
  limit?: number;
  offset?: number;
}

// ─── Comentarios de lead ─────────────────────────────────────────────────────

export interface LeadComment {
  id: number;
  lead_id: number;
  author_id: number;
  author_role: string;
  content: string;
  note_type: NoteType;
  created_at: string;
  author?: LawyerRef;
}

export interface CreateCommentDTO {
  content: string;
  note_type?: NoteType;
}

export interface CommentFilters {
  note_type?: NoteType;
  limit?: number;
  offset?: number;
}

// ─── Audit log ───────────────────────────────────────────────────────────────

export interface AuditEvent {
  id: number;
  entity_type: 'lead' | 'lawyer';
  entity_id: number;
  actor_id: number;
  actor_role: string;
  action_type: ActionType;
  old_value: any;
  new_value: any;
  timestamp: string;
  source: string;
  comment: string | null;
  actor?: LawyerRef;
}

export type TimelineEntry =
  | {
      type: 'audit';
      id: number;
      timestamp: string;
      action_type: ActionType;
      actor: LawyerRef;
      actor_role?: string;
      old_value: any;
      new_value: any;
      comment: string | null;
    }
  | {
      type: 'comment';
      id: number;
      timestamp: string;
      note_type: NoteType;
      actor: LawyerRef;
      content: string;
    };

export interface TimelineFilters {
  type?: 'audit' | 'comment' | 'all';
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface HistoryFilters {
  action_type?: ActionType;
  actor_id?: number;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

// ─── Asignación / desasignación ──────────────────────────────────────────────

export interface AssignLeadDTO {
  lawyer_id: number;
  comment: string;
}

export interface UnassignLeadDTO {
  status?: LeadStatus;
  comment: string;
}

export interface AssignLeadResult {
  lead_id: number;
  status: LeadStatus;
  assigned_lawyer_id: number | null;
  assigned_lawyer: LawyerRef | null;
}

// ─── Bulk ────────────────────────────────────────────────────────────────────

export interface BulkResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: Array<{ lead_id: number; message: string }>;
}

export interface BulkAssignDTO {
  lead_ids: number[];
  lawyer_id: number;
  comment: string;
}

export interface BulkStatusDTO {
  lead_ids: number[];
  status: LeadStatus;
  comment: string;
}

export interface BulkArchiveDTO {
  lead_ids: number[];
  comment: string;
}

export interface BulkDeleteDTO {
  lead_ids: number[];
  comment: string;
}

// ─── Pool ────────────────────────────────────────────────────────────────────

export interface PoolFilters {
  service?: string;
  limit?: number;
  offset?: number;
}

export interface PullLeadDTO {
  lead_id: number;
  comment?: string;
}

// ─── Lawyers ─────────────────────────────────────────────────────────────────

export interface LawyerListItem {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  is_active: boolean;
  role: { id: number; name: string };
  services: string[];
  active_assigned_leads: number;
  pulled_count: number;
  lost_count: number;
}

export interface LawyerFilters {
  search?: string;
  role_id?: number;
  is_active?: boolean;
  service_type_id?: number;
  limit?: number;
  offset?: number;
}

export interface LawyerStats {
  total: number;
  active: number;
  inactive: number;
  by_role: Array<{ role: string; total: number }>;
  by_service: Array<{ service: string; total: number }>;
}

export interface UpdateLawyerStatusDTO {
  is_active: boolean;
  comment: string;
}

export interface UpdateLawyerPasswordDTO {
  password: string;
  comment: string;
}

export interface LawyerHistorySummary {
  leads_assigned: number;
  leads_unassigned: number;
  status_changes: number;
  profile_updates: number;
  edit_denied: number;
  last_login: string | null;
}

export interface LawyerHistoryResponse {
  summary: LawyerHistorySummary;
  events: Paginated<AuditEvent>;
}
