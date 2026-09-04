# Playbook Frontend — Cambios de Backend (Sep 2026)

> **Para el equipo/agente de Frontend.** El backend (`admin.587lawyers.com` API, repo NestJS) recibió una tanda de correcciones de seguridad, aislamiento por firma y nueva funcionalidad, a partir del QA de Sergio (doc `observations-sep-2026`). Varios cambios **afectan lo que el FE recibe o debe enviar**. Este documento lista qué cambió, qué debes adaptar, y qué preguntas necesitamos que respondas.
>
> Rama backend: `co/phase-4`. Estado: implementado + unit-tested; **falta prueba viva end-to-end** (se hará contra staging).

---

## 1. TL;DR — qué cambió

1. **Aislamiento por firma**: un abogado no-admin ya NO puede ver/editar datos de otra firma. Varios endpoints ahora devuelven **404** si el recurso es de otra firma, y el listado de abogados se filtra por firma.
2. **Se cerraron huecos sin autenticación**: endpoints que antes respondían sin token ahora exigen login (y algunos, rol admin).
3. **Notificaciones**: `GET /notifications` ahora devuelve solo las del usuario logueado + hay endpoints nuevos de “leído / no leídos”.
4. **Firmas**: nuevos endpoints para listar/crear/ver/renombrar firmas.
5. **Errores más claros**: email duplicado ahora es `409` (no `500`).
6. **Rutas legacy `/leads-assigned`** ahora son **solo admin** → hay que migrar al flujo moderno.

---

## 2. 🔴 CAMBIOS QUE ROMPEN / DEBES ADAPTAR

### 2.1 Endpoints que ahora EXIGEN token (antes públicos)
Si el FE llamaba alguno de estos **sin `Authorization: Bearer <token>`**, ahora recibirá **401**. Envía siempre el token.

| Endpoint | Antes | Ahora |
|---|---|---|
| `GET /lawyers/:id` | público | **401** sin token |
| `DELETE /lawyers/:id` | público (¡borraba sin login!) | **401** sin token · **403** si no es admin |
| `GET /notifications` | público, devolvía TODAS | **401** sin token · devuelve **solo las del usuario** |
| `GET/POST/PATCH/DELETE /roles` | público | **401** sin token · mutaciones **403** si no es admin |
| Todo `/leads-assigned/*` | cualquier abogado | **403** si no es admin (ver §4) |
| `GET /notifications/:id` · `POST/PUT/DELETE /notifications/:id` | público | **401** sin token |
| `GET /notifications/lawyer/:lawyer_id` | público (IDOR) | **401** sin token · **403** si pides las de otro abogado (solo tú o admin) |

### 2.2 Endpoints que cambian el RESULTADO (mismo login, distinta respuesta)
| Endpoint | Cambio de comportamiento | Acción FE |
|---|---|---|
| `GET /leads/:id` | non-admin pidiendo lead de otra firma → **404** | manejar 404 “no encontrado / sin acceso” |
| `PUT /leads/:id` (editar lead) | non-admin editando lead de otra firma → **404** | manejar 404 |
| `GET /lawyers/:id` | non-admin viendo abogado de otra firma → **404** | manejar 404 |
| `GET /leads/status/:status` | non-admin ve **solo su firma**; si no hay, devuelve `[]` (antes podía dar error) | tratar `[]` como vacío, no como error |
| `GET /leads/:id/timeline` · `/:id/history` · `/:id/history/export` | non-admin cross-firm → **404** | manejar 404 |
| `PUT /leads/:id/archive` | non-admin archivando lead de otra firma → **404** | manejar 404 |
| `GET /lawyers` (listado) | non-admin ve **solo abogados de su firma** (admin sigue viendo todos) | si alguna vista esperaba ver todas las firmas, ajustar |
| `GET /notifications` | devuelve **solo las del usuario logueado** (antes: las de toda la plataforma) | el “bell” debe consumir esto (ya no hay que filtrar en el cliente) |

### 2.3 Efecto colateral: desactivar/borrar abogado libera sus leads
- Al **desactivar** o **borrar** un abogado, sus leads asignados **vuelven automáticamente al pool** (estado `SEND_BACK`, reasignables).
- **Acción FE**: tras desactivar/borrar, **refrescar** el listado de leads / contadores del pool (los leads de ese abogado desaparecen de su dashboard y el pool sube).

---

## 3. 🟢 ENDPOINTS NUEVOS (adóptalos)

### 3.1 Notificaciones — estado de leído
| Método | Ruta | Respuesta |
|---|---|---|
| `GET` | `/notifications/unread-count` | `{ success, data: { unread: N } }` |
| `PATCH` | `/notifications/:id/read` | marca una como leída (solo la tuya) |
| `POST` | `/notifications/read-all` | `{ success, data: { updated: N } }` |
| `GET` | `/notifications` | tus notificaciones (usar para la lista del bell) |

→ El “bell” ahora puede mostrar un **contador de no leídas** real y marcar leído individual/masivo.

### 3.2 Cola de spam — ahora con motivo
- `GET /leads/review` (admin) ahora incluye **`spam_score`** y **`spam_reasons`** por lead.
- **Acción FE**: la pantalla de revisión de spam debe **consumir `/leads/review`** (no “Spam Settings”, que es el catálogo de reglas) y mostrar el **motivo** de cada lead marcado. Acciones ya existentes: `PATCH /leads/:id/mark-valid`, `PATCH /leads/:id/mark-spam`.

### 3.3 Firmas — CRUD (global admin)
| Método | Ruta | Uso |
|---|---|---|
| `GET` | `/firms` | lista de firmas con `member_count` |
| `POST` | `/firms` `{ name }` | crear firma (nombre único) |
| `GET` | `/firms/:id` | detalle |
| `PATCH` | `/firms/:id` `{ name }` | renombrar |

→ Habilita la pantalla “ver/crear/editar firmas” que faltaba. La fusión sigue en `POST /firms/merge` (ojo: hoy pide IDs a mano, sin preview — ver preguntas).

---

## 4. `/leads-assigned` (RESUELTO con el FE)

Las rutas legacy `/leads-assigned` (`GET`, `POST`, `PUT`, `DELETE`) ahora son **solo admin**. El FE confirmó que solo las usa en pantallas admin (LawyerManagement, LeadManagement) → **no rompe a los abogados**. Los writes de asignación ya están migrados al flujo moderno:
- Asignar: `PATCH /leads/:id/assign` (admin)
- Desasignar / devolver: `PATCH /leads/:id/unassign` (admin y lawyer)
- Tomar del pool (abogado): `POST /leads/pull`
- Ver pool: `GET /leads/pool`

**✅ Cambio backend nuevo:** `DELETE /leads/:id` ahora **limpia la asignación en cascada** (borra la fila de `leads_assigned` automáticamente). → El FE puede **eliminar la 2ª llamada** `DELETE /leads-assigned/lead/:id` (LeadManagement.tsx:471-472); ya no hace falta. Con eso los writes de `/leads-assigned` quedan totalmente deprecables.

---

## 5. Contrato de errores

| Caso | Antes | Ahora | Acción FE |
|---|---|---|---|
| Crear abogado con email repetido | `500` genérico | `409 { message: "Email already registered" }` | mapear `409` → “ese correo ya existe” |
| Acceso sin permiso | variado | `401` (sin token) / `403` (rol) | manejar ambos |
| Recurso de otra firma | `200` (fuga) | `404` | tratar como “no encontrado” |

---

## 6. ✅ RESPUESTAS DEL FE + DECISIONES (recibidas)

El FE ya respondió las 5 preguntas. Resumen + decisión:

- **P1 `/leads-assigned`** → solo se usa en pantallas admin; **sin impacto en abogados**. Resuelto (+ cascade-clean, §4).
- **P2 notificaciones** → el bell admin usaba `GET /notifications` como feed **global** (esa era la causa del “4 duplicados”). **DECISIÓN: se mantiene scopeado al usuario** (cada admin ve su propia copia, 1 no 4). El FE debe apuntar el bell admin al `GET /notifications` scopeado (no tratarlo como global). Si el cliente pide una vista de supervisión global aparte, se agregaría un endpoint dedicado — por ahora **NO** se hace.
- **P3 listado abogados** → ningún no-admin lista global → firm-scope seguro. Resuelto.
- **P4 auth** → el FE manda Bearer en todo (salvo Cloudinary a servicio externo). Resuelto.
- **P5 errores** → manejo per-screen; los 2 casos nuevos (409 crear-abogado, 404 lead) los adapta el FE (§9).

---

## 7. DECISIONES DE PRODUCTO PENDIENTES (bloquean más backend)

Estas NO son de frontend, son de negocio (Sergio / cliente). Las listamos para que el FE sepa que esa lógica **aún no es final**:

1. ¿Un **admin** puede recibir leads (rol dual) o admin y abogado son excluyentes?
2. ¿**“Send Back” (devolver)** y **“Lost” (perdido)** son el mismo evento o distintos?
3. ¿La **papelera (Trash)** es recuperable o borrado definitivo?
4. ¿Marcar un lead como **spam** lo mete solo a la lista negra o alguien lo confirma?
5. ¿**Quién crea firmas**: solo super-admin, admin de firma, o ambos? (hoy: global-admin por defecto)
6. ¿Borrar un abogado que **ya tiene historial** se bloquea o se anonimiza? (hoy el borrado libera sus leads, pero puede fallar si tiene notificaciones/historial de login por integridad referencial)
7. ¿El **email** de un abogado es único en todo el sistema o solo dentro de su firma? (hoy: único global)

---

## 8. Cosas que siguen siendo 100% frontend (sin cambios de backend)
- Password/campos prellenados por el navegador (autocomplete).
- La flecha del selector de “ítems por página”.
- Que al hacer clic en una notificación abra su detalle (el backend ya devuelve `entity_type` + `entity_id` para el deep-link a `/leads/:id`).
- Responsive del dashboard (tarjeta “Pipeline Overview” que se corta).
- Unificar los nombres de estados de un lead en la UI (backend expone un enum único; el “5 nombres para un estado” es copy del FE) — pendiente de la decisión P2 de producto.

---

## 9. ✅ FE TODO — lo que falta hacer en frontend

Ordenado por prioridad. El backend ya entrega todo lo necesario para estos.

### Alta prioridad (por los cambios de seguridad ya desplegables)
1. **Manejar `401` de forma global** — wrapper/interceptor que en `401` haga logout + redirect a login. Hoy es per-screen e inconsistente; con endpoints ahora protegidos, un token expirado sale sin Bearer → 401 y el FE debe reaccionar.
2. **Manejar `404` “sin acceso / no encontrado”** en detalle/timeline/edición de lead y detalle de abogado (antes 200; ahora un recurso de otra firma da 404). Mostrar “no encontrado”, no un toast genérico.
3. **Manejar `409` al crear abogado** en LawyerManagement (hoy: toast genérico “Email exists or error to create lawyer”). Ramificar `code===409` → “ese correo ya existe”. Signup y my-firm/members ya lo hacen — copiar ese patrón.
4. **Bell admin** → apuntar a `GET /notifications` scopeado (ya no es global). Ya manda token; solo cambia la expectativa (deja de ver duplicados).

### Media prioridad (adoptar lo nuevo)
5. **Leído/no-leído (D3)** — migrar de `PUT /notifications/:id {is_active:true}` + conteo client-side a: contador `GET /notifications/unread-count` · marcar una `PATCH /notifications/:id/read` · marcar todas `POST /notifications/read-all`. **NO** seguir usando `is_active` como flag de leído (el estado nuevo es `read_at`).
6. **Cola de spam** — apuntar a `GET /leads/review` (trae `spam_score`/`spam_reasons`) + acciones `PATCH /leads/:id/mark-valid` / `mark-spam`. “Spam Settings” es el catálogo de reglas, no la cola de detecciones.
7. **Firmas** — construir listar/crear/ver/renombrar con `GET/POST /firms`, `GET/PATCH /firms/:id`.
8. **Quitar la 2ª llamada** `DELETE /leads-assigned/lead/:id` al borrar lead (el backend ya limpia en cascada, §4).

### Baja / cosmético (100% FE, sin backend)
9. Autocomplete del navegador (password/firma prellenados).
10. Flecha del selector de “ítems por página” + recordar el valor.
11. Deep-link al hacer clic en una notificación (el backend ya da `entity_type`+`entity_id`).
12. Responsive del dashboard (Pipeline Overview cortado).
13. Unificar nombres de estados en la UI (un label por estado) — depende de decisión de producto #2.

### Bloqueado por decisión de producto (no codificar aún — §7)
Rol dual admin · Send Back vs Lost · papelera recuperable · spam→blacklist auto · quién crea firmas · borrado con histórico · unicidad de email. Afectan FE y BE; esperar respuesta del cliente.
\