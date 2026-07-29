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
  | 'WAITING_ON_CLIENT'
  | 'REVIEW'
  | 'TRASHED';

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

// Canal de adquisición derivado por el backend desde las señales de atribución
// (utm/referrer/gclid). Debe coincidir 1:1 con el union del backend.
export type Channel =
  | 'google_ads'
  | 'google_organic'
  | 'bing_ads'
  | 'search_organic'
  | 'meta_ads'
  | 'meta_social'
  | 'social'
  | 'email'
  | 'referral'
  | 'direct'
  | 'import'
  | 'unknown';

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
  trashed_at?: string | null;
  previous_status?: LeadStatus | null;
  spam_score?: number;
  spam_reasons?: string[] | null;
  // Atribución de marketing: `channel` derivado por el backend + señales crudas.
  // Opcionales (backwards-compatible con leads históricos sin captura).
  channel?: Channel;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  referrer_url?: string | null;
  gclid?: string | null;
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

// ─── Spam / Trash ───────────────────────────────────────────────────────────

export interface TrashLeadDTO {
  comment?: string;
}

export interface BlacklistEntry {
  id: number;
  type: 'email' | 'domain';
  value: string;
  created_at: string;
}

export interface CreateBlacklistDTO {
  type: 'email' | 'domain';
  value: string;
}

export interface SuspiciousPattern {
  id: number;
  field_name: 'full_name' | 'email' | 'description' | 'number';
  pattern: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface CreatePatternDTO {
  field_name: SuspiciousPattern['field_name'];
  pattern: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdatePatternDTO {
  field_name?: SuspiciousPattern['field_name'];
  pattern?: string;
  description?: string;
  is_active?: boolean;
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

// ─── Notifications ──────────────────────────────────────────────────────────

export type NotificationType =
  | 'IMMEDIATE'
  | 'SCHEDULED'
  | 'DAILY_SUMMARY'
  | 'WEEKLY_SUMMARY'
  | 'CALENDAR_REMINDER';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'BOTH';

export type NotificationStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'SENT'
  | 'FAILED'
  | 'DEDUPLICATED'
  | 'SKIPPED_QUIET_HOURS'
  | 'SKIPPED_PREFERENCE';

export type NotificationEventType =
  | 'LEAD_ASSIGNED'
  | 'LEAD_UNASSIGNED'
  | 'LEAD_EXPIRED'
  | 'LEAD_EXPIRING_SOON'
  | 'LEAD_STATUS_PROBLEMATIC'
  | 'LEAD_POOL_NEW'
  | 'LEAD_SPAM_FLAGGED'
  | 'LEAD_PULLED'
  | 'LEAD_RESTORED'
  | 'LEAD_CLOSED'
  | 'LEAD_DISABLED'
  | 'BULK_COMPLETED'
  | 'FOLLOW_UP_REMINDER'
  | 'CALENDAR_REMINDER'
  | 'DAILY_SUMMARY'
  | 'WEEKLY_SUMMARY'
  | 'TEST';

export interface NotificationDTO {
  id: number;
  text: string;
  is_active: boolean;
  type: NotificationType;
  event_type: NotificationEventType | null;
  channel: NotificationChannel;
  status: NotificationStatus;
  entity_type: string | null;
  entity_id: number | null;
  scheduled_at: string | null;
  sent_at: string | null;
  retry_count: number;
  error_message: string | null;
  dedup_key: string | null;
  lawyer_id: number;
  created_at: string;
  updated_at: string;
  lawyer?: LawyerRef;
}

export interface NotificationPreferenceDTO {
  id?: number;
  lawyer_id: number;
  notification_type: NotificationType;
  enabled: boolean;
  channel: NotificationChannel;
  is_paused: boolean;
  paused_until: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GlobalNotifSettingsDTO {
  quiet_hours_start: string;
  quiet_hours_end: string;
  retries: number;
  backoff_ms: number;
  dedup_minutes: number;
  default_reminder_policy: string;
  daily_summary_time: string;
  weekly_summary_day: number;
}

export interface NotificationHistoryFilters {
  lawyer_id?: number;
  type?: NotificationType;
  status?: NotificationStatus;
  event_type?: NotificationEventType;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface ScheduleNotificationDTO {
  lawyer_id: number;
  lead_id?: number;
  type: 'SCHEDULED' | 'CALENDAR_REMINDER';
  scheduled_at: string;
  message: string;
}

// ─── Analytics / Metrics ─────────────────────────────────────────────────────
// Contrato fiel al backend. El sobre GenericResponse<T> lo desenvuelve
// apiRequest() → ApiResult<T>, por eso NO se tipa aquí.

export interface MetricRange {
  from: string; // ISO UTC
  to: string; // ISO UTC
  previous_from: string; // ISO UTC
  previous_to: string; // ISO UTC
}

export type Trend = 'up' | 'down' | 'flat';

// GET /leads/metrics/widgets
export type WidgetKey = 'nuevos' | 'en_proceso' | 'contactados' | 'conversiones';

export interface WidgetMetric {
  count: number;
  previous: number;
  delta: number;
  delta_pct: number | null; // null si previous=0 y count>0 (N/A)
  trend: Trend;
}

export interface WidgetMetricsResponse {
  range: MetricRange;
  widgets: Record<WidgetKey, WidgetMetric>;
}

export interface MetricsDateFilters {
  date_from?: string;
  date_to?: string;
}

// GET /lawyers/metrics/performance
export type PerformanceSortBy =
  | 'conversion_rate'
  | 'closed'
  | 'taken'
  | 'lost'
  | 'active_assigned';

export interface PerformanceDelta {
  taken: number;
  closed: number;
  lost: number;
  conversion_rate: number | null; // Δ en puntos %, null si algún período tenía taken=0
  trend: Trend;
}

export interface LawyerPerformanceRow {
  lawyer_id: number;
  name: string;
  email: string;
  taken: number;
  closed: number;
  lost: number;
  conversion_rate: number | null; // closed/taken %, null si taken=0
  avg_response_hours: number | null; // asignación → 1ª acción; null si N/A
  active_assigned: number; // snapshot ACTUAL (no depende del rango)
  delta: PerformanceDelta;
}

export interface PerformanceTotals {
  taken: number;
  closed: number;
  lost: number;
  conversion_rate: number | null;
  avg_response_hours: number | null;
  active_assigned: number;
}

export interface LawyerPerformanceResponse {
  range: MetricRange;
  totals: PerformanceTotals;
  lawyers: LawyerPerformanceRow[]; // ya ordenado por sort_by (desc)
  total: number; // # de abogados antes de limit/offset
}

export interface PerformanceFilters extends MetricsDateFilters {
  sort_by?: PerformanceSortBy;
  lawyer_id?: number; // solo admin; backend lo ignora para lawyers
  limit?: number;
  offset?: number;
}

// ── Lawyer signup / verification / onboarding (Activity 24) ───────────────
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type OnboardingStatus = 'pending' | 'completed' | 'skipped';

// Campos que ahora trae el objeto `lawyer` de /auth/login (aditivo).
export interface LawyerNewFields {
  code: string; // ej. "LIC-2026-00042" — referencia visible, NO login
  license_number: string | null;
  license_document_url: string | null; // ruta privada — no es URL pública
  verification_status: VerificationStatus;
  verified_at: string | null; // ISO
  rejection_reason: string | null;
  onboarding_status: OnboardingStatus;
}

// POST /auth/signup — multipart/form-data (todos string + el File).
export interface SignupRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  license_number: string;
  law_firm: string;
  file: File; // el campo DEBE llamarse "file"
}

export interface SignupResponseLawyer {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  code: string; // LIC-2026-#####
  law_firm: string; // ortografía canónica si se auto-vinculó
  verification_status: 'pending';
}

export interface SignupResponse {
  message: string;
  lawyer: SignupResponseLawyer;
}

// Resultado del servicio signup. `messages` conserva el `message` crudo del
// backend: string (409/400 archivo) o string[] (400 validación de campos).
export interface SignupResult {
  success: boolean;
  code: number; // HTTP status; 0 = error de red
  data: SignupResponse | null;
  messages: string | string[];
}

// ── Verification queue (admin) — GET /lawyers/verification/pending (JSON crudo)
export interface VerificationQueueItem {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  code: string;
  law_firm: string;
  license_number: string | null;
  license_document_url: string | null;
  verification_status: VerificationStatus;
  created_at: string;
  role: { id: number; name: string };
}

export type VerificationAction = 'verify' | 'reject';

export interface VerificationActionBody {
  action: VerificationAction;
  reason?: string; // requerido por el backend cuando action === 'reject'
}

// ── Onboarding — GET/PATCH /lawyers/me/onboarding (JSON crudo)
export interface OnboardingVideo {
  id: string;
  embedUrl: string; // youtube.com/embed/<id>
}

export interface OnboardingState {
  status: OnboardingStatus;
  videos: OnboardingVideo[];
}

export type OnboardingAction = 'complete' | 'skip' | 'restart';
