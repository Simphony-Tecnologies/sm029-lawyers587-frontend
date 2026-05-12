# API Inventory — Frontend ↔ Backend

**Última actualización:** 2026-05-12
**Base URL:** `process.env.NEXT_PUBLIC_URL` (default backend en `:3000`)
**Auth:** Bearer JWT en cookie `currentUser`
**Convención de respuesta v2:** `{ success, data, message?, error? }` con listados `{ data: { data: [], total } }`

---

## Endpoints v2 (`api.*` namespace) — usar para todo lo nuevo

### Auth y sesión

| Método | Path | Frontend uso | Componente |
|---|---|---|---|
| POST | `/auth/login` | `database.auth(email, password)` | [auth.tsx](src/app/auth.tsx) |
| POST | `/auth/reset-password` | `database.resetPassword(token, pw)` | [reset-password](src/app/reset-password/ResetPassword.tsx) |
| POST | `/auth/request-password-reset` | `database.requestPassword(email)` | [auth.tsx](src/app/auth.tsx) |
| — | `signout()` | Borra cookie `currentUser` | [Header](src/components/Layout/Header.tsx) |

### Leads — listado y filtros

| Método | Path | Frontend uso | Componente |
|---|---|---|---|
| GET | `/leads?limit&offset&search&status&service&source&date_from&date_to&assigned_to` | `api.leads.list(filters)` | [useLead.store.ts](src/store/useLead.store.ts), [IdLawyer.tsx](src/app/(dashboard)/lawyer-management/[id]/IdLawyer.tsx) |
| GET | `/leads/:id` | `api.leads.get(id)` | (no usado todavía — detalle viene del listado) |
| GET | `/leads/export?format=csv&{filtros}` | `api.leads.exportCsv(filters)` | [LeadManagement.tsx](src/app/(dashboard)/lead-management/LeadManagement.tsx) |

**Shape DTO `LeadDTO`** (camelCase): `id, code, entry_date, created_at, updated_at, fullName, email, phone, service, source, description, status, assigned_lawyer (LawyerRef|null), assigned_lawyer_id, comments`

### Leads — mutaciones

| Método | Path | Frontend uso | Componente |
|---|---|---|---|
| PUT | `/leads/:id` (admin) | `api.leads.update(id, body)` | [LeadManagement.tsx](src/app/(dashboard)/lead-management/LeadManagement.tsx), [IdLawyer.tsx](src/app/(dashboard)/lawyer-management/[id]/IdLawyer.tsx), [AllLeads.tsx](src/app/(dashboard)/all-leads/AllLeads.tsx) |
| PUT | `/leads/:id/archive` | `api.leads.archive(id)` | LeadManagement, IdLawyer |
| PATCH | `/leads/:id/assign` | `api.leads.assign(id, { lawyer_id, comment })` | (sólo bulk usa esto — pendiente UI single-assign) |
| PATCH | `/leads/:id/unassign` | `api.leads.unassign(id, { status?, comment })` | LeadManagement, IdLawyer, AllLeads |

**Reglas críticas (backend valida):**
- `PUT /leads/:id` con `status: PROBLEMATIC \| SEND_BACK` → `comment` **obligatorio**
- `comment` no se guarda en lead, va a `audit_log.comment`
- Campos bloqueados: `id, created_at, entry_date, source`

### Leads — bulk operations

| Método | Path | Frontend uso | Componente |
|---|---|---|---|
| PATCH | `/leads/bulk/assign` | `api.leads.bulk.assign({ lead_ids, lawyer_id, comment })` | LeadManagement |
| PATCH | `/leads/bulk/status` | `api.leads.bulk.status({ lead_ids, status, comment })` | LeadManagement |
| PATCH | `/leads/bulk/archive` | `api.leads.bulk.archive({ lead_ids, comment })` | LeadManagement |
| DELETE | `/leads/bulk` | `api.leads.bulk.delete({ lead_ids, comment })` | LeadManagement |

**Respuesta común:** `{ total, succeeded, failed, errors: [{ lead_id, message }] }`

### Leads — timeline y audit history

| Método | Path | Frontend uso | Componente |
|---|---|---|---|
| GET | `/leads/:id/timeline?type=audit\|comment\|all&limit&offset` | `api.leads.timeline(id, filters)` | [LeadInfoModal.tsx](src/components/ui/organisms/LeadInfoModal/LeadInfoModal.tsx) |
| GET | `/leads/:id/history?action_type&actor_id&date_from&date_to&limit&offset` | `api.leads.history(id, filters)` | (no usado UI todavía — timeline lo cubre) |
| GET | `/leads/:id/history/export?format=csv\|pdf` | `api.leads.exportHistory(id, format, filters)` | (no usado UI todavía) |

### Leads — comments (notas libres)

| Método | Path | Frontend uso | Componente |
|---|---|---|---|
| GET | `/leads/:leadId/comments?note_type&limit&offset` | `api.leads.comments.list(leadId, filters)` | (no usado directo — viene en timeline) |
| POST | `/leads/:leadId/comments` body `{ content, note_type? }` | `api.leads.comments.create(leadId, body)` | LeadInfoModal composer |

**Tabla destino:** `comments` (independiente de `audit_log`)
**Default note_type:** `internal` (cliente pidió simplificar — UI siempre envía internal)

### Leads — pool y pull (rol lawyer)

| Método | Path | Frontend uso | Componente |
|---|---|---|---|
| GET | `/leads/pool?service&limit&offset` | `api.leads.pool(filters)` | [SelectLead.tsx](src/app/(dashboard)/select-lead/SelectLead.tsx) |
| POST | `/leads/pull` body `{ lead_id, comment? }` | `api.leads.pull(body)` | SelectLead |

### Lawyers — listado y filtros

| Método | Path | Frontend uso | Componente |
|---|---|---|---|
| GET | `/lawyers?search&role_id&is_active&service_type_id&limit&offset` | `api.lawyers.list(filters)` | LeadManagement (LawyerPicker), LawyerManagement (no usado todavía — sigue legacy) |
| GET | `/lawyers/:id` | `database.getLawyer(id)` | IdLawyer, LawyerManagement, DashboardLawyers, AllLeads, SelectLead |
| GET | `/lawyers/stats` | `api.lawyers.stats()` | LawyerManagement (KPIs reales) |
| GET | `/lawyers/export?format=csv&{filtros}` | `api.lawyers.exportCsv(filters)` | LawyerManagement |

**Campos computados del DTO `LawyerListItem`:** `active_assigned_leads, pulled_count, lost_count, services: string[]`

### Lawyers — mutaciones

| Método | Path | Frontend uso | Componente |
|---|---|---|---|
| POST | `/lawyers` | `database.CreateLawyer(data)` | LawyerManagement |
| PUT | `/lawyers/:id` | `database.UpdateLawyer(data, id)` | LawyerManagement (form edit) |
| PATCH | `/lawyers/:id/status` body `{ is_active, comment }` | `api.lawyers.updateStatus(id, body)` | LawyerManagement (toggle) |
| PATCH | `/lawyers/:id/password` body `{ password, comment }` | `api.lawyers.updatePassword(id, body)` | LawyerManagement (password modal) |
| DELETE | `/lawyers/:id` | `database.DeleteLawyer(id)` | LawyerManagement |
| POST | `/lawyers/upload-profile-image` (multipart) | `database.uploadProfile(formData)` | LawyerManagement (image upload) |

### Lawyers — audit history

| Método | Path | Frontend uso | Componente |
|---|---|---|---|
| GET | `/lawyers/:id/history?action_type&date_from&date_to&limit&offset` | `api.lawyers.history(id, filters)` | IdLawyer (Activity log), Dashboard (Recent activity) |
| GET | `/lawyers/:id/history/export?format=csv\|pdf` | `api.lawyers.exportHistory(id, format)` | IdLawyer |

**Respuesta:** `{ summary: { leads_assigned, leads_unassigned, status_changes, profile_updates, edit_denied, last_login }, events: { data: AuditEvent[], total } }`

**IMPORTANTE:** este endpoint NO incluye comments (tabla distinta). Para mezclar comments con audit en una sola vista del lawyer, hay que pedir un endpoint backend nuevo o hacer fetches adicionales por lead.

---

## Endpoints legacy aún en uso

### Servicios y roles (no migrados a v2)

| Método | Path | Frontend uso | Componente |
|---|---|---|---|
| GET | `/service_types` | `database.getData(/service_types)` | LawyerManagement, AllLeads, SelectLead, DashboardLawyers |
| GET | `/roles` | `database.getData(/roles)` | LawyerManagement |
| GET | `/lawyers-services` | `database.getSelectTypeLawyer()` | LawyerManagement (max_leads cross) |
| POST | `/lawyers-services` | `database.postData(/lawyers-services, body)` | LawyerManagement (assign service to lawyer) |
| PATCH | `/lawyers-services/:id` | `database.patchData(/lawyers-services/:id, body)` | LawyerManagement (update max_leads) |
| DELETE | `/lawyers-services/:id` | `database.deleteData(/lawyers-services/:id)` | LawyerManagement |

### `/leads-assigned` (legacy — mantener por compat)

| Método | Path | Frontend uso | Componente |
|---|---|---|---|
| GET | `/leads-assigned` | `database.getLeadsAssigned()` | LawyerManagement (cross para max_leads viejo) |
| DELETE | `/leads-assigned/lead/:id` | `database.deleteData(...)` | LeadManagement.deleteLead (línea 218) |

**Nota:** new.md confirma que `/leads-assigned` queda como soporte legacy. **No usar para flujos nuevos.**

### Otros legacy

| Método | Path | Frontend uso |
|---|---|---|
| GET | `/notifications/lawyer/:id` | Header (badge de notificaciones) |
| GET | `${NEXT_PUBLIC_URL_LAST_SESSION}/:code` | LawyerManagement (last login history) |

---

## Helpers transport (database.*)

| Helper | Qué hace | Cuándo usarlo |
|---|---|---|
| `fetchData(url, token?)` | GET genérico, retorna raw response | Llamadas one-off a paths no canónicos |
| `getData(url, token?)` | GET + `unwrapList` (extrae array de cualquier shape) | Listados legacy |
| `insertData(url, body, token?)` | POST con `success` derivado de status | Inserciones legacy |
| `postData(url, body, token?)` | POST con success+code | Creates legacy |
| `updateData(url, body, token?)` | PUT con success | Updates legacy |
| `patchData(url, body, token?)` | PATCH con success | Patches legacy |
| `deleteData(url, token?)` | DELETE con success | Deletes legacy |
| `apiRequest<T>(path, init, token?)` | Wrapper v2 tipado con `unwrapApi` | Métodos del namespace `api.*` |
| `apiBlob(path, token?, accept?)` | GET que retorna Blob | Exports CSV/PDF |
| `downloadBlob(blob, filename)` | Trigger download desde Blob | Después de `api.X.exportCsv` |

---

## Bugs y gaps conocidos

### 🐛 Comment en lead no aparece en Activity log del lawyer

**Causa raíz:** `/lawyers/:id/history` consulta `audit_log`. Los comments se guardan en tabla **`comments`** independiente. Backend no los mezcla.

**Fix posible:**
1. Esperado de backend: `/lawyers/:id/history` debería incluir eventos `comment_added` o `/audit/feed` global con ambas fuentes.
2. Workaround frontend: por cada lead asignado al lawyer, hacer `GET /leads/:leadId/comments?limit=10` y mezclar en el activity log client-side.

### 🐛 `dataLeads` del store no incluye ARCHIVED por default

**Causa:** `useLead.store.ts` carga `/leads?limit=10000` sin filtro de status. Pero `LeadManagement` excluye ARCHIVED en su filtro local. Cuando un lead se archiva, el store sigue teniéndolo — pero el filtrado local lo oculta. ✅ comportamiento correcto.

### 🐛 GET /lawyers en LawyerManagement sigue siendo legacy

Usa `database.getData(/lawyers)` que retorna shape v1 sin campos computados.
**TODO:** migrar a `api.lawyers.list()` para tener `active_assigned_leads/pulled_count/lost_count` directos sin cruce manual con `/lawyers-services`.

### 🐛 `auth.tsx:60` ejecuta `UpdateLawyer({last_login}, user.id)` post-login

Antes daba 403 self-edit. Con v2 RBAC podría funcionar — verificar live.

### 🐛 `/leads-assigned/lead/:id` en `LeadManagement.deleteLead` (línea 218)

Legacy delete cuando se hace delete físico. Preferir archive (per recomendación new.md).

---

## Endpoints disponibles pero NO usados en UI

- `GET /leads/:id` (no se necesita — detalle viene de listado paginado)
- `GET /leads/:id/history` (cubierto por `/timeline`)
- `GET /leads/:id/history/export` (botón export disponible solo para lawyer history, no para lead)
- `GET /leads/:leadId/comments` (cubierto por `/timeline?type=comment`)
- `PATCH /leads/:id/assign` (single-assign no tiene UI dedicada — se hace via bulk con N=1 o via modal de cambio de status)
