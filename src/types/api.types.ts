// Tipos del API v2 (alineados con new.md)
// Convención: wrapper backend `{ success, data, message?, error? }`
// Listados paginados: `{ data: T[], total: number }` dentro de `data`.

// ─── Enums / unions ──────────────────────────────────────────────────────────

export type LeadStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'IN PROGRESS'
  | 'CLOSED'
  | 'COMPLETED'
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
  /** Fase 1 — firma del abogado (solo en `assigned_lawyer` del Lead DTO). */
  firm_id?: number | null;
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
  // Activity 26 — origen de ingesta (chatbot vs formulario web). `source` (arriba,
  // requerido) es el valor crudo; `source_label` lo deriva el backend SOLO en el
  // LIST DTO (ausente en GET /leads/:id → derivar client-side con sourceLabel()).
  source_label?: string;
  // Fase 1 (contrato A2) — opcionales hasta que el backend los exponga.
  /** Urgencia IA 1–5 (chatbot_conversations.ai_urgency_level); null si no hay. */
  ai_urgency?: number | null;
  /** ISO. Fecha en que el abogado tomó/recibió el lead (leads_assigned.assigned_at). */
  pull_date?: string | null;
}

/** Score del lead (contrato A1): high = urgencia 4–5, medium = 3, low = 1–2, spam = spam_score ≥ 1. */
export type LeadScore = 'high' | 'medium' | 'low' | 'spam';

// Los multivalor (status, service, source, assigned_to, firm_id, score) aceptan
// lista separada por comas (contrato A1).
export interface LeadFilters {
  search?: string;
  status?: LeadStatus | string;
  service?: string;
  source?: string;
  date_from?: string;
  date_to?: string;
  assigned_to?: number | string;
  firm_id?: number | string;
  pull_from?: string;
  pull_to?: string;
  score?: LeadScore | string;
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
  // Fase 1 (contrato A4): null si nunca se editó.
  edited_at?: string | null;
}

export interface CreateCommentDTO {
  content: string;
  note_type?: NoteType;
}

/** PATCH /leads/:leadId/comments/:commentId — solo el autor (contrato A4). */
export interface UpdateCommentDTO {
  content: string;
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
      // null en la entrada sintética "Lead received via …" (Fase 4, sin fila en audit_log).
      id: number | null;
      timestamp: string;
      action_type: ActionType;
      // null en eventos de sistema (p. ej. "Lead received via …", Fase 4).
      actor: LawyerRef | null;
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
      // Fase 1 (contrato A4): autor del comentario y fecha de edición.
      author_id?: number | null;
      actor_id?: number | null;
      edited_at?: string | null;
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

/** Fase 2 (2.5) — horas antes de expirar el lead; `immediate` es el valor legado (= 8). */
export type DefaultReminderPolicy = 'disabled' | '4' | '8' | '12' | '24' | 'immediate';

export interface GlobalNotifSettingsDTO {
  quiet_hours_start: string;
  quiet_hours_end: string;
  retries: number;
  backoff_ms: number;
  dedup_minutes: number;
  /** Ver `DefaultReminderPolicy`. */
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

/** Fase 2 (2.4) — recordatorio de calendario pendiente (GET /notifications/reminders). */
export interface CalendarReminderDTO {
  id: number;
  lawyer: LawyerRef;
  message: string;
  scheduled_at: string;
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
  | 'active_assigned'
  | 'avg_days_to_convert';

export interface PerformanceDelta {
  taken: number;
  closed: number;
  lost: number;
  conversion_rate: number | null; // Δ en puntos %, null si algún período tenía taken=0
  avg_days_to_convert: number | null; // Δ en días, null si algún período no tuvo conversiones
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
  avg_days_to_convert: number | null; // días promedio hasta la conversión; null si N/A
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

// Fase 3 — período de calendario en curso (APP_TIMEZONE), resuelto por el backend.
export type MetricsPeriod = 'month' | 'quarter' | 'year';

// GET /leads/metrics/sources (solo admin)
export type SourceAnalysisKey = 'chatbot' | 'web_form';

export interface SourceFunnel {
  captured: number; // leads con entry date en el período (sin REVIEW/ARCHIVED/TRASHED)
  converted: number; // de esos, status actual CLOSED (Retained)
  conversion_rate: number | null; // % con 1 decimal; null si captured=0
}

export interface SourceFunnelRow extends SourceFunnel {
  source: SourceAnalysisKey;
  label: string;
}

export interface SourceAnalysisResponse {
  period: MetricsPeriod;
  from: string; // ISO
  to: string; // ISO
  sources: SourceFunnelRow[];
  total: SourceFunnel;
}

// GET /leads/metrics/aging (solo admin)
export type AgingKey = 'new' | 'in_progress' | 'contacted';

export interface AgingRow {
  key: AgingKey;
  label: string;
  count: number; // intervalos medidos que terminaron en el período
  avg_days: number | null; // 1 decimal; null si count=0
  p50_days: number | null;
  p90_days: number | null;
}

export interface AgingReportResponse {
  period: MetricsPeriod;
  from: string; // ISO
  to: string; // ISO
  rows: AgingRow[];
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

// ── Firm-level admin (Activity 25) — @Controller('firms'), JWT Bearer ─────────
// Respuestas JSON crudas (sin wrapper GenericResponse); apiRequest() las
// desenvuelve igual porque unwrapApi hace `body?.data ?? body`.

export type FirmStatus = 'active' | 'merged';

export interface FirmSettings {
  notifications?: Record<string, unknown>;
  templates?: Record<string, unknown>;
}

export interface Firm {
  id: number;
  name: string;
  normalized_name: string;
  settings: FirmSettings | null;
  status: FirmStatus;
  merged_into_firm_id: number | null;
  created_at: string; // ISO
  updated_at: string; // ISO
}

// Miembro de la firma: lawyer sin password, con role. Reutiliza los campos
// nuevos de A25 sobre la referencia de lawyer.
export interface FirmLawyer extends LawyerRef {
  phone: string;
  code: string;
  is_active: boolean;
  role_id: number;
  role?: { id: number; name: string };
  law_firm: string;
  firm_id: number | null;
  is_firm_admin: boolean;
}

export interface MyFirmResponse {
  firm: Firm | null; // null si el lawyer no está ligado a una firma (pre-backfill)
  member_count: number;
  admins: number[]; // ids de lawyers con is_firm_admin=true
}

// POST /firms/me/lawyers — el firm admin avala; nace verified + active.
export interface AddFirmLawyerBody {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string; // min 6
}

// PATCH /firms/me/admins — grant/revoke. Nunca deja la firma sin admins.
export interface SetFirmAdminsBody {
  lawyerId: number;
  is_admin: boolean;
}

export interface SetFirmAdminsResult {
  lawyerId: number;
  is_admin: boolean;
}

// GET /firms/me/leads — reutiliza el paginado/filtros de /leads (assigned-only).
export interface FirmLeadsQuery {
  search?: string;
  status?: LeadStatus | string;
  service?: string;
  source?: string;
  date_from?: string;
  date_to?: string;
  assigned_to?: number | string;
  score?: LeadScore | string;
  limit?: number;
  offset?: number;
}

// GET /firms/me/reports — firm admin (Fase 4). Métricas del dashboard acotadas
// a la firma. Mismas fechas que /lawyers/metrics/performance (sin fechas, 30 días).
export type FirmReportsQuery = MetricsDateFilters;

export interface FirmReportsResponse {
  firm: { id: number; name: string };
  from: string; // ISO
  to: string; // ISO
  /** Snapshot: leads con asignación vigente a abogados de la firma, por status actual. */
  status_counts: Partial<Record<LeadStatus, number>>;
  /** Mismas reglas que "Leads Received" y "Clients Retained" del dashboard. */
  received: number;
  retained: number;
  /** Ranking de los abogados de la firma (misma fila que /lawyers/metrics/performance). */
  lawyers: LawyerPerformanceRow[];
}

// GET /firms — admin global. Firmas con su conteo de miembros (JSON crudo).
export interface FirmListItem extends Firm {
  member_count: number;
}

// GET /service_types — catálogo de áreas de derecho.
export interface ServiceType {
  id: number;
  name: string;
}

// POST /firms/merge — admin GLOBAL (role.name === 'admin'), no firm admin.
export interface MergeFirmsBody {
  sourceFirmId: number;
  targetFirmId: number;
}

export interface MergeFirmsResult {
  merged: boolean;
  sourceFirmId: number;
  targetFirmId: number;
}

// ── Chatbot settings (Activity 30) ───────────────────────────────────────────
// GET/PATCH /chatbot/settings — admin GLOBAL (backend valida role.name === 'admin').
// Singleton: fila única id=1, auto-sembrada con defaults en la 1ª lectura.
export interface ChatbotSettings {
  id: number;
  enabled: boolean; // pausa/reanuda el bot site-wide
  system_instructions: string | null; // prompt de sistema (≤ 20000)
  services_context: string | null; // contexto de servicios (≤ 20000)
  disclaimer: string | null; // aviso legal (≤ 4000)
  model: string | null; // override de modelo (≤ 60)
  confidence_threshold: number | null; // 0..1 (⚠️ hoy el backend lo lee del env, no de DB)
  updated_at: string; // ISO datetime
}

// PATCH: solo los 6 campos editables. NO enviar id/updated_at ni props extra:
// la validación global (whitelist + forbidNonWhitelisted) responde 400.
export type ChatbotSettingsUpdate = Partial<
  Pick<
    ChatbotSettings,
    | 'enabled'
    | 'system_instructions'
    | 'services_context'
    | 'disclaimer'
    | 'model'
    | 'confidence_threshold'
  >
>;
