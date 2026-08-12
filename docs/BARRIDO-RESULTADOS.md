# Barrido de Aceptación — Resultados E2E · 587 Lawyers Fase 2

> Ref: STG-587L-PH2-2026 · Rama `co/activity-24-verification-onboarding` · Fecha 2026-08-10
> Base: `barrido-entrega-ft.md` (checklist) + `docs/PROJECT-MAP.md` (mapa/hallazgos).
> Método: auditoría a nivel de código (6 agentes, evidencia `file:line`) + build de producción + intento de E2E en vivo.

**Convención:** `[x]` implementado y verificable en el frontend · `[!]` falla / gap / ausente en el frontend · `[b]` bloqueado (lógica server-side / WordPress / infra no auditable desde este repo) · `[-]` N/A.

---

## 0. Estado del entorno de verificación

| Componente | Estado | Evidencia |
|---|---|---|
| Frontend dev `:3002` | ✅ Arriba | La página de login renderiza |
| **Backend `:3000`** | ❌ **CAÍDO** | `POST http://localhost:3000/auth/login → net::ERR_CONNECTION_REFUSED` |
| Suite Playwright (27 specs) | ⛔ **Bloqueada** | `global-setup.ts` hace login real → aborta en setup; log vacío `EXIT=1` |
| Build producción `next build` | ✅ Compila limpio | 24 páginas estáticas, exit 0, 1 warning `exhaustive-deps` |

> **Los E2E en vivo NO pudieron ejecutarse**: `NEXT_PUBLIC_URL=http://localhost:3000` y ese puerto rechaza conexiones. No es problema de credenciales ni de red del sandbox (el navegador de Playwright sí alcanza `:3002`); simplemente no hay backend NestJS escuchando. Todo lo marcado `[x]/[!]` abajo proviene de **auditoría de código estática**; los `[b]` requieren backend vivo + DB (o WordPress) para verificarse funcionalmente.

---

## 1. Resumen ejecutivo

**192 criterios enumerados** (incluye Fase 5 y Transversal; el doc original titula "155" — ver D1).

| Fase | `[x]` OK front | `[!]` Falla/gap | `[b]` Bloqueado | Total |
|---|---:|---:|---:|---:|
| Fase 1 — Lead mgmt & history | 26 | 21 | 17 | 64 |
| Fase 2 — Trash/Spam/Notif | 20 | 6 | 8 | 34 |
| Fase 3 — Dashboard/Analytics | 4 | 16 | 1 | 21 |
| Fase 4 — Signup/Firm/Source | 16 | 4 | 6 | 26 |
| Fase 5 — Chatbot (WP+IA) | 1 | 0 | 23 | 24 |
| Transversal | 11 | 5 | 7 | 23 |
| **TOTAL** | **78** | **52** | **62** | **192** |

**Lectura:** ~41% verificado OK en el front, ~27% con falla/gap real a nivel de front, ~32% no auditable sin backend/WP. La Fase 3 (analytics) es la más débil: **16 de 21 fallan** (Act.21 y Act.22 no existen). El chatbot (Fase 5) es casi enteramente externo a este repo.

---

## 2. Hallazgos por severidad

### 🔴 CRÍTICO — bloquean aceptación / integridad / seguridad

1. **Act.21 (embudo de fuente) y Act.22 (aging) NO EXISTEN** — 0 componentes, rutas, tipos ni endpoints. 10 criterios ausentes de raíz. No hay backend que los alimente (`database.ts` solo expone `widgets` y `performance`). *(Fase 3)*
2. **Exportación de historial de LEAD (PDF/CSV) muerta** — `api.leads.exportHistory(id,'pdf'|'csv')` existe (`database.ts:1103-1113`) pero **ningún botón lo invoca**. Criterio CRÍTICO Act.11 (11.10/11.11) no alcanzable desde la UI. *(Solo funciona a nivel abogado, Act.12.)*
3. **Filtros avanzados incompletos (Act.1)** — no existe filtro por **abogado asignado (1.3)**, **rango de fechas (1.4)** ni **score (1.5)** en `/lead-management`. La capa de datos soporta `date_from/assigned_to` pero la UI nunca los cablea; `score` ni está en el tipo `LeadFilters` (`api.types.ts:119-129`).
4. **No escala a ≥5.000 leads (T3.3)** — el admin trae `api.leads.list({limit:10000})` a memoria y filtra/ordena **client-side** (`useLead.store.ts:63`; `DataTable` pagina en cliente). Con volumen real, degradación grave. *(Lawyer/Firm sí paginan server-side.)*
5. **Sin CAPTCHA en ningún formulario del repo (10.6)** — grep 0 de captcha/recaptcha/turnstile; ni siquiera en `/signup`. Primera línea antispam ausente.
6. **Gate de login no valida `verification_status` (24.7)** — `auth.tsx:44` solo chequea `is_active`; `middleware.ts` solo `role`. Un abogado `pending`/`rejected` con `is_active:true` entraría. Defensa en profundidad ausente; la barrera real es 100% backend `[b]`.
7. **Sin red de seguridad de errores (T3.5)** — 0 error boundaries (`error.tsx`/`global-error.tsx`/`not-found.tsx` inexistentes) → un error de render deja pantalla en blanco. Además `middleware.ts:13` hace `jwtDecode` **fuera** del try/catch → cookie corrupta = **500 en toda ruta** (PROJECT-MAP G2).

### 🟠 ALTO — feature en alcance ausente o rota

8. **Sistema de tipos de nota desactivado (14.1/14.2/14.3 + 2.6 + 11.7)** — selector internal/client_facing/urgent y filtros por tipo **comentados/"parked"**; todo comentario se fuerza a `internal` (`LeadInfoModal.tsx:143,207,1146-1152`); ni rol ni tipo se renderizan. Act.14 completa falla a nivel UI.
9. **Ranking Act.20 sin "días a conversión" (20.1/20.4) ni export CSV (20.3)** — la única métrica de tiempo es `avg_response_hours` (horas hasta 1ª acción, otra semántica). `PerformancePanel.tsx` sin export.
10. **Dashboard: sin tooltips (19.3), sin distinción global/asignado (19.5), sin auto-refresh (19.6)** — no hay `setInterval`/polling; refetch solo en mount/cambio de ruta (`Dashboard.tsx:249-252`).
11. **Fuente del lead ausente en Lead Info y timeline (26.2)** — solo aparece en columnas de lista; el modal de detalle (`LeadInfoModal.tsx:750-781`) y el historial (`:1181-1263`) no la muestran, justo donde el criterio la pide.
12. **Sin reportes de firma (25.4)** y **Firm Leads read-only (25.2)** — `my-firm/**` solo tiene Members/Settings/Leads; el firm admin ve pero no gestiona leads (sin acciones assign/estado en `FirmLeads.tsx:128-185`).
13. **Canal SMS/Both imposible de elegir (16.3/16.4)** — el `<select>` de canal está `disabled` completo; solo EMAIL seleccionable (`IdLawyer.tsx:142-146`).
14. **Scheduled/Calendar Reminder sin punto de entrada (15.2/15.5)** — `api.notifications.schedule` existe pero **0 callers**.
15. **`DEFAULT_REMINDER_POLICY` muerto en la UI (15.8/16.8)** — en el DTO pero Global Settings ni lo lee ni lo guarda → guardar puede sobrescribir/omitir silenciosamente esa política (`NotificationSettings.tsx:140-198`).
16. **No hay reasignación de un lead ya asignado (8.1)** — `canAssign` se limita a NEW/EXPIRED (`LeadInfoModal.tsx:238-242`).
17. **Admin no edita campos de contacto (13.1) y no existe edición de comentarios (13.2)** — email/phone/service son solo-lectura con candado para todos; `comments` solo tiene `create`, sin update/delete.
18. **Timezone frágil (T3.4)** — `CountdownTimer.tsx:2-9` importa plugins `utc`/`timezone` pero **no los aplica** (imports muertos); todo el panel renderiza en tz local del navegador; el countdown de 48h parte de `date_updated` (se resetea con cada update, PROJECT-MAP P0-5).

### 🟡 MEDIO — parcial / mal etiquetado / UX

19. **`pull_date` no existe (2.3)** y la **fecha de ingreso está mal etiquetada** "Selected {created_at}" (2.2); ausente en la vista lawyer.
20. **Etiqueta "New Lead" con enlace directo no existe (2.4).**
21. **Historial parcial (11.4/11.6/11.9)** — old→new solo para `status_change`; `source` no se renderiza; sin filtro por tipo en Lead Info (chips parked).
22. **Export CSV de leads ignora el multi-status del sidebar `selecArray` (1.8)** → el CSV puede no coincidir con lo mostrado; `/all-leads` sin botón de export.
23. **Bulk sin chunking (7.8)** — todos los IDs en un request; `selectAll` scope 'page' (≤pageSize). Reunir ≥100 exige selección multi-página.
24. **Drift SEND_BACK vs LOST** — modal "Send back" emite `LOST` (`AllLeads.tsx:58`), quick-action emite `SEND_BACK` (`:216`). Y `StatusPill` pinta **ARCHIVED/SEND_BACK como "Retained"** (verde) por fallback (`StatusPill.tsx:60-75`) → lead devuelto/archivado se lee como ganado.
25. **`NEXT_PUBLIC_*` son build-time (T2.2)** — cambiarlas exige rebuild/redeploy; contradice "surte efecto sin redesplegar" para lo que vive en el front.
26. **Validación de licencia por MIME del navegador (24.12)** — un `.exe` renombrado a `.pdf` reportaría `application/pdf` y pasaría el chequeo cliente; el drag&drop ignora `accept` (mitigado por `validateLicense` en submit). Requiere re-validación server-side por contenido.
27. **Video de onboarding placeholder hardcodeado** ("Big Buck Bunny", `OnboardingModal.tsx:13-15`) — TODO pendiente de quitar.

### 🔵 BAJO — higiene

28. **Higiene de secretos (T2.4)** — `docs/test-credentials.md` está **git-tracked** con credenciales de prueba; Cloudinary hardcodeado (cloud `despbwppb` + `upload_preset:'amuthn3c'` unsigned, `LawyerManagement.tsx:399-430`) — debería ser env var. **Positivo:** cero claves de IA/alto-entropy en el front → **30.24 se cumple**.
29. **"Skip" de onboarding vive en el modal, no en el menú de perfil (24.10).**
30. **`TRASH_PURGE_DAYS=30` hardcodeado en cliente** (`leadStatusMeta.ts:153`) — diverge si el backend cambia `TRASH_RETENTION_DAYS`.

---

## 3. Pendientes de definición (D1–D4)

- `[ ]` **D1** — 31 vs 22 actividades: sin resolver, contractual. Este barrido enumera **192 casillas**; confirmar cifra vinculante por escrito.
- `[x]` **D2** — "última conexión" (12.4) depende de Act.18 (fuera de alcance): **confirmado** — solo existe `last_login` (timestamp), no session tracking. `IdLawyer.tsx:609-617`.
- `[x]` **D3** — sin umbral de latencia (1.7) ni intervalo (19.6): **confirmado** — 19.6 no tiene auto-refresh en absoluto.
- `[x]` **D4** — filtro por score (1.5): **confirmado** — `score` no existe ni en el tipo `LeadFilters`.

---

## 4. Checklist marcado — los 192 criterios

### FASE 1 — Lead Management & History

**Act. 1 — Filtros avanzados**
- `[!]` 1.1 Filtro por fuente — parcial: solo `/all-leads` (lawyer); ausente en `/lead-management` admin. `AllLeads.tsx:96,112`
- `[x]` 1.2 Filtro por estado — `LeadManagement.tsx:1093-1109,246`; `AllLeads.tsx:430-446`
- `[!]` 1.3 Filtro por abogado — NO existe UI; `assigned_to` hardcodeado a `user.id`. `AllLeads.tsx:110`
- `[!]` 1.4 Rango de fechas — NO existe (salvo FirmLeads A25). `FirmLeads.tsx:256-267`
- `[!]` 1.5 Filtro por score — NO existe (ni en el tipo). `api.types.ts:119-129`
- `[x]` 1.6 Combinados AND — `LeadManagement.tsx:225-265`
- `[x]` 1.7 Sin recarga — client-side useMemo + SPA refetch. `AllLeads.tsx:128-132`
- `[x]` 1.8 Export CSV respeta filtros — `{search,status}`. `LeadManagement.tsx:634-645`. Caveat: ignora `selecArray`; sin export en lawyer.
- `[b]` 1.9 CSV UTF-8+BOM/delimitador — generación backend; front descarga blob verbatim. `database.ts:1349-1359`

**Act. 2 — Lead Info expandido**
- `[x]` 2.1 Detalle ampliado — `LeadInfoModal.tsx`
- `[!]` 2.2 Fecha de ingreso en header — mal etiquetada "Selected {created_at}"; ausente en lawyer. `LeadManagement.tsx:985-990`
- `[!]` 2.3 `pull_date` en header — NO existe en DTO ni modal.
- `[!]` 2.4 "New Lead" con enlace directo — NO existe (grep).
- `[x]` 2.5 Timeline embebido — `LeadInfoModal.tsx:164-198,858-871`
- `[!]` 2.6 Comentarios autor/rol/fecha/tipo — falta rol y `note_type` (hardcoded 'internal'). `LeadInfoModal.tsx:1187-1212`

**Act. 3 — Cambio de estado con comentario obligatorio**
- `[x]` 3.1 Problematic exige razón — `leadStatusMeta.ts:156-159`; `LeadInfoModal.tsx:948`
- `[x]` 3.2 Send Back exige razón — mismo set. Caveat: drift SEND_BACK/LOST.
- `[x]` 3.3 Botón deshabilitado sin comentario — `LeadInfoModal.tsx:948`
- `[b]` 3.4 **CRÍTICO** validación server-side — front siempre incluye `comment`; rechazo server no auditable.
- `[b]` 3.5 Historial abogado/razón/timestamp — registro backend; front lo muestra. `LeadInfoModal.tsx:1216-1259`

**Act. 4 — Send Back / liberar cupo**
- `[b]` 4.1 **CRÍTICO** atómica — front delega en 1 sola llamada `PATCH /leads/:id/unassign`. `database.ts:974-979`
- `[b]` 4.2 **CRÍTICO** rollback — front no muta optimista; refetch tras success.
- `[b]` 4.3 Disponible para reasignación — front hace `fetchAssigned`; reentrada al pool backend.
- `[b]` 4.4 Historial abogado/razón/hora — backend.

**Act. 7 — Asignación/reasignación masiva**
- `[x]` 7.1 Checkboxes multiselección — `DataTable.tsx:224-232`
- `[x]` 7.2 Assign to masiva — `PATCH /leads/bulk/assign`. `LeadManagement.tsx:656-663`
- `[x]` 7.3 Change status masiva — `:673-679`
- `[x]` 7.4 Archive masiva — `:689-694`
- `[x]` 7.5 Delete masiva — `DELETE /leads/bulk`. `:704-709`
- `[x]` 7.6 Confirmación previa — `ConfirmationDialog`. `:1188-1327`
- `[b]` 7.7 **CRÍTICO** un registro por lead — granularidad backend; front manda array en 1 request.
- `[!]` 7.8 Volumen ≥100 — sin chunking; `selectAll` scope 'page'. `:657,1164`

**Act. 8 — Reasignación individual**
- `[!]` 8.1 Dropdown Assign to — solo NEW/EXPIRED; no reasigna lead ya asignado. `LeadInfoModal.tsx:238-242`
- `[b]` 8.2 Historial quién/cuándo/razón — front envía `assign{lawyer_id,comment}`. `:270-275`
- `[b]` 8.3 Notificación al abogado anterior — server-side; sin evidencia en front.

**Act. 11 — Historial completo (CRÍTICO)**
- `[b]` 11.1 Entidad afectada — `entity_type/id` en DTO, implícita en UI. `api.types.ts:157-170`
- `[x]` 11.2 Actor nombre+rol — "By: Nombre (Rol)". `LeadInfoModal.tsx:1252-1254`
- `[x]` 11.3 Tipo de acción — `actionLabel`. `:1231-1233`
- `[!]` 11.4 Valor anterior/nuevo — solo `status_change`. `:1236-1242`
- `[x]` 11.5 Timestamp — `formatTs`. `:1257-1259`
- `[!]` 11.6 Fuente del cambio — `source` en tipo pero no se renderiza. `api.types.ts:167`
- `[x]` 11.7 Comentario asociado — `:1245-1249`
- `[x]` 11.8 Timeline legible — `:164-198,858-871`
- `[!]` 11.9 Filtrable por tipo — chips parked en Lead Info. `:846-857`
- `[!]` 11.10 Export PDF — método existe, sin botón. `database.ts:1103-1113`
- `[!]` 11.11 Export CSV — igual, sin UI a nivel lead.
- `[b]` 11.12 **CRÍTICO** registro automático — backend. Riesgo: delete usa stack legacy. `LeadManagement.tsx:441-480`

**Act. 12 — Auditoría por abogado**
- `[x]` 12.1 Página historial personal — `IdLawyer.tsx:1131-1220`
- `[b]` 12.2 Cambios de perfil — filtro `edits`; se muestra si backend emite. `:237-244`
- `[x]` 12.3 Leads asignados/desasignados — filtro `assignments`. `:239,506-523`
- `[b]` 12.4 **CRÍTICO** última conexión — `last_login` (Act.18 fuera de alcance). `:609-617`
- `[x]` 12.5 Cambios de estado — filtro `status_change`. `:241,299-309`
- `[x]` 12.6 Export PDF y CSV — cableados. `:757-769,898-909`

**Act. 13 — Campos editables y permisos**
- `[!]` 13.1 Admin edita contacto — campos contacto LOCKED read-only para todos. `LeadInfoModal.tsx:755-772`
- `[!]` 13.2 Abogado edita sus comentarios — NO existe edición (solo create). `database.ts:995-1008`
- `[b]` 13.3 **CRÍTICO** abogado no edita ajenos — vacuamente cierto (sin superficie de edición).
- `[!]` 13.4 Fecha ingreso/fuente read-only — ni se muestran en el modal. `:755-779`
- `[x]` 13.5 Icono de candado — `MdLock title="Read-only"`. `:1018-1026`
- `[b]` 13.6 Intentos registrados incl. rechazados — front muestra `edit_denied` pero no los genera. `IdLawyer.tsx:310-317`
- `[b]` 13.7 **CRÍTICO** permisos server — backend 403; front gating por rol. `middleware.ts:8-67`

**Act. 14 — Comentarios con autor y tipo**
- `[!]` 14.1 Autor/rol/fecha/tipo — falta rol y tipo. `LeadInfoModal.tsx:1187-1212`
- `[!]` 14.2 Selector 3 tipos — parked/comentado; fijo 'internal'. `:143,207,1146-1152`
- `[!]` 14.3 Filtrable por tipo — chips comentados. `:846-857`
- `[x]` 14.4 Persistido + reflejado — `comments.create` envía `note_type`; refetch timeline. `:205-212` (persistencia backend `[b]`)

### FASE 2 — Trash, Spam & Notifications

**Act. 9 — Papelera y archivado**
- `[x]` 9.1 Archivar — `LeadManagement.tsx:339-347`; `database.ts:957-965`
- `[x]` 9.2 Trash — `:427-439`; `database.ts:1079-1087`
- `[x]` 9.3 Archivados ocultos — filtro excluye ARCHIVED. `:249,222`
- `[x]` 9.4 Restaurables — tab Archived → NEW. `:110-113,1121-1125`
- `[x]` 9.5 Trash con filtros — dataset propio + búsqueda. `:1116-1120`. Caveat: sin filtros dedicados fecha/motivo.
- `[x]` 9.6 Restaurar 1 clic — `LeadInfoModal.tsx:473-476`; `database.ts:1089`
- `[b]` 9.7 **CRÍTICO** delete solo admin — sin guard de rol en componente; barrera = ruta+backend. `middleware.ts:26-58`
- `[x]` 9.8 Delete individual solo admin — handlers solo en LeadManagement, no en AllLeads. `:1026-1027`
- `[b]` 9.9 Purga `TRASH_RETENTION_DAYS` — cron backend; front countdown hardcoded 30d. `leadStatusMeta.ts:152-153`
- `[b]` 9.10 Acciones en historial — exige comment; backend audita.
- `[b]` 9.11 **CRÍTICO** borrar no rompe auditoría — backend.

**Act. 10 — Detección de spam**
- `[x]` 10.1 Blacklist — `SpamSettings.tsx:151-215` (bloqueo efectivo backend)
- `[x]` 10.2 Valores sospechosos — patrones regex. `:236-305`
- `[b]` 10.3 Duplicados ventana corta — sin control en front; ingesta backend.
- `[x]` 10.4 **CRÍTICO** Review no auto-asigna — `statusOptions=[]` para REVIEW. `LeadInfoModal.tsx:236-242`
- `[x]` 10.5 Admin sobrescribe — `markValid`/`markSpam`. `LeadManagement.tsx:382-410`
- `[!]` 10.6 CAPTCHA/reCAPTCHA — NINGÚN captcha en el repo (grep 0); ni en `/signup`.
- `[b]` 10.7 Falso positivo — clasificación backend.

**Act. 15 — Tipos de notificación y ajustes globales**
- `[x]` 15.1 Immediate — `api.types.ts:373-378`; `NotificationSettings.tsx:29-35` (envío backend)
- `[!]` 15.2 Scheduled — endpoint existe pero 0 callers (sin UI). `database.ts:1280-1285`
- `[x]` 15.3 Resumen diario — `daily_summary_time`. `:147,421-434`
- `[x]` 15.4 Resumen semanal — `weekly_summary_day`. `:148,435-448`
- `[!]` 15.5 Recordatorio de calendario — sin UI (mismo gap 15.2). `:34,51`
- `[x]` 15.6 Quiet hours — inputs start/end; observable vía `SKIPPED_QUIET_HOURS`. `:115-116,346-370`
- `[x]` 15.7 Reintentos max+backoff — inputs `retries`/`backoff_ms`. `:117-118,373-400`
- `[!]` 15.8 Default reminder policy — en DTO pero UI no lo lee ni envía. `api.types.ts:449`

**Act. 16 — Ajustes por abogado y dedup**
- `[x]` 16.1 Elegir tipos — `preferences.update`. `IdLawyer.tsx:685-705`
- `[x]` 16.2 Pausar/reanudar — toggle Paused. `:707-727` (sin date-picker para `paused_until`)
- `[!]` 16.3 Canal email/SMS/ambos — `<select>` disabled; solo EMAIL. `:142-146,1015-1025`
- `[b]` 16.4 **CRÍTICO** SMS entrega — no auditable + front desactiva SMS.
- `[x]` 16.5 Dedup `NOTIF_DEDUP_MINUTES` — input `dedup_minutes`. `NotificationSettings.tsx:119,403-418`
- `[x]` 16.6 Dedup en historial — status `DEDUPLICATED` + `dedup_key`. `:62,72`
- `[b]` 16.7 **CRÍTICO** dedup no suprime reintentos — backend.
- `[!]` 16.8 Variables sin código — expone 5/6; falta `DEFAULT_REMINDER_POLICY`. `:187-210`

### FASE 3 — Dashboard & Analytics

**Act. 19 — Widgets**
- `[x]` 19.1 Cuatro tarjetas — `AdvancedWidgets.tsx:38-43`; `Dashboard.tsx:275-278`
- `[x]` 19.2 Conteo + comparación período — `delta_pct`/`trend`. `AdvancedWidgets.tsx:131-142`
- `[!]` 19.3 Tooltips — ausente; solo modal de cifras al click. `:149-161`
- `[x]` 19.4 Clic filtra listado — `handleClickKpi`. `Dashboard.tsx:183-187`
- `[!]` 19.5 Global vs asignado — distinción no implementada.
- `[!]` 19.6 Auto-actualización — sin polling; refetch solo mount/ruta. `Dashboard.tsx:249-252`
- `[b]` 19.7 **CRÍTICO** cuadran vs BD — no auditable; riesgo doble fuente (widgets backend vs 8 KPIs cliente). `Dashboard.tsx:151-157`

**Act. 20 — Ranking de abogados**
- `[!]` 20.1 Columnas (falta "días a conversión") — `Avg. Response`=horas, otra semántica. `PerformancePanel.tsx:108-115`
- `[x]` 20.2 Ordenable — todas sortable. `:59-117`. Caveat P1#9: `null→-1` sort.
- `[!]` 20.3 Export CSV — ausente en el ranking.
- `[!]` 20.4 Días a conversión verificado — la métrica no existe.

**Act. 21 — Análisis de fuente** *(actividad ausente)*
- `[!]` 21.1 Embudo Chatbot vs Web Form — NO existe.
- `[!]` 21.2 Filtrable mes/trim/año — NO existe.
- `[!]` 21.3 Export CSV/PDF — NO existe.
- `[!]` 21.4 Sin fuente no distorsiona — N/A (no hay embudo).

**Act. 22 — Aging** *(actividad ausente)*
- `[!]` 22.1 Tiempo promedio "New" — NO existe.
- `[!]` 22.2 Tiempo promedio "In Progress" — NO existe.
- `[!]` 22.3 Tiempo promedio "Contacted" — NO existe.
- `[!]` 22.4 Percentil P50 — NO existe.
- `[!]` 22.5 Percentil P90 — NO existe.
- `[!]` 22.6 Filtrable por período — NO existe reporte.

### FASE 4 — Lawyer Signup & Firm Admin

**Act. 24 — Registro de abogado**
- `[x]` 24.1 Paso 1 email/password — `StepAccount.tsx:32-61`; `signupValidation.ts:27-40`
- `[x]` 24.2 Paso 2 datos profesionales — `StepProfessional.tsx`
- `[x]` 24.3 Paso 3 licencia imagen/PDF — `accept png/jpg/webp/pdf`. `signupValidation.ts:15`
- `[x]` 24.4 user_id LIC-2026 (display) — `code` server-gen; front muestra. `StepCode.tsx:32` (`[b]` generación)
- `[b]` 24.5 **CRÍTICO** único bajo concurrencia — backend; front no genera.
- `[x]` 24.6 Paso 5 verificación manual admin — `StepPending` + `Verification` queue.
- `[b]` 24.7 **CRÍTICO** sin verificar no accede a leads — enforcement backend. **Gap front:** login solo chequea `is_active`, no `verification_status`. `auth.tsx:44`
- `[b]` 24.8 Autovinculación firma — server-side; hint en UI. `StepProfessional.tsx:94`
- `[x]` 24.9 Onboarding video YouTube — iframe `embedUrl`. `OnboardingModal.tsx:82-88`. Caveat: placeholder hardcoded.
- `[x]` 24.10 Skip + Restart — Restart en Header (solo lawyer); Skip en modal. `Header.tsx:266`
- `[x]` 24.11 Elección guardada — `PATCH onboarding` + store persist. `database.ts:344-367`
- `[x]` 24.12 **CRÍTICO** validación tipo/peso — MIME + 10MB. `signupValidation.ts:59-71`. Reserva: MIME por navegador (exe→pdf pasaría); requiere re-validación server.

**Act. 25 — Firm admin (A25, sin commitear)**
- `[b]` 25.1 Primer abogado = firm admin — backend.
- `[!]` 25.2 Firm admin gestiona leads — solo VE (read-only). `FirmLeads.tsx:128-185`
- `[x]` 25.3 Agrega abogados — `POST /firms/me/lawyers`. `Members.tsx:105-134`
- `[!]` 25.4 Reportes de firma — AUSENTE. `MyFirm.tsx:143-157`
- `[x]` 25.5 Ajustes firma — `PATCH /firms/me/settings`. `Settings.tsx:87`
- `[x]` 25.6 Rol transferible — grant/revoke. `Members.tsx:74-97`
- `[x]` 25.7 Múltiples admins — bloquea solo el último. `:53-56,189`
- `[x]` 25.8 Fusión — `POST /firms/merge`. `FirmAdmin.tsx:52`
- `[b]` 25.9 **CRÍTICO** fusión conserva historial — backend; solo texto UI.
- `[x]` 25.10 Aislamiento interfaz — lawyer `assigned_to`; firm admin `/firms/me/leads`.
- `[b]` 25.11 **CRÍTICO** aislamiento server — backend 403.

**Act. 26 — Fuente del lead**
- `[x]` 26.1 Etiqueta Chatbot/Web Form (display) — `lead-source.ts:13-25`; `OriginBadge` (`[b]` tagging)
- `[!]` 26.2 Fuente en Lead Info y historial — ausente en modal y timeline. `LeadInfoModal.tsx:750-781`
- `[!]` 26.3 Filtrable por fuente — parcial: My Leads/Firm Leads sí; `/lead-management` admin NO.

### FASE 5 — AI Chatbot (WordPress + IA, fuera de este repo)

- `[b]` 30.1–30.23 — widget/IA/clasificación/consentimiento/proveedor/umbral viven en WordPress. En `src/` solo hay soporte de origen `chatbot` en el listado (`lead-source.ts`, `OriginBadge`). Sin vista de conversación (30.8), consentimiento (30.13) ni controles admin (30.10/30.14/30.15).
- `[x]` 30.24 **CRÍTICO** API key no accesible desde el front — verificado: grep 0 de `openai|anthropic|sk-|CHATBOT_AI` en `src/`; únicas env vars = `NEXT_PUBLIC_URL`, `NEXT_PUBLIC_URL_LAST_SESSION`, `NODE_ENV`.

### TRANSVERSAL

**T1 — Regresión cruzada**
- `[b]` T1.1 **CRÍTICO** Fases 2-5 escriben en historial Fase 1 — audit backend; front consume `timeline`/`comments`.
- `[b]` T1.2 Lead de chatbot cumple Fase 1 — creación backend/WP.
- `[x]` T1.3 Contadores excluyen papelera/spam — whitelist de status excluye TRASHED/SPAM/REVIEW. `Dashboard.tsx:63-128,151-157` (widgets backend `[b]` parte)
- `[b]` T1.4 **CRÍTICO** lead de otra firma nunca aparece — aislamiento backend; sin fuga observable (FirmLeads sin export).

**T2 — Config y entorno**
- `[x]` T2.1 Env vars documentadas — `.env.example` git-tracked; front solo referencia 3 vars.
- `[!]` T2.2 Cambiar variable sin redesplegar — `NEXT_PUBLIC_*` son build-time → exige rebuild.
- `[x]` T2.3 Build desplegable — **verificado: `next build` compila limpio** (24 páginas, exit 0). Revisión staging = proceso `[b]`.
- `[!]` T2.4 **CRÍTICO** sin credenciales en el repo — sin claves críticas, PERO `docs/test-credentials.md` git-tracked + Cloudinary hardcodeado. Higiene comprometida (no crítico).

**T3 — Calidad**
- `[b]` T3.1 Export CSV/PDF encoding — generación backend; sin lib PDF en front (solo dispara descarga blob). `database.ts:1349-1359`
- `[x]` T3.2 Móvil/tablet — responsive presente (clases `sm/md/lg/xl`); sin verificación funcional.
- `[!]` T3.3 **CRÍTICO** ≥5000 leads — admin carga `limit:10000` client-side. `useLead.store.ts:63`
- `[!]` T3.4 **CRÍTICO** timezone consistente — tz local; plugins utc/tz importados pero no aplicados. `CountdownTimer.tsx:2-9`
- `[!]` T3.5 Errores sin trazas — 0 error boundaries; `jwtDecode` fuera de try/catch = 500 global. `middleware.ts:13`

**T4 — Cierre contractual**
- `[b]` T4.1 5 hitos = entregables en staging — proceso/PM.
- `[b]` T4.2 Bitácora de bugs para garantía — existen docs de hallazgos, no bitácora formal.
- `[b]` T4.3 Change Requests fuera de alcance — proceso/PM.

**T5 — Fuera de alcance (verificar que NO esté a medias)** — todos **limpiamente ausentes** (grep 0):
- `[x]` T5.1 Act.5 autoexpiración configurable — ausente (cron backend, front display-only).
- `[x]` T5.2 Act.6 recordatorio por fecha de selección — ausente.
- `[x]` T5.3 Act.17 calendario Google/Outlook — ausente.
- `[x]` T5.4 Act.18 sesión/tracking de conexión — ausente (solo `last_login`).
- `[x]` T5.5 Act.23 cronómetro por lead — ausente.
- `[x]` T5.6 Act.27-29 documentos (versionado/firma) — ausentes.
- `[x]` T5.7 Act.31 click-to-call — ausente.

---

## 5. Recomendaciones de fix priorizadas

| # | Criterio | Fix | Esfuerzo |
|---|---|---|---|
| 1 | Act.21/22 | Construir vistas de embudo de fuente y aging (requiere endpoints backend nuevos) | Alto |
| 2 | 11.10/11.11 | Cablear botón "Export history" (PDF/CSV) en Lead Info → `api.leads.exportHistory` (ya existe) | **Bajo** |
| 3 | 14.1/14.2/14.3/2.6 | Reactivar selector y filtro de `note_type`; renderizar rol/tipo en comentarios | Medio |
| 4 | 1.3/1.4/1.5 | Añadir filtros por abogado, rango de fechas y score en `/lead-management` (datos ya soportan 2/3) | Medio |
| 5 | 16.3 | Habilitar el `<select>` de canal SMS/Both | **Bajo** |
| 6 | 15.2/15.5/15.8 | Cablear UI de Scheduled/Calendar Reminder + `DEFAULT_REMINDER_POLICY` | Medio |
| 7 | 26.2/26.3 | Mostrar `OriginBadge` en Lead Info + filtro por fuente en admin | **Bajo** |
| 8 | T3.5 | Añadir `error.tsx`/`global-error.tsx`/`not-found.tsx` + mover `jwtDecode` dentro de try/catch | **Bajo** |
| 9 | T3.4 | Aplicar `dayjs.utc()/.tz()` (plugins ya importados) y anclar countdown a fecha de asignación | Medio |
| 10 | T3.3 | Paginar `/lead-management` server-side (como FirmLeads) en vez de `limit:10000` | Alto |
| 11 | StatusPill | Mapear ARCHIVED/SEND_BACK a variantes propias (dejan de pintarse "Retained") | **Bajo** |
| 12 | T2.4 | Sacar Cloudinary a env vars; `git rm --cached docs/test-credentials.md` | **Bajo** |

---

## 6. Próximo paso — E2E en vivo

La suite Playwright (27 specs) está lista pero **bloqueada por el backend caído**. Para ejecutarla:

1. Levantar el backend NestJS en `:3000` con DB seed.
2. Confirmar admin `admin@example.com/admin123` (o exportar `E2E_ADMIN_EMAIL/PASSWORD`).
3. `npm run e2e` → reporta pass/fail reales de los flujos frontend-observables.

Con el backend arriba, los `[b]` de validación server-side (3.4, 4.1/4.2, 11.12, 13.7, 24.5, 25.9, 25.11, T1.1, T1.4) requieren además **acceso a la DB** para verificarse; el chatbot (Fase 5) requiere el entorno WordPress.
