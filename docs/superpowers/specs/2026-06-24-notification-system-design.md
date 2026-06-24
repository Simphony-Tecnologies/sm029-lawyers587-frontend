# Notification System — Design Spec

> Date: 2026-06-24 | Branch: `feat/notification-system` (from `feat/spam-trash-system`)
> Scope: Email notifications via SMTP. SMS enum defined but NOT implemented.
> Approach: Event-Driven + Bull Queues + Cron Summaries (Option A)

---

## 1. Overview

System that sends email notifications to lawyers and admins based on lead lifecycle events, with global admin controls (quiet hours, retry, dedup) and per-lawyer preferences (type toggles, pause/resume, channel selection).

### 5 Notification Types

| Type | Delivery | Trigger mechanism |
|------|----------|-------------------|
| IMMEDIATE | Real-time on event | EventEmitter2 → Bull queue |
| SCHEDULED | At a specific datetime | Bull delayed job |
| DAILY_SUMMARY | Once per day | @nestjs/schedule cron |
| WEEKLY_SUMMARY | Once per week | @nestjs/schedule cron |
| CALENDAR_REMINDER | At lead-specific datetime | Bull delayed job |

### What this system does NOT include

- In-app notifications (bell icon, dropdown) — out of scope
- SMS delivery — enum defined, processor NOT implemented
- Push notifications — out of scope
- Modification to existing 6 CRUD notification endpoints — left untouched

---

## 2. Notification Triggers

### IMMEDIATE triggers

| Event | Source | Recipient(s) |
|-------|--------|---------------|
| `LEAD_ASSIGNED` | `leads.service` → assign/bulk assign | Lawyer who got the lead |
| `LEAD_UNASSIGNED` | `leads.service` → unassign | Lawyer who lost the lead |
| `LEAD_EXPIRED` | `LeadStatusScheduleService` cron | Lawyer who had the lead |
| `LEAD_EXPIRING_SOON` | `LeadStatusScheduleService` cron (<8h) | Lawyer who has the lead |
| `LEAD_STATUS_PROBLEMATIC` | `leads.service` → status change | All admins |
| `LEAD_POOL_NEW` | `leads.service` → POST /leads (if not spam) | Lawyers with matching service_type |
| `LEAD_SPAM_FLAGGED` | `leads.service` → spam check → REVIEW | All admins |
| `LEAD_PULLED` | `leads.service` → pull | All admins |
| `LEAD_RESTORED` | `leads.service` → restore from trash | All admins |
| `BULK_COMPLETED` | `leads.service` → bulk operations | Admin who initiated |

### SCHEDULED trigger

| Event | Source | Recipient |
|-------|--------|-----------|
| `FOLLOW_UP_REMINDER` | Admin/lawyer creates manually via UI | Target lawyer |

Created via: `POST /notifications/schedule` with `{ lawyer_id, lead_id, scheduled_at, message? }`.
Stored as a notification record with `status: PENDING`, `scheduled_at` set.
Bull job scheduled with delay = `scheduled_at - now`.

### DAILY_SUMMARY trigger

Cron job runs daily (default 8:00 AM, configurable via `DEFAULT_REMINDER_POLICY`).
Aggregates for each subscribed lawyer/admin:
- New leads received today
- Leads pending action (ASSIGNED but no activity)
- Leads expiring within 24h
- Leads closed today
- Total active leads count

### WEEKLY_SUMMARY trigger

Cron job runs weekly (Monday, configurable time).
Aggregates for each subscribed lawyer/admin:
- Leads received this week
- Leads assigned / closed / lost / expired this week
- Conversion rate (closed / total assigned)
- Top service types by volume

### CALENDAR_REMINDER trigger

| Event | Source | Recipient |
|-------|--------|-----------|
| `CALENDAR_REMINDER` | Created via UI, tied to a lead | Target lawyer |

Same mechanism as SCHEDULED but semantically tied to a lead event (court date, deadline, follow-up).
Created via same endpoint with `type: CALENDAR_REMINDER`.

---

## 3. Architecture

```
                     EventEmitter2
Leads.Service ────────────emit()──────────┐
Lawyers.Service ──────────emit()──────────┤
LeadStatusSchedule ──────emit()──────────┤
                                          ▼
                              NotificationListener
                              @OnEvent('lead.*')
                              @OnEvent('bulk.*')
                                          │
                                          ▼
                              Creates notification record
                              (status: PENDING)
                                          │
                                          ▼
                              Bull Queue ('notifications')
                              ┌──── immediate: no delay
                              ├──── scheduled: delay = scheduled_at - now
                              └──── calendar: delay = scheduled_at - now
                                          │
                                          ▼
                              NotificationProcessor
                              @Process('send-notification')
                                          │
                              ┌───────────┼───────────┐
                              ▼           ▼           ▼
                         Quiet Hours   Dedup      Preferences
                         Check         Check      Check
                              │           │           │
                              └───────────┼───────────┘
                                          │
                                    Pass all 3?
                                    ▼ YES        ▼ NO
                              MailService      Update status
                              .enqueueEmail()  (SKIPPED/DEDUP)
                                    │
                                    ▼
                              Update notification
                              status: SENT
                              sent_at: now()

Summary cron jobs bypass the event system:
  @Cron('0 8 * * *')  → buildDailySummary()  → enqueue per lawyer
  @Cron('0 8 * * 1')  → buildWeeklySummary() → enqueue per lawyer
```

---

## 4. Data Model Changes

### 4.1 Expand `notification` entity (ALTER TABLE — NOT recreate)

New columns added to existing table. All NULLABLE or with DEFAULT to preserve existing rows.

```sql
-- New columns (all with safe defaults)
ALTER TABLE notification ADD COLUMN type ENUM('IMMEDIATE','SCHEDULED','DAILY_SUMMARY','WEEKLY_SUMMARY','CALENDAR_REMINDER') NOT NULL DEFAULT 'IMMEDIATE';
ALTER TABLE notification ADD COLUMN event_type VARCHAR(50) NULL;
ALTER TABLE notification ADD COLUMN channel ENUM('EMAIL','SMS','BOTH') NOT NULL DEFAULT 'EMAIL';
ALTER TABLE notification ADD COLUMN status ENUM('PENDING','QUEUED','SENT','FAILED','DEDUPLICATED','SKIPPED_QUIET_HOURS','SKIPPED_PREFERENCE') NOT NULL DEFAULT 'SENT';
ALTER TABLE notification ADD COLUMN entity_type VARCHAR(50) NULL;
ALTER TABLE notification ADD COLUMN entity_id INT NULL;
ALTER TABLE notification ADD COLUMN scheduled_at DATETIME NULL;
ALTER TABLE notification ADD COLUMN sent_at DATETIME NULL;
ALTER TABLE notification ADD COLUMN retry_count INT NOT NULL DEFAULT 0;
ALTER TABLE notification ADD COLUMN error_message TEXT NULL;
ALTER TABLE notification ADD COLUMN dedup_key VARCHAR(255) NULL;

-- Index for dedup lookups
CREATE INDEX idx_notification_dedup ON notification(dedup_key, created_at);
-- Index for history queries
CREATE INDEX idx_notification_history ON notification(lawyer_id, type, status, created_at);
```

Existing rows get `type=IMMEDIATE`, `status=SENT`, `channel=EMAIL` — safe defaults that match their current semantics.

### 4.2 New entity: `notification_preference`

```sql
CREATE TABLE notification_preference (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lawyer_id INT NOT NULL,
  notification_type ENUM('IMMEDIATE','SCHEDULED','DAILY_SUMMARY','WEEKLY_SUMMARY','CALENDAR_REMINDER') NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  channel ENUM('EMAIL','SMS','BOTH') NOT NULL DEFAULT 'EMAIL',
  is_paused BOOLEAN NOT NULL DEFAULT FALSE,
  paused_until DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (lawyer_id) REFERENCES lawyer(id) ON DELETE CASCADE,
  UNIQUE KEY uq_lawyer_notif_type (lawyer_id, notification_type)
);
```

When a lawyer has NO preferences row for a type → use global defaults (type enabled, channel EMAIL, not paused).

### 4.3 Global settings via `configurations` table

| key | default value | description |
|-----|---------------|-------------|
| `NOTIF_QUIET_HOURS_START` | `22:00` | Start of quiet hours (HH:mm) |
| `NOTIF_QUIET_HOURS_END` | `07:00` | End of quiet hours (HH:mm) |
| `NOTIF_RETRIES` | `3` | Max retry attempts |
| `NOTIF_BACKOFF_MS` | `60000` | Backoff between retries (ms) |
| `NOTIF_DEDUP_MINUTES` | `30` | Dedup window (minutes) |
| `DEFAULT_REMINDER_POLICY` | `immediate` | Default reminder policy for new lawyers |
| `NOTIF_DAILY_SUMMARY_TIME` | `08:00` | Daily summary send time (HH:mm) |
| `NOTIF_WEEKLY_SUMMARY_DAY` | `1` | Weekly summary day (1=Mon, 7=Sun) |

**IMPORTANT**: Backend must verify that `configurations.value` column is VARCHAR, not TIMESTAMP. If it's TIMESTAMP, migrate it to VARCHAR(255) first.

---

## 5. New API Endpoints

All new endpoints require JWT auth (JwtAuthGuard).

### 5.1 Global Settings (admin only)

```
GET  /notifications/settings/global
Response: { success, data: { quiet_hours_start, quiet_hours_end, retries, backoff_ms, dedup_minutes, default_reminder_policy, daily_summary_time, weekly_summary_day } }

PUT  /notifications/settings/global
Body: Partial<GlobalSettings> — only send fields to update
Response: { success, data: updated settings object }
```

Implementation: Read/write from `configurations` table using existing `ConfigurationService`. Map keys to/from the response object.

### 5.2 Lawyer Preferences

```
GET  /notifications/preferences/:lawyerId
Response: { success, data: NotificationPreference[] }
  — Returns 5 rows (one per type). If no row exists for a type, return default: { type, enabled: true, channel: 'EMAIL', is_paused: false }

PUT  /notifications/preferences/:lawyerId
Body: { preferences: Array<{ notification_type, enabled?, channel?, is_paused?, paused_until? }> }
Response: { success, data: updated preferences }
  — Upsert: create if not exists, update if exists
```

### 5.3 Notification History

```
GET  /notifications/history
Query: ?lawyer_id, type, status, event_type, date_from, date_to, limit (default 50), offset (default 0)
Response: { success, data: { data: Notification[], total: number } }
  — Paginated, sorted by created_at DESC
```

### 5.4 Schedule Notification

```
POST /notifications/schedule
Body: { lawyer_id, lead_id?, type: 'SCHEDULED' | 'CALENDAR_REMINDER', scheduled_at: ISO datetime, message: string }
Response: { success, data: created notification record }
  — Creates notification with status PENDING
  — Enqueues Bull job with delay = scheduled_at - now
```

### 5.5 Test Notification

```
POST /notifications/test
Body: { lawyer_id? } — if omitted, sends to requesting user
Response: { success, message: 'Test notification queued' }
  — Sends a test email to verify SMTP configuration
```

---

## 6. Processing Logic (Backend)

### 6.1 Deduplication

```
dedup_key = MD5(event_type + ':' + entity_id + ':' + lawyer_id)
```

Before processing, query:
```sql
SELECT COUNT(*) FROM notification
WHERE dedup_key = ? AND status = 'SENT'
AND created_at > NOW() - INTERVAL ? MINUTE
```
If count > 0 → set status `DEDUPLICATED`, skip sending, log event.

### 6.2 Quiet Hours

Read `NOTIF_QUIET_HOURS_START` and `NOTIF_QUIET_HOURS_END` from configurations.
If current time is within quiet hours:
- For IMMEDIATE: re-enqueue Bull job with delay until quiet hours end
- For SCHEDULED/CALENDAR: only if scheduled_at falls in quiet hours, delay to end
- For SUMMARIES: not affected (they run at their configured time)

Update notification status to `SKIPPED_QUIET_HOURS` temporarily until re-processed.

### 6.3 Preference Check

```typescript
const pref = await prefRepo.findOne({ lawyer_id, notification_type: notif.type });
// If no preference exists → use defaults (enabled, EMAIL, not paused)
if (pref && !pref.enabled) → status = 'SKIPPED_PREFERENCE'
if (pref && pref.is_paused && (!pref.paused_until || pref.paused_until > now)) → status = 'SKIPPED_PREFERENCE'
if (pref?.channel === 'SMS') → skip (SMS not implemented)
```

### 6.4 Retry Logic

Bull job options:
```typescript
{
  attempts: configService.get('NOTIF_RETRIES') || 3,
  backoff: {
    type: 'fixed',
    delay: configService.get('NOTIF_BACKOFF_MS') || 60000,
  },
}
```

On failure: Bull retries automatically. On final failure: update notification status to `FAILED`, save error_message.

---

## 7. Frontend Changes

### 7.1 Types (`src/types/api.types.ts`)

```typescript
// Enums
type NotificationType = 'IMMEDIATE' | 'SCHEDULED' | 'DAILY_SUMMARY' | 'WEEKLY_SUMMARY' | 'CALENDAR_REMINDER';
type NotificationChannel = 'EMAIL' | 'SMS' | 'BOTH';
type NotificationStatus = 'PENDING' | 'QUEUED' | 'SENT' | 'FAILED' | 'DEDUPLICATED' | 'SKIPPED_QUIET_HOURS' | 'SKIPPED_PREFERENCE';
type NotificationEventType = 'LEAD_ASSIGNED' | 'LEAD_UNASSIGNED' | 'LEAD_EXPIRED' | 'LEAD_EXPIRING_SOON' | 'LEAD_STATUS_PROBLEMATIC' | 'LEAD_POOL_NEW' | 'LEAD_SPAM_FLAGGED' | 'LEAD_PULLED' | 'LEAD_RESTORED' | 'BULK_COMPLETED' | 'FOLLOW_UP_REMINDER' | 'CALENDAR_REMINDER' | 'DAILY_SUMMARY' | 'WEEKLY_SUMMARY';

// DTOs
interface NotificationDTO {
  id: number;
  text: string;
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
  lawyer_id: number;
  created_at: string;
}

interface NotificationPreferenceDTO {
  id?: number;
  lawyer_id: number;
  notification_type: NotificationType;
  enabled: boolean;
  channel: NotificationChannel;
  is_paused: boolean;
  paused_until: string | null;
}

interface GlobalNotifSettingsDTO {
  quiet_hours_start: string; // "HH:mm"
  quiet_hours_end: string;   // "HH:mm"
  retries: number;
  backoff_ms: number;
  dedup_minutes: number;
  default_reminder_policy: string;
  daily_summary_time: string; // "HH:mm"
  weekly_summary_day: number; // 1-7
}

interface NotificationHistoryFilters {
  lawyer_id?: number;
  type?: NotificationType;
  status?: NotificationStatus;
  event_type?: NotificationEventType;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}
```

### 7.2 API Service (`src/services/database.ts`)

Add to `api` namespace:
```typescript
notifications: {
  settings: {
    global: {
      get: (token?) => apiRequest<GlobalNotifSettingsDTO>('/notifications/settings/global', { method: 'GET' }, token),
      update: (body: Partial<GlobalNotifSettingsDTO>, token?) => apiRequest<GlobalNotifSettingsDTO>('/notifications/settings/global', { method: 'PUT', body: JSON.stringify(body) }, token),
    },
  },
  preferences: {
    get: (lawyerId: number, token?) => apiRequest<NotificationPreferenceDTO[]>(`/notifications/preferences/${lawyerId}`, { method: 'GET' }, token),
    update: (lawyerId: number, prefs: Partial<NotificationPreferenceDTO>[], token?) => apiRequest<NotificationPreferenceDTO[]>(`/notifications/preferences/${lawyerId}`, { method: 'PUT', body: JSON.stringify({ preferences: prefs }) }, token),
  },
  history: (filters?: NotificationHistoryFilters, token?) => apiRequest<Paginated<NotificationDTO>>(`/notifications/history${buildQuery(filters as Record<string, unknown>)}`, { method: 'GET' }, token),
  schedule: (body: { lawyer_id: number; lead_id?: number; type: 'SCHEDULED' | 'CALENDAR_REMINDER'; scheduled_at: string; message: string }, token?) => apiRequest<NotificationDTO>('/notifications/schedule', { method: 'POST', body: JSON.stringify(body) }, token),
  test: (body?: { lawyer_id?: number }, token?) => apiRequest<void>('/notifications/test', { method: 'POST', body: JSON.stringify(body || {}) }, token),
},
```

### 7.3 Notification Settings Page (`/notification-settings`)

Admin-only page following SpamSettings.tsx pattern.

**Tab 1: Global Settings**
- Quiet hours: two time inputs (start/end)
- Retry policy: number input (retries) + number input (backoff ms)
- Dedup window: number input (minutes)
- Default reminder policy: select
- Daily summary time: time input
- Weekly summary day: select (Mon-Sun)
- Save button → `api.notifications.settings.global.update()`

**Tab 2: Notification History**
- DataTable with columns: Date, Type (pill), Event, Lawyer, Status (pill), Channel, Retry Count
- Filters: type select, status select, lawyer select, date range
- Pagination via RowsPerPageSelect + Pagination components
- Status pills: SENT=green, FAILED=red, DEDUPLICATED=amber, SKIPPED_*=slate, PENDING=blue

### 7.4 Lawyer Preferences (in `/lawyer-management/[id]`)

Add a collapsible section "Notification Preferences" to IdLawyer.tsx:
- 5 rows, one per notification type
- Each row: type label | enabled toggle | channel select (EMAIL disabled default, SMS grayed out) | pause toggle
- Save button → `api.notifications.preferences.update(lawyerId, prefs)`

### 7.5 Route + Middleware + Sidebar

- `routes.ts`: Add `{ name: 'Notifications', route: '/notification-settings', icon: MdNotifications, rol: ['admin'], group: 'Management' }`
- `middleware.ts`: Add `/notification-settings` to `protectedRoutesAdmin`
- Sidebar renders automatically from routesSidebar

---

## 8. Email Templates

Backend must create HTML templates for each notification type. Minimal, clean, mobile-friendly.

| Template | Variables |
|----------|-----------|
| `lead-assigned.html` | lawyerName, leadCode, leadName, leadService, leadPhone, leadEmail, dashboardUrl |
| `lead-unassigned.html` | lawyerName, leadCode, reason |
| `lead-expired.html` | lawyerName, leadCode, leadName, expiredAt |
| `lead-expiring-soon.html` | lawyerName, leadCode, leadName, expiresAt, hoursLeft |
| `lead-problematic.html` | adminName, leadCode, leadName, lawyerName |
| `lead-pool-new.html` | lawyerName, leadCode, leadService, poolUrl |
| `lead-spam-flagged.html` | adminName, leadCode, spamScore, spamReasons[], reviewUrl |
| `lead-pulled.html` | adminName, leadCode, lawyerName |
| `lead-restored.html` | adminName, leadCode, restoredBy |
| `bulk-completed.html` | adminName, action, total, succeeded, failed, errors[] |
| `follow-up-reminder.html` | lawyerName, leadCode, leadName, message |
| `calendar-reminder.html` | lawyerName, leadCode, leadName, message, reminderDate |
| `daily-summary.html` | recipientName, date, newLeads, pendingLeads, expiringLeads, closedLeads, totalActive |
| `weekly-summary.html` | recipientName, weekRange, received, assigned, closed, lost, expired, conversionRate, topServices[] |
| `test-notification.html` | recipientName, timestamp |

---

## 9. Execution Order (Dependencies)

```
BACKEND PHASE 1 — Data Foundation (MUST complete before frontend starts)
  1. Verify configurations.value column type (must be VARCHAR)
  2. ALTER TABLE notification — add new columns (safe defaults)
  3. CREATE TABLE notification_preference
  4. Seed default global settings in configurations table
  5. Create DTOs: GlobalSettingsDto, NotificationPreferenceDto, NotificationHistoryQueryDto, ScheduleNotificationDto
  6. Implement endpoints: GET/PUT global settings, GET/PUT preferences, GET history, POST schedule, POST test
  7. Write basic tests for new endpoints

FRONTEND (can start once Phase 1 endpoints are deployed/testable)
  8. Types in api.types.ts
  9. API service methods in database.ts
  10. Notification Settings page (Global Settings tab + History tab)
  11. Lawyer preferences section in IdLawyer.tsx
  12. Route + middleware + sidebar integration

BACKEND PHASE 2 — Event System (independent of frontend)
  13. Define event constants (event names)
  14. Add eventEmitter.emit() calls in leads.service.ts, LeadStatusScheduleService
  15. Create NotificationListener (@OnEvent handlers)
  16. Create NotificationProcessor (Bull @Process handler)
  17. Implement dedup logic
  18. Implement quiet hours logic
  19. Implement preference checking
  20. Create email templates (all 15)
  21. Integration tests

BACKEND PHASE 3 — Summaries (independent, after Phase 2)
  22. Daily summary cron job + aggregation queries
  23. Weekly summary cron job + aggregation queries
  24. Calendar reminder: scheduled Bull jobs with delay
```

---

## 10. Risk Checklist

| Risk | Mitigation |
|------|-----------|
| ALTER TABLE on notification breaks existing data | All new columns NULLABLE or with DEFAULT matching current semantics |
| SMTP overload from pool notifications (N lawyers) | Bull rate limit already 5/sec. Pool notifications are batched |
| Dedup window too aggressive | Default 30 min, configurable by admin |
| Quiet hours timezone mismatch | Store as HH:mm, process in server timezone. Document this limitation |
| configurations.value is TIMESTAMP not VARCHAR | Backend must verify and migrate if needed BEFORE any other change |
| Existing 6 notification endpoints break | DO NOT touch them. New endpoints use different paths |
