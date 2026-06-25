# Lawyers Backend — Documentacion Completa de Contexto

> Generado: 2026-06-24 | Branch: `co-fixes` (10 commits ahead of `main`)
> Este archivo sirve como input de contexto para sesiones de desarrollo.

---

## 1. Stack Tecnologico

| Capa | Tecnologia | Version |
|------|-----------|---------|
| Framework | NestJS | 10.x |
| Lenguaje | TypeScript | 5.x |
| ORM | TypeORM | 0.3.20 |
| Base de datos | MySQL | 8.x |
| Cache / Colas | Redis + Bull | redis 4.7 / bull 4.16 |
| Auth | Passport + JWT | passport 0.7 / jwt 10.2 |
| Email | Nodemailer | 6.9 |
| Validacion | class-validator + class-transformer | 0.14 / 0.5 |
| Docs API | Swagger (OpenAPI 3) | 7.4 |
| Cron Jobs | @nestjs/schedule | 4.1 |
| Eventos | @nestjs/event-emitter (EventEmitter2) | 2.0 |
| HTTP Client | @nestjs/axios | 3.0 |
| File Upload | Multer | 1.4.5 |

### Scripts disponibles

```bash
npm run start:dev    # Dev con hot-reload
npm run build        # Compilar
npm run start:prod   # Produccion (node dist/main)
npm run lint         # ESLint con autofix
npm run test         # Jest unit tests
npm run test:e2e     # Jest E2E
```

### Puerto y docs

- API: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/api-docs`
- OpenAPI JSON: `http://localhost:3000/api-docs-json`
- CORS: wildcard (`origin: *`)

---

## 2. Arquitectura

### Patron

Modular NestJS estandar: `Controller → Service → Repository (TypeORM)` con guards, interceptors y decoradores transversales.

### Bases de datos (dual connection)

| Conexion | Nombre | Sync | Uso |
|----------|--------|------|-----|
| `default` | Config env `DATABASE_*` | `synchronize: true` | Tablas propias: roles, lawyers, leads_assigned, notifications, etc. |
| `lawyersPruebaConnection` | Config env `LAWYERS_PRUEBA_*` | `synchronize: false` | Tabla WordPress `wp1w_lawyer_requests` (leads). Cambios SOLO via bootstrap migrations. |

**IMPORTANTE**: La tabla de leads vive en la DB WordPress. `synchronize: false` para no romper columnas de WordPress. Toda migracion va en `leads-bootstrap.service.ts`.

### Variables de entorno

```
# Database principal
DATABASE_HOST, DATABASE_PORT (3306), DATABASE_USERNAME, DATABASE_PASSWORD, DATABASE_NAME

# Database WordPress (leads)
LAWYERS_PRUEBA_DATABASE_HOST, LAWYERS_PRUEBA_DATABASE_PORT (3306),
LAWYERS_PRUEBA_DATABASE_USERNAME, LAWYERS_PRUEBA_DATABASE_PASSWORD, LAWYERS_PRUEBA_DATABASE_NAME

# Email SMTP
SMTP_HOST, SMTP_PORT, EMAIL_USER, EMAIL_PASSWORD

# Redis
REDIS_HOST (localhost), REDIS_PORT (6379)

# JWT
JWT_SECRET

# Password Reset
RESET_LINK (base URL para link de reset)

# Lead Management
SPAM_DUPLICATE_WINDOW_MINUTES (60)
TRASH_RETENTION_DAYS (30)

# File Storage
BASE_URL (http://localhost:3000)
```

---

## 3. Modulos

### Mapa de modulos (~110 archivos fuente)

```
src/
├── main.ts                          # Bootstrap, CORS, Swagger
├── app.module.ts                    # Root module (imports todo)
├── app.controller.ts                # GET / → health check
├── app.service.ts
├── config/configuration.ts          # ConfigModule factory
├── dto/generic-response.dto.ts      # GenericResponse<T> wrapper
├── common/
│   ├── guards/field-permissions.guard.ts      # RBAC por campo
│   ├── interceptors/audit.interceptor.ts      # Audit log automatico
│   ├── decorators/audit-entity.decorator.ts   # @AuditEntity('lead'|'lawyer'|'comment')
│   └── config/field-permissions.config.ts     # Matriz de permisos por rol/campo
├── mail/
│   ├── mail.module.ts               # Bull queue 'email'
│   ├── mail.service.ts              # enqueueEmail(), sendResetPasswordEmail()
│   └── mail.processor.ts            # @Process('sendEmail')
├── shared/
│   ├── export/export-utils.ts       # CSV + PDF export helpers
│   └── storage-archivos/            # File upload a filesystem local
└── modules/
    ├── auth/                        # JWT login, password reset, login history
    ├── lawyers/                     # CRUD abogados + stats + export
    ├── leads/                       # CRUD leads + spam + trash + bulk ops + pool + timeline
    ├── leads-assigned/              # Tabla pivot lead↔lawyer
    ├── comments/                    # Notas sobre leads (internal/client_facing/urgent)
    ├── roles/                       # CRUD roles
    ├── service_types/               # CRUD tipos de servicio
    ├── service-type-lawyers/        # Pivot lawyer↔service_type con max_leads
    ├── configuration/               # Key-value config store
    ├── notification/                # Notificaciones in-app + event listeners
    ├── audit/                       # AuditLog entity + QueryAuditLogDto
    └── spam/                        # Blacklist, heuristics, duplicados, orquestador
```

---

## 4. Respuesta generica

Todos los controllers modernos usan `GenericResponse<T>`:

```typescript
{
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
```

---

## 5. Esquema de Base de Datos

### 5.1 Entidades principales

#### `roles` (default connection)

| Columna | Tipo | Restriccion |
|---------|------|-------------|
| id | int PK auto | |
| name | varchar | NOT NULL |

Relaciones: `1:N → Lawyer`

---

#### `lawyer` (default connection)

| Columna | Tipo | Restriccion |
|---------|------|-------------|
| id | int PK auto | |
| firstName | varchar | NOT NULL |
| lastName | varchar | NOT NULL |
| email | varchar | NOT NULL, UNIQUE |
| phone | varchar | NOT NULL |
| password | varchar | NOT NULL (bcrypt hash) |
| code | varchar | NOT NULL (codigo unico) |
| is_active | boolean | NOT NULL |
| role_id | int FK → roles | NOT NULL |
| law_firm | varchar | NOT NULL |
| notes | varchar | NULLABLE |
| profile_image_url | varchar | NULLABLE |
| pulled_count | int | NOT NULL, DEFAULT 0 |
| lost_count | int | NOT NULL, DEFAULT 0 |
| last_login | timestamp | NULLABLE |
| created_at | timestamp | DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamp | DEFAULT CURRENT_TIMESTAMP |
| deleted_at | timestamp | NULLABLE (soft delete) |

Relaciones:
- `N:1 → Role` (role_id)
- `1:N → LeadsAssigned` (cascade delete)
- `1:N → Notification` (cascade delete)
- `1:N → LawyersServiceType` (cascade delete)

---

#### `wp1w_lawyer_requests` — Leads (lawyersPruebaConnection)

| Columna | Tipo | Restriccion |
|---------|------|-------------|
| id | int PK auto | |
| full_name | text | NOT NULL |
| number | text | NOT NULL (telefono) |
| email | text | NOT NULL |
| status | ENUM(LeadStatus) | NOT NULL, DEFAULT 'NEW' |
| lawyer_type | varchar(255) | NOT NULL (tipo de servicio) |
| description | text | NOT NULL |
| comments | text | NOT NULL |
| source | varchar(20) | NOT NULL, DEFAULT 'web' |
| created_at | datetime | CreateDateColumn |
| updated_at | datetime | NULLABLE |
| expired_at | datetime | NULLABLE |
| trashed_at | datetime | NULLABLE |
| previous_status | varchar(30) | NULLABLE |
| spam_score | tinyint | NOT NULL, DEFAULT 0 |
| spam_reasons | json | NULLABLE |

**Sin relaciones TypeORM directas** (vive en DB separada). La asignacion se maneja via `leads_assigned`.

---

#### `leads_assigned` (default connection)

| Columna | Tipo | Restriccion |
|---------|------|-------------|
| id | int PK auto | |
| lead | int | NULLABLE (ID del lead en otra DB) |
| lawyer_id | int FK → lawyer | NULLABLE |
| comments | text | NULLABLE |

Relaciones: `N:1 → Lawyer`

---

#### `service_type` (default connection)

| Columna | Tipo | Restriccion |
|---------|------|-------------|
| id | int PK auto | |
| name | varchar | NOT NULL |

Relaciones: `1:N → LawyersServiceType`

---

#### `lawyers_service_type` (default connection)

| Columna | Tipo | Restriccion |
|---------|------|-------------|
| id | int PK auto | |
| lawyer_id | int FK → lawyer | NOT NULL |
| service_type_id | int FK → service_type | NOT NULL |
| max_leads | int | NOT NULL |
| deleted_at | timestamp | NULLABLE (soft delete) |

Relaciones: `N:1 → Lawyer`, `N:1 → ServiceType`

---

#### `notification` (default connection)

| Columna | Tipo | Restriccion |
|---------|------|-------------|
| id | int PK auto | |
| text | varchar | NOT NULL |
| is_active | boolean | NOT NULL, DEFAULT true |
| lawyer_id | int FK → lawyer | NOT NULL |
| created_at | timestamp | CreateDateColumn |
| updated_at | timestamp | UpdateDateColumn |

Relaciones: `N:1 → Lawyer`

---

#### `comments` (default connection)

| Columna | Tipo | Restriccion |
|---------|------|-------------|
| id | int PK auto | |
| lead_id | int | NOT NULL (ref a lead en otra DB) |
| author_id | int FK → lawyer | NOT NULL |
| author_role | varchar(50) | NOT NULL |
| content | text | NOT NULL |
| note_type | ENUM('internal','client_facing','urgent') | NOT NULL, DEFAULT 'internal' |
| created_at | timestamp | CreateDateColumn |

Indices: `lead_id`
Relaciones: `N:1 → Lawyer` (cascade delete)

---

#### `configurations` (default connection)

| Columna | Tipo | Restriccion |
|---------|------|-------------|
| id | int PK auto | |
| key | varchar | NOT NULL, UNIQUE |
| value | timestamp | NOT NULL |

---

#### `audit_log` (default connection)

| Columna | Tipo | Restriccion |
|---------|------|-------------|
| id | int PK auto | |
| entity_type | varchar(50) | NOT NULL |
| entity_id | int | NOT NULL |
| actor_id | int FK → lawyer | NULLABLE |
| actor_role | varchar(50) | NULLABLE |
| action_type | ENUM(AuditAction) | NOT NULL |
| old_value | json | NULLABLE |
| new_value | json | NULLABLE |
| timestamp | timestamp | CreateDateColumn (UTC) |
| source | varchar(20) | NOT NULL, DEFAULT 'web' |
| comment | text | NULLABLE |

Indices: `[entity_type, entity_id]`, `actor_id`, `timestamp`
Relaciones: `N:1 → Lawyer` (SET NULL on delete)

---

#### `login_history` (default connection)

| Columna | Tipo | Restriccion |
|---------|------|-------------|
| id | int PK auto | |
| lawyer_id | int FK → lawyer | NOT NULL |
| login_date | timestamp | CreateDateColumn |

Relaciones: `N:1 → Lawyer`

---

#### `spam_blacklist` (default connection)

| Columna | Tipo | Restriccion |
|---------|------|-------------|
| id | int PK auto | |
| type | varchar(10) | NOT NULL ('email' o 'domain') |
| value | varchar(255) | NOT NULL |
| created_at | timestamp | CreateDateColumn |
| created_by | int | NULLABLE |

Unique: `[type, value]`

---

#### `spam_suspicious_patterns` (default connection)

| Columna | Tipo | Restriccion |
|---------|------|-------------|
| id | int PK auto | |
| field_name | varchar(50) | NOT NULL (full_name, email, description, number) |
| pattern | varchar(255) | NOT NULL (substring match, case-insensitive) |
| description | varchar(255) | NULLABLE |
| is_active | boolean | NOT NULL, DEFAULT true |
| created_at | timestamp | CreateDateColumn |

---

### 5.2 Enums

#### LeadStatus

```
NEW, ASSIGNED, IN_PROGRESS*, CLOSED, LOST, PROBLEMATIC,
EXPIRED, DISABLED, ARCHIVED, SEND_BACK, WAITING_ON_CLIENT,
REVIEW, TRASHED
```

*`IN_PROGRESS` se almacena como `'IN PROGRESS'` (con espacio) en la DB.

#### AuditAction

```
CREATE, UPDATE, DELETE, ASSIGN, UNASSIGN, STATUS_CHANGE,
LOGIN, EDIT_DENIED, ARCHIVE, TRASH, RESTORE, PERMANENT_DELETE,
SPAM_FLAGGED, SPAM_OVERRIDE
```

#### NoteType

```
INTERNAL, CLIENT_FACING, URGENT
```

---

## 6. Endpoints Completos

### 6.1 App (Health Check)

| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/` | No | Health check |

---

### 6.2 Auth (`/auth`)

| Metodo | Ruta | Auth | Body/Query | Descripcion |
|--------|------|------|------------|-------------|
| POST | `/auth/login` | No | `LoginDto {email, password}` | Login → devuelve JWT + lawyer |
| GET | `/auth/login-history/:lawyerId` | No | `?take=N` | Historial de login de un lawyer |
| GET | `/auth/login-history` | No | `?take=N` | Historial global de logins |
| POST | `/auth/request-password-reset` | No | `{email}` | Envia email con link de reset |
| POST | `/auth/reset-password` | No | `{token, newPassword}` | Resetea password con token |
| GET | `/auth/send-test-email` | No | — | Envia email de prueba |

**JWT**: Token expira en 60 minutos. Se envia como `Authorization: Bearer <token>`.

---

### 6.3 Lawyers (`/lawyers`)

| Metodo | Ruta | Auth | Guards | Body/Query | Descripcion |
|--------|------|------|--------|------------|-------------|
| POST | `/lawyers` | JWT | JwtAuth | `CreateLawyerDto` | Crear abogado |
| GET | `/lawyers` | JWT | JwtAuth | `?search, role_id, is_active, service_type_id, limit, offset` | Listar con filtros |
| GET | `/lawyers/stats` | JWT | JwtAuth | — | Estadisticas de abogados |
| GET | `/lawyers/export` | JWT | JwtAuth | `?...filtros + format=csv` | Exportar lista |
| GET | `/lawyers/:id` | No | — | — | Detalle de un abogado |
| GET | `/lawyers/:id/history` | JWT | JwtAuth | `?action_type, date_from, date_to, limit, offset` | Audit log del abogado |
| GET | `/lawyers/:id/history/export` | JWT | JwtAuth | `?...filtros + format=csv|pdf` | Exportar audit log |
| PUT | `/lawyers/:id` | JWT | JwtAuth + FieldPermissions | `UpdateLawyerDto` | Actualizar abogado (RBAC por campo) |
| PATCH | `/lawyers/:id/status` | JWT | JwtAuth | `{is_active, comment?}` | Activar/desactivar |
| PATCH | `/lawyers/:id/password` | JWT | JwtAuth | `{password, comment?}` | Cambiar password |
| DELETE | `/lawyers/:id` | No | — | — | Soft delete abogado |
| POST | `/lawyers/upload-profile-image` | No | — | `multipart (file + id)` | Subir imagen de perfil |

---

### 6.4 Leads (`/leads`)

| Metodo | Ruta | Auth | Guards | Body/Query | Descripcion |
|--------|------|------|--------|------------|-------------|
| POST | `/leads` | **No** | — | `CreateLeadDto` | Crear lead (ejecuta spam check) |
| GET | `/leads` | JWT | JwtAuth | `?search, status, service, source, date_from, date_to, assigned_to, limit, offset` | Listar leads (excluye REVIEW y TRASHED) |
| GET | `/leads/review` | JWT | JwtAuth | `?search, limit, offset` | Leads flaggeados por spam (status=REVIEW) |
| GET | `/leads/trash` | JWT | JwtAuth | `?search, limit, offset` | Leads en papelera (status=TRASHED) |
| GET | `/leads/pool` | JWT | JwtAuth | `?service, limit, offset` | Pool de leads no asignados (NEW) |
| GET | `/leads/export` | JWT | JwtAuth | `?...filtros + format=csv|pdf` | Exportar leads |
| GET | `/leads/:id` | **No** | — | — | Detalle de un lead |
| GET | `/leads/status/:status` | No | — | — | Leads por status |
| GET | `/leads/:id/history` | JWT | JwtAuth | `?action_type, actor_id, date_from, date_to, limit, offset` | Audit log del lead |
| GET | `/leads/:id/history/export` | JWT | JwtAuth | `?...filtros + format=csv|pdf` | Exportar audit log del lead |
| GET | `/leads/:id/timeline` | JWT | JwtAuth | `?type=all|audit|comment, date_from, date_to, limit, offset` | Timeline unificado (audit + comments) |
| POST | `/leads/pull` | JWT | JwtAuth | `PullLeadDto {lead_id, lawyer_id?, comment?}` | Lawyer "jala" un lead del pool |
| PATCH | `/leads/:id/assign` | JWT | JwtAuth | `{lawyer_id, comment?}` | Asignar lead a lawyer |
| PATCH | `/leads/:id/unassign` | JWT | JwtAuth | `{status?, comment}` | Desasignar lead |
| PATCH | `/leads/:id/mark-valid` | JWT | JwtAuth | — | Marcar lead REVIEW como valido → NEW |
| PATCH | `/leads/:id/mark-spam` | JWT | JwtAuth | — | Confirmar spam → TRASHED |
| PUT | `/leads/:id/archive` | JWT | JwtAuth | `{comment?}` | Archivar lead |
| PUT | `/leads/:id/trash` | JWT | JwtAuth | `{comment?}` | Enviar a papelera |
| PATCH | `/leads/:id/restore` | JWT | JwtAuth | — | Restaurar de papelera |
| PUT | `/leads/:id` | JWT | JwtAuth + FieldPermissions | `UpdateLeadDto` | Actualizar lead (RBAC por campo) |
| DELETE | `/leads/:id` | JWT | JwtAuth | — | Eliminar lead |
| PATCH | `/leads/bulk/assign` | JWT | JwtAuth | `{lead_ids[], lawyer_id, comment?}` | Asignacion masiva |
| PATCH | `/leads/bulk/status` | JWT | JwtAuth | `{lead_ids[], status, comment?}` | Cambio de status masivo |
| PATCH | `/leads/bulk/archive` | JWT | JwtAuth | `{lead_ids[], comment?}` | Archivar masivo |
| DELETE | `/leads/bulk` | JWT | JwtAuth | `{lead_ids[], comment?}` | Eliminar masivo |
| DELETE | `/leads/all/delete` | JWT | JwtAuth | — | Eliminar TODOS los leads |

---

### 6.5 Comments (`/leads/:leadId/comments`)

| Metodo | Ruta | Auth | Body/Query | Descripcion |
|--------|------|------|------------|-------------|
| POST | `/leads/:leadId/comments` | JWT | `{content, note_type?}` | Crear comentario en lead |
| GET | `/leads/:leadId/comments` | JWT | `?note_type, limit, offset` | Listar comentarios del lead |

---

### 6.6 Spam (`/spam`)

| Metodo | Ruta | Auth | Body/Query | Descripcion |
|--------|------|------|------------|-------------|
| GET | `/spam/blacklist` | JWT | `?type, limit, offset` | Listar blacklist |
| POST | `/spam/blacklist` | JWT | `{type: 'email'|'domain', value}` | Agregar a blacklist |
| DELETE | `/spam/blacklist/:id` | JWT | — | Eliminar de blacklist |
| GET | `/spam/patterns` | JWT | `?limit, offset` | Listar patrones sospechosos |
| POST | `/spam/patterns` | JWT | `{field_name, pattern, description?, is_active?}` | Crear patron |
| PATCH | `/spam/patterns/:id` | JWT | Partial pattern fields | Actualizar patron |
| DELETE | `/spam/patterns/:id` | JWT | — | Eliminar patron |

---

### 6.7 Notifications (`/notifications`)

| Metodo | Ruta | Auth | Body/Query | Descripcion |
|--------|------|------|------------|-------------|
| POST | `/notifications` | No | `{lawyer_id, text, is_active}` | Crear notificacion |
| GET | `/notifications` | No | — | Listar todas |
| GET | `/notifications/:id` | No | — | Detalle |
| GET | `/notifications/lawyer/:lawyer_id` | No | — | Notificaciones de un lawyer |
| PUT | `/notifications/:id` | No | `UpdateNotificationDto` | Actualizar |
| DELETE | `/notifications/:id` | No | — | Eliminar |

---

### 6.8 Leads Assigned (`/leads-assigned`)

| Metodo | Ruta | Auth | Body/Query | Descripcion |
|--------|------|------|------------|-------------|
| GET | `/leads-assigned` | No | — | Listar todas las asignaciones |
| GET | `/leads-assigned/:id` | No | — | Detalle por ID |
| GET | `/leads-assigned/lead/:id` | No | — | Asignacion de un lead |
| GET | `/leads-assigned/find-by-lawyer/:lawyer_id` | No | — | Leads asignados a un lawyer |
| POST | `/leads-assigned` | No | `{lead?, lawyer_id, comments?}` | Crear asignacion |
| PUT | `/leads-assigned/:id` | No | `UpdateLeadsAssignedDto` | Actualizar |
| DELETE | `/leads-assigned/:id` | No | — | Eliminar |
| DELETE | `/leads-assigned/lead/:id` | No | — | Eliminar por lead ID |

---

### 6.9 Roles (`/roles`)

| Metodo | Ruta | Auth | Body | Descripcion |
|--------|------|------|------|-------------|
| POST | `/roles` | No | `{name}` | Crear rol |
| GET | `/roles` | No | — | Listar roles |
| GET | `/roles/:id` | No | — | Detalle |
| PATCH | `/roles/:id` | No | `{name?}` | Actualizar |
| DELETE | `/roles/:id` | No | — | Eliminar |

---

### 6.10 Service Types (`/service_types`)

| Metodo | Ruta | Auth | Body | Descripcion |
|--------|------|------|------|-------------|
| POST | `/service_types` | No | `{name}` | Crear tipo de servicio |
| GET | `/service_types` | No | — | Listar |
| GET | `/service_types/:id` | No | — | Detalle |
| PATCH | `/service_types/:id` | No | `{name?}` | Actualizar |
| DELETE | `/service_types/:id` | No | — | Eliminar |

---

### 6.11 Lawyer-Service Types (`/lawyers-services`)

| Metodo | Ruta | Auth | Body | Descripcion |
|--------|------|------|------|-------------|
| POST | `/lawyers-services` | No | `{lawyer_id, service_type_id, max_leads}` | Asignar servicio a lawyer |
| GET | `/lawyers-services` | No | — | Listar todas |
| GET | `/lawyers-services/:id` | No | — | Detalle |
| GET | `/lawyers-services/lawyer/:lawyerId` | No | — | Servicios de un lawyer |
| GET | `/lawyers-services/service-type/:serviceTypeId` | No | — | Lawyers de un servicio |
| PATCH | `/lawyers-services/:id` | No | Partial fields | Actualizar |
| DELETE | `/lawyers-services/:id` | No | — | Eliminar |

---

### 6.12 Configuration (`/configurations`)

| Metodo | Ruta | Auth | Body | Descripcion |
|--------|------|------|------|-------------|
| POST | `/configurations` | No | `{key, value}` | Crear config |
| GET | `/configurations` | No | — | Listar configs |
| GET | `/configurations/:id` | No | — | Detalle |
| PUT | `/configurations/:id` | No | `{key?, value?}` | Actualizar |
| DELETE | `/configurations/:id` | No | — | Eliminar |

---

## 7. Seguridad y Guards

### 7.1 JwtAuthGuard

- Passport strategy que valida Bearer token
- Extrae `lawyer` completo y lo inyecta en `request.user`
- Token expira en 60 minutos
- Secret: `JWT_SECRET` env var

### 7.2 FieldPermissionsGuard

RBAC a nivel de campo. Valida que el rol del usuario tiene permiso para modificar cada campo enviado en el body.

**Campos inmutables** (nadie puede modificar):
- Lead: `id, created_at, entry_date, source`
- Lawyer: `id, created_at, code`
- Comment: `id, lead_id, author_id, author_role, created_at`

**Matriz de permisos:**

| Entidad | Rol | Campos permitidos | Restriccion |
|---------|-----|-------------------|-------------|
| lead | Admin | status, lawyer_type, description, comments, full_name, email, number, expired_at, comment | — |
| lead | Lawyer | status, comment | — |
| lawyer | Admin | firstName, lastName, email, phone, is_active, role_id, law_firm, notes, profile_image_url, password | — |
| lawyer | Lawyer | firstName, lastName, phone, profile_image_url, password | `onlySelf: true` |
| comment | Admin | content, note_type | — |
| comment | Lawyer | content, note_type | `onlySelf: true` |

### 7.3 AuditInterceptor

Interceptor automatico que registra en `audit_log` toda operacion de escritura (POST, PUT, PATCH, DELETE) en controllers decorados con `@AuditEntity()`.

- Captura estado anterior (old_value) antes de la operacion
- Captura estado nuevo (new_value) despues
- Resuelve el tipo de accion: CREATE, UPDATE, DELETE, ASSIGN, UNASSIGN, STATUS_CHANGE
- Detecta source: bulk vs web

---

## 8. Sistema de Spam

### Pipeline de deteccion

Cuando se crea un lead (`POST /leads`), el SpamOrchestrator ejecuta en orden:

1. **BlacklistService** — Verifica email y dominio contra `spam_blacklist`
2. **BuiltinChecksService** — Heuristicas integradas:
   - Emails desechables (mailinator, guerrillamail, etc.)
   - Nombres gibberish (consonantes consecutivas, sin vocales)
   - Descripciones demasiado cortas (<10 chars) o HTML/URLs sospechosas
   - Telefonos invalidos (no digitos, muy cortos)
3. **HeuristicService** — Patrones custom de `spam_suspicious_patterns`
4. **DuplicateDetectionService** — Detecta envios duplicados por email+phone en ventana de N minutos

Si el lead es flaggeado: `status = REVIEW`, `spam_score` y `spam_reasons` se guardan.

### Flujo de admin

- `GET /leads/review` → Ver leads flaggeados
- `PATCH /leads/:id/mark-valid` → Mover a NEW (falso positivo)
- `PATCH /leads/:id/mark-spam` → Mover a TRASHED (confirmar spam)

### Papelera

- `PUT /leads/:id/trash` → Mover a TRASHED (manual)
- `PATCH /leads/:id/restore` → Restaurar a status anterior
- Cron diario a las 3AM: purga leads TRASHED con mas de 30 dias (configurable)

---

## 9. Sistema de Email

### Arquitectura

```
Controller → MailService.enqueueEmail() → Bull Queue ('email') → MailProcessor → Nodemailer → SMTP
```

- Pool: max 5 conexiones SMTP simultaneas, max 100 mensajes por conexion
- Rate limit: max 5 jobs por segundo
- Reintentos: 1

### Emails que se envian

1. **Password reset** — Link con token para cambiar password
2. **Lead expiration warning** — Aviso al lawyer cuando un lead esta por expirar (<8h restantes)
3. **Test email** — `GET /auth/send-test-email`

---

## 10. Cron Jobs

| Servicio | Frecuencia | Funcion |
|----------|-----------|---------|
| `LeadStatusScheduleService` | Cada 12 horas | Expira leads ASSIGNED sin accion por 48h → EXPIRED. Desactiva reincidentes → DISABLED. Envia warnings por email. |
| `TrashPurgeScheduleService` | Diario 3AM | Elimina permanentemente leads TRASHED con >30 dias. Borra LeadsAssigned asociados. Registra en audit. |
| `LeadCheckerService` | Cada minuto | Placeholder para polling/webhook de nuevos leads. |

---

## 11. Bootstrap Migrations

Migraciones idempotentes que corren en `OnApplicationBootstrap` para la tabla WordPress:

| # | Cambio | Estado |
|---|--------|--------|
| 001 | Agregar `source VARCHAR(20) DEFAULT 'web'` | Aplicada |
| 002 | Agregar `updated_at DATETIME NULL` | Aplicada |
| 003 | Agregar `expired_at DATETIME NULL` | Aplicada |
| 004 | Backfill `updated_at` con `created_at` | Aplicada |
| 005 | Convertir `status` de VARCHAR(20) a ENUM | Aplicada |
| 006 | Agregar valor ENUM `REVIEW` | Aplicada |
| 007 | Agregar valor ENUM `TRASHED` | Aplicada |
| 008 | Agregar `trashed_at DATETIME NULL` | Aplicada |
| 009 | Agregar `previous_status VARCHAR(30) NULL` | Aplicada |
| 010 | Agregar `spam_score TINYINT DEFAULT 0` | Aplicada |
| 011 | Agregar `spam_reasons JSON NULL` | Aplicada |

---

## 12. Estadisticas del proyecto

| Metrica | Valor |
|---------|-------|
| Archivos fuente (.ts) | ~110 |
| Modulos NestJS | 12 |
| Endpoints totales | ~75 |
| Endpoints protegidos (JWT) | ~45 |
| Endpoints publicos | ~30 |
| Entidades TypeORM | 13 |
| DTOs | ~35 |
| Cron jobs | 3 |
| Migraciones bootstrap | 11 |
| Variables de entorno | ~20 |
| Conexiones DB | 2 |

---

## 13. Gotchas y decisiones tecnicas

1. **Dual database**: Leads viven en DB WordPress (`lawyersPruebaConnection`, `synchronize: false`). TODO lo demas en la DB principal (`synchronize: true`).
2. **`IN_PROGRESS`** se almacena como `'IN PROGRESS'` (con espacio) en la DB.
3. **`POST /leads` y `GET /leads/:id` no tienen auth** — intencional (formulario publico de WordPress).
4. **Spam check inmediato** en `POST /leads` — no espera al cron.
5. **`DELETE /lawyers/:id`** no tiene auth — posible oversight.
6. **Email falla en local dev** (ETIMEDOUT a SMTP) — esperado.
7. **Logs `[SpamCheck]`** de debug siguen activos en `leads.service.ts`.
8. **Tabla original** era `wpqu_lawyer_requests`, renombrada a `wp1w_lawyer_requests`.
9. **Pool de leads** = leads con status `NEW` y sin asignacion.
10. **mark-spam** mueve a TRASHED (no hard delete) — consistente con politica de retencion.
11. **CORS wildcard** (`origin: *`) — revisar para produccion.
12. **Swagger** disponible en `/api-docs` con persistencia de autorizacion.
