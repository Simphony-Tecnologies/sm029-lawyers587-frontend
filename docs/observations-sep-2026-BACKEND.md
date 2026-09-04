# Backend-only — hand-off quirúrgico (observations-sep-2026)

> Re-validado leyendo el código FE de primera mano (2026-09-01). Objetivo: aislar lo que el
> backend puede resolver **solo**, de forma **aditiva** y con **impacto 0 en el frontend**.
> Regla: si arreglarlo obliga a tocar el FE, NO está en la Categoría A.

---

## Categoría A — Backend resuelve el bug reportado con 0 cambios en FE

El frontend ya está correcto; basta el fix de servidor. **Certeza alta.**

### D2 · 4 notificaciones idénticas por un evento
- **Backend (aislado):** idempotencia en el emisor: clave `(evento, lead_id, destinatario)` antes del INSERT + (opcional) constraint único con ventana temporal. Revisar si el trigger se dispara 1 vez por patrón/regla coincidente o por reintento del job (Bull).
- **Por qué FE impacto 0:** la campana solo hace `GET` y renderiza lo que llegue. No hay emisión en el FE. `useNotifications.ts:33-70` (fetch+parse+render), `database.ts:1241-1294` (namespace `notifications`: settings/preferences/history/schedule/test — **sin emit del flag de spam**). Si el backend manda 1, el FE muestra 1.

### B1 (core) · Abogado autenticado no aparece en lista ni buscador
- **Backend (aislado):** corregir el scoping/integridad de `GET /lawyers` para que el registro se devuelva (verificar: (1) existe fila en `lawyers` o es usuario auth huérfano sin perfil; (2) filtro por `firm_id` que excluye al abogado — admin `catmarketing.ca` vs lawyer `587lawyers.com`).
- **Bonus backend-only:** la contradicción **"22 lawyers vs Showing 0"** se corrige sola si `GET /lawyers/stats` usa **el mismo predicado** que `GET /lawyers`. El header pinta `statsServer.total`, la tabla cuenta la lista. Unificar el predicado alinea ambos sin tocar FE.
- **Por qué FE impacto 0:** el FE pide `/lawyers` **sin params** y busca client-side case-insensitive. `LawyerManagement.tsx:118-119` (fetch sin query), `:908-925` (search en memoria), `:889` (`kpis.total = statsServer?.total ?? localTotal`).
- **⚠️ Restricción quirúrgica:** **NO cambiar la forma de la respuesta.** El FE hace `data.map(...)` sobre un **array plano** en `response.data` (`LawyerManagement.tsx:125-128`). Envolver en paginado `{data:[...]}` rompería el listado. Mantener el shape actual.

### B2 (core) · "Email exists or error to create lawyer" con email no repetido
- **Backend (aislado):** revisar el dedup/unique-constraint de `POST /lawyers`: la colisión probable es contra registros **soft-deleted/desactivados** que conservan el correo, o de **otra firma** (scoping). Que un email válido deje de rechazarse.
- **Por qué FE impacto 0:** el FE ya envía el create y maneja el éxito. `LawyerManagement.tsx:465-470`, `database.ts:602-618` (`CreateLawyer` retorna `{success, code, data}`). Si el backend deja de rechazar → creación OK, sin tocar FE.
- *(La diferenciación de mensajes de error es mejora FE OPCIONAL — ver Categoría B/A2, no bloquea el core.)*

---

## Categoría B — Backend prepara ADITIVAMENTE (0 impacto ahora), pero necesita follow-up FE

Estos NO se resuelven solos: el cambio de servidor es seguro y no rompe el FE actual, pero el
valor solo aparece cuando el FE consume lo nuevo. **Backend puede avanzar sin bloquear al FE.**

- **A1** — aceptar `role_id=1` en `POST /lawyers` + endpoint de alta de admin + enforcement "solo admin global crea admin". Aditivo: el FE hoy hardcodea `role_id:2` (`LawyerManagement.tsx:458`) y no se entera. *(Follow-up FE: selector de rol + ocultar capacidad.)*
- **D1** — rellenar `entity_type='lead'` + `entity_id` en el payload de notificación (el DTO ya los declara, `api.types.ts:418-419`). Aditivo: el FE ignora campos extra (`NotificationItem [k:string]:any`). *(Follow-up FE: leer entity_id y deep-link.)*
- **D3** — **añadir** columna `is_read`/`read_at` por destinatario + endpoints mark-read (individual/bulk) + unread-count desacoplado del page de 50. *(Follow-up FE: consumir el campo real + arreglar el dot.)*
- **A2 / A3** — devolver `statusCode`+`message` diferenciados (403/409/500) en `DELETE /lawyers/:id`; **guardar el `comment`/reason** de deactivate en `audit_log` y exponerlo en `/lawyers/:id/history`; definir política de borrado con histórico. El service FE **ya captura** `statusCode`+`message` (`database.ts:838-843`), pero el componente muestra un string fijo → sin follow-up FE no se ve.
- **B4 / F1** — exponer `GET` catálogo de firmas + create/edit + aceptar `firm_id` en `POST/PUT /lawyers`. Hoy `firms.*` solo tiene `merge` (`database.ts` ~1315-1363). Aditivo. *(Follow-up FE: listado + selector; hoy el FE está bloqueado.)*

---

## Categoría C — Backend NO tiene nada que hacer (es FE, o solo verificar)

No meter mano de servidor aquí; sería impacto sin necesidad.
- **B3, B5, E1, G1** — 100% frontend (autofill, chevron/paginación, copy Spam Settings, responsive).
- **C1** — consolidación de labels es FE. Backend solo **confirma** que emite un único enum `LOST` (verificación, no cambio de código). Si Producto decide separar Send Back ≠ Lost, eso es feature nuevo, no bug.

---

## 🚨 Minas para "impacto 0" — el backend NO debe:

1. **Reusar/cambiar la semántica de `is_active` en notificaciones.** El FE lo usa como estado de lectura: `is_active===false` = **no leído** (`useNotifications.ts:62`, `:81`, `:100`). Para D3, **agregar** `is_read`/`read_at`; nunca repurposar `is_active`.
2. **Cambiar la forma de `GET /lawyers`** (array plano). El FE hace `data.map` directo (`LawyerManagement.tsx:128`).
3. **Renombrar/split del enum de status de lead** (`LOST`) sin coordinar. El FE tiene mapas de label keyed en él (C1, `leadStatusMeta.ts` + `StatusPill`/`SortableTable`/`IdLawyer`).

---

## Resumen ejecutivo

| Categoría | Ítems | Acción backend | Impacto FE |
|-----------|-------|----------------|------------|
| **A — resuelve solo** | D2, B1 (core), B2 (core) | fix aislado | **0** |
| **B — prepara aditivo** | A1, D1, D3, A2, A3, B4, F1 | additivo (col/endpoint/error_code) | 0 ahora, follow-up FE luego |
| **C — no tocar** | B3, B5, E1, G1, C1 | nada / solo confirmar | — |

**Backend puede desplegar la Categoría A ya, en ramas separadas, sin coordinar con el FE.**
