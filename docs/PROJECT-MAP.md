# PROJECT MAP — sm029-lawyers587-frontend

> Mapa vivo del proyecto y sus flujos de negocio end-to-end. Generado por auditoría de 6 agentes (auth, ciclo de lead, lawyer, admin, firm A25, arquitectura). Fecha: 2026-08-10. Rama: `co/activity-24-verification-onboarding`.

## 1. Identidad

- **App**: CRM de leads legales. Frontend Next.js **14.2.4** App Router (client-heavy, casi todas las páginas `'use client'`), React 18, TypeScript strict, Tailwind, Zustand, `nookies` (JWT en cookie), axios/fetch. Sin React Query/SWR: capa de datos hecha a mano. Dev en `:3002`. E2E Playwright.
- **Backend**: NestJS 10 + MySQL 8 + Redis/Bull + Nodemailer. Base URL única: `process.env.NEXT_PUBLIC_URL`.
- **Roles**: `admin` (global) y `lawyer`. Sub-roles de firma (A25): `is_firm_admin` (admin de bufete) sobre el rol `lawyer`.

## 2. Inventario de rutas

| Ruta | Componente | Rol | Gate (A25) | MW-protegida | Propósito |
|---|---|---|---|---|---|
| `/` | `auth.tsx` | público | — | redirige logueados | Login |
| `/signup` | `Signup.tsx` (wizard) | público | — | no | Registro self-service lawyer (A24) |
| `/reset-password` | `ResetPassword` | público | — | no | Reset contraseña por token email |
| `/dashboard` | `Dashboard` | admin | — | sí | Overview/métricas admin |
| `/lawyer-management` | `LawyerManagement` | admin | — | sí | Roster/gestión de lawyers |
| `/lawyer-management/[id]` | `IdLawyer` | admin | — | sí (prefijo) | Detalle lawyer |
| `/lawyer-management/verification` | `Verification` | admin | — | sí (prefijo) | **Cola verificación approve/reject (A24)** |
| `/lawyer-management/{assigned,lost,reassigned}-leads` | — | admin | — | sí | `redirect('/lawyer-management')` |
| `/lead-management` | `LeadManagement` | admin | — | sí | Asignación/estado/bulk de leads + spam/trash |
| `/spam-settings` | `SpamSettings` | admin | — | sí | Blacklist + patrones sospechosos |
| `/notification-settings` | `NotificationSettings` | admin | — | sí | Settings globales notif + historial |
| `/firm-admin` | `FirmAdmin` | admin | `global_admin` (FirmGuard) | sí | **Merge de firmas (A25)** |
| `/dash-lawyers` | `DashboardLawyers` | lawyer | — | sí | Dashboard/workflow lawyer |
| `/all-leads` | `AllLeads` | lawyer | — | sí | Leads asignados del lawyer (filtro por store) |
| `/select-lead` | `SelectLead` | lawyer | — | sí | **Lead pool (pull)** |
| `/my-firm` | `MyFirm` | lawyer | `firm` (self-gate) | sí (prefijo) | **Overview de firma (A25)** |
| `/my-firm/members` | `Members` | lawyer | `firm_admin` (FirmGuard) | sí | Miembros + grant/revoke admin |
| `/my-firm/settings` | `Settings` | lawyer | `firm_admin` (FirmGuard) | sí | Settings blob de firma |
| `/my-firm/leads` | `FirmLeads` | lawyer | `firm_admin` (FirmGuard) | sí | Leads de toda la firma (paginado server) |
| *(virtual)* `/all-leads/{waiting,flagged,retained}` | ninguno | lawyer | — | sí (prefijo) | Solo sidebar: filtro por store + push a `/all-leads`. **Deep-link directo → 404** |

Layout `(dashboard)/layout.tsx` monta: `<Toaster>`, `<OnboardingModal>` (gate first-login), Sidebar/Header, y dispara `useLeadsStore.fetchLeads()` en mount.

## 3. Flujos de negocio END-TO-END

### A. Registro → Verificación → Login (Activity 24)
1. **Signup wizard** (`/signup`): pasos Account → Professional → License → Code → **StepPending**. Envía `POST /auth/signup` (multipart, incluye documento de licencia). Termina en pantalla "pendiente de verificación": un admin debe revisar.
2. **Admin revisa** en `/lawyer-management/verification`: `GET /lawyers/verification/pending` lista la cola. Admin abre el documento (`GET /lawyers/:id/license-document`, blob→objectURL, revoca a 60s).
3. **Approve** → `PATCH /lawyers/:id/verification {action:'verify'}` → backend pone `verification_status='verified'`, `verified_at`. **Reject** → `{action:'reject', reason}` (**reason obligatorio**), backend emailea el motivo + audit log. Fila se quita optimista (sin refetch).
4. **Login** (`/auth/login`): el frontend **no** distingue "pending/rejected" de "wrong password" — solo relaya el `message` del backend (`auth.tsx:37-42`). Gate cliente adicional: bloquea si `!lawyer.is_active` ("This user is not authorized"). Guarda JWT en cookie `currentUser` (30d, no httpOnly) y persiste el `lawyer` en `useAuth` (localStorage).

### B. Onboarding lawyer (Activity 24)
- `OnboardingModal` montado en el layout, se auto-gatea a lawyers: `isPending = user.onboarding_status === 'pending'`.
- Si pending → `GET /lawyers/me/onboarding` trae videos (YouTube embeds). **Fallback placeholder temporal** (Big Buck Bunny, `OnboardingModal.tsx:9-15`) cuando el backend no tiene videos. **TODO: quitar cuando el backend sirva videos reales.**
- **No auto-muta en mount** (documentado): `complete`/`skip` solo por acción de usuario → `PATCH /lawyers/me/onboarding {action}`. Cierre = skip.
- **Restart** desde el menú de perfil (solo lawyer, `Header.tsx:260`): `{action:'restart'}` vuelve `onboarding_status='pending'` y re-dispara el modal.

### C. Ciclo de vida del LEAD (núcleo del negocio)

**Doble eje de atribución (fácil de confundir):**
- `channel: Channel` = adquisición marketing (utm/referrer/gclid), lo renderiza `SourceBadge` (mal nombrado — muestra el *channel*). Columna UI: **"Channel"**.
- `source: string` + `source_label?` = origen de ingesta chatbot vs web_form (A26), lo renderiza `OriginBadge`. Columna UI: **"Source"**. Filtro `?source=` solo cableado en My Leads. `source_label` viene solo en el DTO de LIST; en `GET /leads/:id` se deriva client-side (`lib/lead-source.ts`, default → "Web Form").

**Máquina de estados (`LeadStatus`, 13 valores):**
```
[captura] REVIEW ──markSpam──► TRASHED ──delete──► (purgado)
   │        │ ▲ markValid          │ restore→prev
   ▼        ▼ │                     ▼
  NEW ◄──────┘ └──────────────────
   │  \─ assign(admin) / pull(lawyer) ──► ASSIGNED
   │                                        │
   │              update ┌─────────┬────────┼────── cron 48h ──► EXPIRED ──► vuelve al pool
   │                     ▼         ▼        ▼
   │              IN PROGRESS  WAITING_ON_CLIENT  PROBLEMATIC
   │                     │
   │           unassign(LOST|SEND_BACK) / update→CLOSED(Retained)
   ▼
 DISABLED / ARCHIVED (end-states admin; ARCHIVED restaurable→NEW)
```
- Solo `NEW`/`EXPIRED` son asignables. Transiciones que exigen razón: `PROBLEMATIC, SEND_BACK, LOST, WAITING_ON_CLIENT`.
- **Expiración**: cron backend `ASSIGNED→EXPIRED` a las 48h. El frontend NO es autoritativo (`isLeadExpired` hardcodeado `false`).

**Pool → Pull (lawyer, `/select-lead`):**
1. Sidebar muestra badge de conteo: `api.leads.pool({limit:1})` → `total`.
2. Página: `fetchUserAndServices` + `fetchAssignedCount` + `fetchPool` (`pool({limit:100})`). `filteredPool` filtra el pool a los servicios del lawyer. Capacidad = Σ `max_leads` − asignados − seleccionados.
3. Pull: `openPullConfirm` valida capacidad → `ConfirmationDialog` → `handlePull` **loop secuencial** `POST /leads/pull` por cada lead → toasts parciales → `router.push('/all-leads')` + refresh.

**Asignación admin (`/lead-management`):** single `PATCH /leads/:id/assign` (pre-check capacidad cliente) y bulk `PATCH /leads/bulk/assign`. Unassign (`LOST`/`SEND_BACK`). Reassign = assign a otro lawyer. Pipeline spam/trash: `review`, `mark-valid`, `mark-spam`, `trash`, `restore`, `DELETE /leads/bulk`. Export CSV.

**Vistas:** admin ve todo (`useLeadsStore`, `GET /leads?limit=10000`, filtra client-side). Lawyer ve lo suyo server-side (`assigned_to: user.id`). Firm admin ve toda la firma (`GET /firms/me/leads`, paginado).

### D. Firma — Firm-level admin (Activity 25) — **trabajo activo sin commitear**
- **Gating**: `useFirmAccess` deriva de `useAuth.user` (persistido). Gates: `firm`=`firm_id!=null`, `firm_admin`=`is_firm_admin`, `global_admin`=`role.name==='admin'`. `FirmGuard` (client) + Sidebar `passesGate` + middleware (solo por rol). Backend re-verifica 403.
- **Overview** (`/my-firm`): `GET /firms/me` → nombre, id, estado (active/merged), member_count, admins. Maneja pre-backfill (firma null). `iAmAdmin = isFirmAdmin || admins.includes(userId)`.
- **Members** (`/my-firm/members`, firm_admin): `GET /firms/me/lawyers`; add lawyer `POST /firms/me/lawyers` (nace verified+active, password ≥6, 409 inline); grant/revoke admin `PATCH /firms/me/admins` (guard cliente "no quitar el último admin", 403 backend).
- **Settings** (`/my-firm/settings`, firm_admin): editor JSON de `settings.notifications` y `.templates`; `PATCH /firms/me/settings` (shallow-merge). Textarea vacío = "no tocar" (no se puede limpiar blanqueando; escribir `{}` — depende de la semántica de merge del backend).
- **Firm Leads** (`/my-firm/leads`, firm_admin): `GET /firms/me/leads` paginado server-side (limit 20/offset), draft vs applied filters.
- **Merge firmas** (`/firm-admin`, global_admin): dos IDs numéricos, valida `source!=target` → `ConfirmationDialog` → `POST /firms/merge`. Errores 404/403/genérico.
- **Estado**: substancialmente completo y consistente (types↔uso↔API sin mismatches). Compila limpio. Sin verificación funcional aún.

### E. Admin — dashboard y operación
- **Dashboard** (`/dashboard`): AdvancedWidgets (`GET /leads/metrics/widgets`), 8 KPI cards derivadas del store, Recent activity (fan-out top-10 lawyers × 5 events, NO feed global), PerformancePanel (`GET /lawyers/metrics/performance`).
- **Lawyers mgmt**: KPIs (`/lawyers/stats`), CRUD lawyer (Cloudinary upload, `/lawyers-services`), reset password, activar/desactivar (razón obligatoria), delete (bloqueado si tiene leads). Legacy muy `any`-typed.
- **Settings**: spam (blacklist + patrones regex), notifications (globales `PUT`, test email, historial).

## 4. Arquitectura & capa de datos

- **DOS stacks HTTP en `services/database.ts`** (footgun principal):
  - `api.*` (moderno, "v2"): `apiRequest` + `unwrapApi` (`body?.data ?? body` maneja wrapped y raw), `buildQuery` (dropea null/''), `Paginated<T>`, `ApiResult{message}`. Namespaces: leads, lawyers, spam, notifications, **firms (A25)**.
  - `database.*` (legacy): `ResponseEndpoint{messages}` (¡`messages` vs `message`!), unwrappers propios, `NEXT_PUBLIC_URL` inline. Auth, signup/verify/onboarding, lawyers legacy, genéricos (`fetchData`/`getData`/`insertData`/`postData` duplicados).
- **Stores Zustand (5)**: `useAuth` (persist `'auth'`, `user: any` ⚠️), `useLeadsStore` (`limit:10000`, `dataLeads: any`), `useLoadingStore`, `useMobileStatus` (clases Tailwind en el tipo ⚠️), `useSelectStatus` (union `status` desincronizada de `LeadStatus`).
- **Types**: `api.types.ts` (730L, fuente de verdad del `api.*`), `lawyerData.types.ts` (global ambient `LawyerData`, loose: `is_active: string`), `routes.interface.ts` (`NavGate`). `LeadStatus` declarado en **3 sitios** con drift.
- **Design system**: DOS árboles — `components/ui/**` (atómico moderno, cva + `cn`, forwardRef; 19 atoms / 31 molecules / 11 organisms) vs `components/{Layout,atoms,organisms}` (legacy, aún montado: Sidebar, Header, Modal). Tokens: `slate-*` estructura + 4 brand (`primary #00234D`, `secondary #FF0300`, `customGreen`, `customRed`).
- **Config**: `next.config.mjs` **vacío** (sin headers de seguridad/imágenes). Alias `@/*`. Middleware hace **round-trip al backend por request** (`authIdRol`) para el rol en vez de leer el JWT que ya decodifica.

## 5. Hallazgos priorizados

### P0 — Lead pool (crisis en prod, ahora localizada)
1. **My-Leads ordena "Expires" DESC por defecto** (`AllLeads.tsx:463`) → esconde los leads MÁS urgentes (los más cercanos a expirar quedan al fondo). ← probable "sort order bug".
2. **Pull secuencial con capacidad stale + no atómico** (`SelectLead.tsx:151,160-172`): pre-check usa `assignedCount` del load; entre load y pull otros pueden jalar/expirar → pull parcial. ← "pull/expiration".
3. **Pool truncado a 100** (`SelectLead.tsx:127`) pero el KPI/badge muestran el `total` real → si pool>100, pérdida silenciosa de filas jalables.
4. **Columna de status del pool declarada pero nunca renderizada** (`SelectLead.tsx:41,52` vs columnas `:232-296`). ← "pool status column".
5. **Countdown desde `updated_at`, no desde asignación** (`AllLeads.tsx:315`): cualquier update resetea el contador visible.
6. **Badge sidebar**: con `limit:1`, si el backend omite `total`, cae a `data.length`=1 (subconteo).

### P1 — Correctness display
7. **`SEND_BACK` y `ARCHIVED` se pintan como "Retained"** (verde) por fallback en `StatusPill.tsx:60-75` (sin key → 'closed'). Un lead devuelto/archivado se lee como ganado. **Nuevo bug, no estaba en la lista.**
8. **`SEND_BACK` vs `LOST` para la misma intención "send back"** (quick action=`SEND_BACK`, modal=`LOST`, `AllLeads.tsx:58` vs `:216`).
9. **Dashboard sort**: `compareValues` nulls-first ignora dirección + accessors mapean `null→-1` → lawyers "N/A" rankean como mejores al ordenar asc (`DataTable.tsx:57-67`, `PerformancePanel.tsx:97,113`). Doble sort server+client. Truncado a 100 filas.
10. **Mismatch strings de status**: `'IN PROGRESS'` (espacio) vs `WAITING_ON_CLIENT` (underscore); `'DISABLE'` vs `'DISABLED'` → conteos silenciosos en 0.
11. **Deep-link 404** en `/all-leads/{waiting,flagged,retained}` (rutas declaradas, páginas ausentes).

### P2 — Seguridad / robustez (defensa en profundidad)
- **G1**: JWT en cookie no-httpOnly, legible por JS (XSS puede exfiltrar token de 30d).
- **G2**: `jwtDecode` fuera del try/catch en middleware → cookie corrupta = 500 en toda ruta.
- **G3**: middleware hace fetch backend del rol por request (latencia; backend caído = lockout).
- **G4**: post-login `router.push('/dashboard')` para todos → lawyer rebota vía doble redirect a `/dash-lawyers`.
- **G5**: `UpdateLawyer(last_login, user.id)` usa `user` del closure viejo → probable `PUT /lawyers/undefined`.
- **G6**: `is_active: string` → gate cliente falla-abierto si backend manda `"0"`/`"false"`.
- **G7**: signout no limpia el localStorage `auth` (depende de `location.reload()`).
- **G8**: middleware nunca chequea `is_active`/`verification_status` (solo rol) → usuario desactivado post-login mantiene cookie 30d.
- **G9**: gates de firma solo cliente (bypassables); la frontera real es el 403 del backend. Ventana de flag stale (admin degradado no se refleja hasta re-login).

### Notas
- **Regla respetada**: no hay auto-mutación de estado backend en mount/useEffect en ninguno de los flujos (onboarding/pool/expiración son display-only). ✅
- Artefactos basura en raíz: `BACKEND-URGENT.txt`, `CLIENT-RESOLVED-ISSUES.txt`, `email-preview-*.html`, `observations-*.md`.
- Único error `tsc`: `tests/e2e/specs/10-items-audit.spec.ts:402` (cast CSSStyleDeclaration), pre-existente, ajeno a A25.

## 6. Estado del repo
- Rama `co/activity-24-verification-onboarding`. A24 commiteado (verificación + onboarding). **A25 (firm) sin commitear** (7 archivos modificados + 11 nuevos, ~1279 líneas). Compila limpio.
