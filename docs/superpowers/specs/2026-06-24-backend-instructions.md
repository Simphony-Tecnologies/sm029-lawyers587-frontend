# Backend Instructions — Notification System

> Para: Desarrollador backend (NestJS)
> Fecha: 2026-06-24
> Prioridad: Seguir este orden exacto. No saltar pasos.

---

## ANTES DE TOCAR UNA SOLA LINEA DE CODIGO

### Paso 0: Revisa tu propio contexto

1. **Lee tu modulo `notification/`** completo: entity, service, controller, module. Entiende que ya existe un CRUD basico con 6 endpoints que NO debes modificar.

2. **Lee tu modulo `mail/`** completo: service, processor, module. Entiende como funciona `enqueueEmail()` y el Bull queue `'email'`. Tu nuevo processor va a USAR este servicio, no reemplazarlo.

3. **Lee tu modulo `configuration/`**: entity, service, controller. Entiende como se guardan key-value pairs. Vas a usar este servicio para los global settings.

4. **Lee `leads.service.ts`**: identifica TODOS los metodos que hacen cambios de estado (assign, unassign, status changes, pull, trash, spam flag, bulk operations). Ahi es donde vas a agregar `eventEmitter.emit()` calls.

5. **Lee `LeadStatusScheduleService`** (cron de expiracion): ahi ya se envian emails de warning. Vas a reemplazar esas llamadas directas con eventos.

6. **Verifica el tipo de la columna `configurations.value`**: Si es `TIMESTAMP`, necesitas migrarla a `VARCHAR(255)` ANTES de cualquier otra cosa. Los global settings guardan strings como `"08:00"`, `"3"`, `"immediate"`.

7. **Verifica que no hay nada en staging/PR que toque `notification/`**: No quieres conflictos de merge.

**Solo cuando hayas completado los 7 puntos, empieza la Phase 1.**

---

## PHASE 1: Data Foundation

### 1.1 Verificar y migrar `configurations.value` si es necesario

```typescript
// Si configurations.value es TIMESTAMP:
// Crear migration o bootstrap step que:
// 1. Agrega columna temporal varchar
// 2. Copia datos convertidos
// 3. Dropea columna vieja
// 4. Renombra nueva

// Si ya es VARCHAR → skip. Solo verifica.
```

### 1.2 Expandir entity `Notification`

**NO recrees la entity. Agrega columnas a la existente.**

Archivo: `src/modules/notification/entities/notification.entity.ts`

Agregar estas propiedades a la entity existente:

```typescript
@Column({
  type: 'enum',
  enum: ['IMMEDIATE', 'SCHEDULED', 'DAILY_SUMMARY', 'WEEKLY_SUMMARY', 'CALENDAR_REMINDER'],
  default: 'IMMEDIATE',
})
type: string;

@Column({ type: 'varchar', length: 50, nullable: true })
event_type: string | null;

@Column({
  type: 'enum',
  enum: ['EMAIL', 'SMS', 'BOTH'],
  default: 'EMAIL',
})
channel: string;

@Column({
  type: 'enum',
  enum: ['PENDING', 'QUEUED', 'SENT', 'FAILED', 'DEDUPLICATED', 'SKIPPED_QUIET_HOURS', 'SKIPPED_PREFERENCE'],
  default: 'SENT',
})
status: string;

@Column({ type: 'varchar', length: 50, nullable: true })
entity_type: string | null;

@Column({ type: 'int', nullable: true })
entity_id: number | null;

@Column({ type: 'datetime', nullable: true })
scheduled_at: Date | null;

@Column({ type: 'datetime', nullable: true })
sent_at: Date | null;

@Column({ type: 'int', default: 0 })
retry_count: number;

@Column({ type: 'text', nullable: true })
error_message: string | null;

@Column({ type: 'varchar', length: 255, nullable: true })
dedup_key: string | null;
```

**CRITICO**: El default de `status` es `'SENT'` para que los registros existentes (que ya fueron enviados) no queden en estado inconsistente. El default de `type` es `'IMMEDIATE'` por la misma razon.

Despues de arrancar la app y verificar que `synchronize: true` aplico los cambios, agrega los indices manualmente si TypeORM no los crea:

```sql
CREATE INDEX idx_notification_dedup ON notification(dedup_key, created_at);
CREATE INDEX idx_notification_history ON notification(lawyer_id, type, status, created_at);
```

### 1.3 Crear entity `NotificationPreference`

Archivo nuevo: `src/modules/notification/entities/notification-preference.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Lawyer } from '../../lawyers/entities/lawyer.entity';

@Entity('notification_preference')
export class NotificationPreference {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  lawyer_id: number;

  @Column({
    type: 'enum',
    enum: ['IMMEDIATE', 'SCHEDULED', 'DAILY_SUMMARY', 'WEEKLY_SUMMARY', 'CALENDAR_REMINDER'],
  })
  notification_type: string;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({
    type: 'enum',
    enum: ['EMAIL', 'SMS', 'BOTH'],
    default: 'EMAIL',
  })
  channel: string;

  @Column({ type: 'boolean', default: false })
  is_paused: boolean;

  @Column({ type: 'datetime', nullable: true })
  paused_until: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Lawyer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lawyer_id' })
  lawyer: Lawyer;
}
```

**Registrar** en `notification.module.ts` → `TypeOrmModule.forFeature([Notification, NotificationPreference])`.

### 1.4 Crear DTOs

Archivo: `src/modules/notification/dto/`

```typescript
// global-settings.dto.ts
export class UpdateGlobalSettingsDto {
  quiet_hours_start?: string;  // "HH:mm"
  quiet_hours_end?: string;
  retries?: number;
  backoff_ms?: number;
  dedup_minutes?: number;
  default_reminder_policy?: string;
  daily_summary_time?: string;
  weekly_summary_day?: number;
}

// notification-preference.dto.ts
export class UpdatePreferencesDto {
  preferences: Array<{
    notification_type: string;
    enabled?: boolean;
    channel?: string;
    is_paused?: boolean;
    paused_until?: string | null;
  }>;
}

// notification-history-query.dto.ts
export class NotificationHistoryQueryDto {
  lawyer_id?: number;
  type?: string;
  status?: string;
  event_type?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;  // default 50
  offset?: number;  // default 0
}

// schedule-notification.dto.ts
export class ScheduleNotificationDto {
  lawyer_id: number;
  lead_id?: number;
  type: 'SCHEDULED' | 'CALENDAR_REMINDER';
  scheduled_at: string;  // ISO datetime
  message: string;
}
```

Agrega class-validator decorators (`@IsOptional()`, `@IsString()`, `@IsNumber()`, etc.) siguiendo el patron de tus otros DTOs.

### 1.5 Seed global settings en `configurations`

En el `OnModuleInit` del `NotificationModule` o en un servicio de bootstrap, inserta los defaults si no existen:

```typescript
const defaults = {
  NOTIF_QUIET_HOURS_START: '22:00',
  NOTIF_QUIET_HOURS_END: '07:00',
  NOTIF_RETRIES: '3',
  NOTIF_BACKOFF_MS: '60000',
  NOTIF_DEDUP_MINUTES: '30',
  DEFAULT_REMINDER_POLICY: 'immediate',
  NOTIF_DAILY_SUMMARY_TIME: '08:00',
  NOTIF_WEEKLY_SUMMARY_DAY: '1',
};

for (const [key, value] of Object.entries(defaults)) {
  const exists = await this.configRepo.findOne({ where: { key } });
  if (!exists) {
    await this.configRepo.save({ key, value });
  }
}
```

### 1.6 Implementar nuevos endpoints

Agregar a `notification.controller.ts` (o crear un segundo controller `notification-settings.controller.ts` si prefieres separar):

```
@UseGuards(JwtAuthGuard)

GET  /notifications/settings/global
PUT  /notifications/settings/global
GET  /notifications/preferences/:lawyerId
PUT  /notifications/preferences/:lawyerId
GET  /notifications/history
POST /notifications/schedule
POST /notifications/test
```

**NO modifiques los 6 endpoints CRUD existentes** (POST, GET all, GET by id, GET by lawyer, PUT, DELETE). Dejalos exactamente como estan.

Implementacion del service:

- **Global settings GET**: Lee las 8 keys de `configurations`, mapea a objeto
- **Global settings PUT**: Actualiza solo las keys enviadas en el body
- **Preferences GET**: Busca las 5 rows del lawyer. Si faltan, retorna defaults
- **Preferences PUT**: Upsert (findOne → update or create) por cada item del array
- **History GET**: Query con filtros + paginacion, ORDER BY created_at DESC
- **Schedule POST**: Crea notification record con status PENDING, scheduled_at set. (El Bull job se encola en Phase 2)
- **Test POST**: Crea notification + llama a MailService.enqueueEmail() directamente con template de test

### 1.7 Tests basicos

Un test por endpoint nuevo. Verifica:
- Global settings GET retorna los 8 campos
- Global settings PUT actualiza parcialmente
- Preferences GET retorna 5 items (defaults si no existen)
- Preferences PUT crea/actualiza correctamente
- History GET filtra y pagina
- Schedule POST crea record con status PENDING
- Test POST encola email

**CHECKPOINT: Phase 1 completa cuando los 7 endpoints estan funcionando y testeados. El frontend puede empezar a consumirlos.**

---

## PHASE 2: Event System

### 2.1 Definir constantes de eventos

Archivo nuevo: `src/modules/notification/constants/notification-events.ts`

```typescript
export const NOTIFICATION_EVENTS = {
  LEAD_ASSIGNED: 'lead.assigned',
  LEAD_UNASSIGNED: 'lead.unassigned',
  LEAD_EXPIRED: 'lead.expired',
  LEAD_EXPIRING_SOON: 'lead.expiring_soon',
  LEAD_STATUS_PROBLEMATIC: 'lead.status.problematic',
  LEAD_POOL_NEW: 'lead.pool.new',
  LEAD_SPAM_FLAGGED: 'lead.spam.flagged',
  LEAD_PULLED: 'lead.pulled',
  LEAD_RESTORED: 'lead.restored',
  BULK_COMPLETED: 'bulk.completed',
} as const;

export interface NotificationEventPayload {
  event_type: string;
  entity_type: 'lead' | 'lawyer';
  entity_id: number;
  actor_id?: number;       // who triggered the event
  target_lawyer_ids?: number[];  // explicit recipients (for assign, etc.)
  metadata?: Record<string, any>;  // extra data for email template
}
```

### 2.2 Agregar emitters en servicios existentes

**IMPORTANTE**: No modifiques la logica existente. Solo agrega `this.eventEmitter.emit()` DESPUES de que la operacion se complete exitosamente.

En `leads.service.ts`, inyecta `EventEmitter2` y agrega emits:

```typescript
// En el constructor:
constructor(
  // ... existing deps
  private eventEmitter: EventEmitter2,
) {}

// Despues de un assign exitoso:
this.eventEmitter.emit(NOTIFICATION_EVENTS.LEAD_ASSIGNED, {
  event_type: 'LEAD_ASSIGNED',
  entity_type: 'lead',
  entity_id: leadId,
  target_lawyer_ids: [lawyerId],
  metadata: { lead_code: lead.code, lead_name: lead.full_name, service: lead.lawyer_type },
} as NotificationEventPayload);

// Despues de unassign:
this.eventEmitter.emit(NOTIFICATION_EVENTS.LEAD_UNASSIGNED, { ... });

// Despues de status change a PROBLEMATIC:
if (newStatus === 'PROBLEMATIC') {
  this.eventEmitter.emit(NOTIFICATION_EVENTS.LEAD_STATUS_PROBLEMATIC, { ... });
}

// En POST /leads (creacion), si NO fue flagged como spam:
if (lead.status === 'NEW') {
  this.eventEmitter.emit(NOTIFICATION_EVENTS.LEAD_POOL_NEW, {
    event_type: 'LEAD_POOL_NEW',
    entity_type: 'lead',
    entity_id: lead.id,
    metadata: { service: lead.lawyer_type },
  });
}

// Si fue flagged como spam:
if (lead.status === 'REVIEW') {
  this.eventEmitter.emit(NOTIFICATION_EVENTS.LEAD_SPAM_FLAGGED, { ... });
}

// Despues de pull:
this.eventEmitter.emit(NOTIFICATION_EVENTS.LEAD_PULLED, { ... });

// Despues de restore:
this.eventEmitter.emit(NOTIFICATION_EVENTS.LEAD_RESTORED, { ... });

// Despues de bulk operations (al final del metodo):
this.eventEmitter.emit(NOTIFICATION_EVENTS.BULK_COMPLETED, {
  event_type: 'BULK_COMPLETED',
  entity_type: 'lead',
  entity_id: 0, // no specific lead
  actor_id: adminId,
  target_lawyer_ids: [adminId],
  metadata: { action, total, succeeded, failed },
});
```

En `LeadStatusScheduleService`:

```typescript
// Donde ya se envia email de expiration warning:
// REEMPLAZAR la llamada directa a mailService con:
this.eventEmitter.emit(NOTIFICATION_EVENTS.LEAD_EXPIRING_SOON, { ... });

// Donde se marca como EXPIRED:
this.eventEmitter.emit(NOTIFICATION_EVENTS.LEAD_EXPIRED, { ... });
```

### 2.3 Crear NotificationListener

Archivo nuevo: `src/modules/notification/listeners/notification.listener.ts`

```typescript
@Injectable()
export class NotificationListener {
  constructor(
    private notificationService: NotificationService,
    private notificationQueue: InjectQueue('notifications'),
  ) {}

  @OnEvent('lead.assigned')
  async handleLeadAssigned(payload: NotificationEventPayload) {
    for (const lawyerId of payload.target_lawyer_ids) {
      const notif = await this.notificationService.createNotificationRecord({
        lawyer_id: lawyerId,
        text: `Lead ${payload.metadata.lead_code} has been assigned to you`,
        type: 'IMMEDIATE',
        event_type: payload.event_type,
        entity_type: payload.entity_type,
        entity_id: payload.entity_id,
        status: 'QUEUED',
        dedup_key: this.buildDedupKey(payload.event_type, payload.entity_id, lawyerId),
      });
      await this.notificationQueue.add('send-notification', { notificationId: notif.id });
    }
  }

  // Similar handlers for each event...
  // Para LEAD_POOL_NEW: query lawyers con matching service_type → create N notifications
  // Para admins: query all lawyers with admin role → create N notifications

  private buildDedupKey(eventType: string, entityId: number, lawyerId: number): string {
    return require('crypto')
      .createHash('md5')
      .update(`${eventType}:${entityId}:${lawyerId}`)
      .digest('hex');
  }
}
```

### 2.4 Crear NotificationProcessor (Bull)

Archivo nuevo: `src/modules/notification/processors/notification.processor.ts`

Registrar un nuevo Bull queue `'notifications'` en `notification.module.ts`:
```typescript
BullModule.registerQueue({ name: 'notifications' })
```

```typescript
@Processor('notifications')
export class NotificationProcessor {
  @Process('send-notification')
  async handleSendNotification(job: Job<{ notificationId: number }>) {
    const notif = await this.notifRepo.findOne(job.data.notificationId);
    if (!notif || notif.status === 'SENT') return;

    // 1. Quiet hours check
    if (this.isQuietHours()) {
      const delayMs = this.msUntilQuietHoursEnd();
      notif.status = 'SKIPPED_QUIET_HOURS';
      await this.notifRepo.save(notif);
      // Re-enqueue with delay
      await this.notificationQueue.add('send-notification', { notificationId: notif.id }, { delay: delayMs });
      return;
    }

    // 2. Preference check
    const pref = await this.prefRepo.findOne({
      where: { lawyer_id: notif.lawyer_id, notification_type: notif.type },
    });
    if (pref && (!pref.enabled || (pref.is_paused && (!pref.paused_until || pref.paused_until > new Date())))) {
      notif.status = 'SKIPPED_PREFERENCE';
      await this.notifRepo.save(notif);
      return;
    }

    // 3. Dedup check
    if (notif.dedup_key) {
      const dedupMinutes = await this.getConfigValue('NOTIF_DEDUP_MINUTES', 30);
      const duplicate = await this.notifRepo.createQueryBuilder('n')
        .where('n.dedup_key = :key', { key: notif.dedup_key })
        .andWhere('n.status = :status', { status: 'SENT' })
        .andWhere('n.created_at > DATE_SUB(NOW(), INTERVAL :minutes MINUTE)', { minutes: dedupMinutes })
        .andWhere('n.id != :id', { id: notif.id })
        .getCount();
      if (duplicate > 0) {
        notif.status = 'DEDUPLICATED';
        await this.notifRepo.save(notif);
        return;
      }
    }

    // 4. Render template + send
    const lawyer = await this.lawyerRepo.findOne(notif.lawyer_id);
    const html = this.renderTemplate(notif.event_type, { ...notif, lawyerName: lawyer.firstName });
    await this.mailService.enqueueEmail({
      to: lawyer.email,
      subject: this.getSubject(notif.event_type),
      html,
    });

    // 5. Update status
    notif.status = 'SENT';
    notif.sent_at = new Date();
    await this.notifRepo.save(notif);
  }
}
```

Bull job options (configurar en el listener al hacer `queue.add()`):

```typescript
{
  attempts: configService.get('NOTIF_RETRIES') || 3,
  backoff: { type: 'fixed', delay: configService.get('NOTIF_BACKOFF_MS') || 60000 },
  removeOnComplete: true,
  removeOnFail: false, // keep for debugging
}
```

### 2.5 Email Templates

Directorio: `src/modules/notification/templates/`

Crear 15 templates HTML (ver lista en el spec). Usa el mismo estilo que `mail.service.ts` ya usa para password reset.

Crear un `template.service.ts` que:
1. Lee el archivo .html del template
2. Reemplaza `{{variables}}` con valores del payload
3. Retorna el HTML renderizado

---

## PHASE 3: Summaries & Calendar

### 3.1 Daily Summary Cron

En `notification.service.ts` o un servicio dedicado:

```typescript
@Cron('0 8 * * *') // default, pero lee NOTIF_DAILY_SUMMARY_TIME de config
async buildDailySummary() {
  const time = await this.getConfigValue('NOTIF_DAILY_SUMMARY_TIME', '08:00');
  // Verify current time matches configured time (cron runs at 8, check if config changed)

  // Query lawyers/admins subscribed to DAILY_SUMMARY
  const subscribers = await this.getSubscribers('DAILY_SUMMARY');

  for (const lawyer of subscribers) {
    const stats = await this.aggregateDailyStats(lawyer);
    const notif = await this.createNotificationRecord({
      lawyer_id: lawyer.id,
      text: 'Daily Summary',
      type: 'DAILY_SUMMARY',
      event_type: 'DAILY_SUMMARY',
      status: 'QUEUED',
    });
    await this.notificationQueue.add('send-notification', { notificationId: notif.id });
  }
}

private async aggregateDailyStats(lawyer: Lawyer) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  // Query leads created today, pending, expiring in 24h, closed today
  // Return stats object for template
}
```

### 3.2 Weekly Summary Cron

Similar pattern, runs on configured day:

```typescript
@Cron('0 8 * * 1') // default Monday, read NOTIF_WEEKLY_SUMMARY_DAY from config
async buildWeeklySummary() { ... }
```

### 3.3 Calendar/Scheduled Reminders

Ya se crean via `POST /notifications/schedule` en Phase 1.
Ahora agregar el scheduling del Bull job:

```typescript
// En el service, metodo schedule():
async scheduleNotification(dto: ScheduleNotificationDto) {
  const notif = await this.createNotificationRecord({
    lawyer_id: dto.lawyer_id,
    text: dto.message,
    type: dto.type,
    event_type: dto.type === 'SCHEDULED' ? 'FOLLOW_UP_REMINDER' : 'CALENDAR_REMINDER',
    entity_type: dto.lead_id ? 'lead' : null,
    entity_id: dto.lead_id || null,
    scheduled_at: new Date(dto.scheduled_at),
    status: 'PENDING',
  });

  const delayMs = new Date(dto.scheduled_at).getTime() - Date.now();
  if (delayMs > 0) {
    await this.notificationQueue.add(
      'send-notification',
      { notificationId: notif.id },
      { delay: delayMs },
    );
  }

  return notif;
}
```

---

## Resumen de archivos a crear/modificar

### Archivos NUEVOS:
- `src/modules/notification/entities/notification-preference.entity.ts`
- `src/modules/notification/dto/global-settings.dto.ts`
- `src/modules/notification/dto/update-preferences.dto.ts`
- `src/modules/notification/dto/notification-history-query.dto.ts`
- `src/modules/notification/dto/schedule-notification.dto.ts`
- `src/modules/notification/constants/notification-events.ts`
- `src/modules/notification/listeners/notification.listener.ts`
- `src/modules/notification/processors/notification.processor.ts`
- `src/modules/notification/services/template.service.ts`
- `src/modules/notification/templates/*.html` (15 templates)

### Archivos a MODIFICAR (quirurgicamente):
- `src/modules/notification/entities/notification.entity.ts` — agregar columnas
- `src/modules/notification/notification.module.ts` — registrar nuevas entities, Bull queue, listener, processor
- `src/modules/notification/notification.service.ts` — agregar metodos para nuevos endpoints
- `src/modules/notification/notification.controller.ts` — agregar nuevos endpoints (NO tocar los existentes)
- `src/modules/leads/leads.service.ts` — agregar eventEmitter.emit() calls (NO modificar logica existente)
- `src/modules/leads/lead-status-schedule.service.ts` — reemplazar email directo con emit

### Archivos que NO se tocan:
- `src/mail/` — se usa tal cual via `enqueueEmail()`
- `src/modules/notification/` endpoints CRUD existentes — intactos
- `src/modules/auth/` — no cambia
- `src/modules/configuration/` — se usa tal cual via su service
- Cualquier otro modulo no mencionado arriba
