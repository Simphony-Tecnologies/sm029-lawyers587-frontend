# Barrido UI/UX — Panel Admin (navegación real en navegador)

Fecha: 2026-08-11 · Método: Claude-in-Chrome sobre `localhost:3002`, sesión admin (`admin@587lawyers.com`), backend staging remoto.
Alcance: rol **Admin** punta a punta (10 rutas + login). Foco: links rotos, elementos solapados/crasheados, puntos ciegos de UX.

## Veredicto general
La UI del panel admin está **funcional y visualmente sólida**. No hay elementos crasheados ni solapamientos reales en estado asentado, ni errores de consola observados. Los "solapamientos" que aparecen momentáneamente son la **animación de fade-in** de modales/dropdowns (asientan opacos y correctos) — NO son bugs. Hay una navegación inconclusa (stubs) y varios detalles de copy/consistencia que conviene pulir antes de entrega.

---

## Hallazgos (priorizados)

### MEDIA
1. **Sub-navegación muerta en "Lawyers".** Los sub-items del sidebar **Assigned leads**, **Lost leads** y **Reassigned** son stubs `redirect('/lawyer-management')`: los tres rebotan a la página principal. 3 de 5 sub-items no tienen vista propia → parece inconcluso y confunde.
   - `src/app/(dashboard)/lawyer-management/{assigned-leads,lost-leads,reassigned-leads}/page.tsx`
   - Fix: ocultarlos del sidebar hasta que existan, o implementar las vistas filtradas.

2. **Dashboard: tarjetas duplicadas con valores contradictorios.** "In Progress" aparece en dos tarjetas con valores distintos (6 en la fila superior *Advanced widgets*, 0 en la fila KPI). Igual "New" (0) vs "New Leads" (12). Dos sistemas de métricas con el mismo nombre en una pantalla = confusión.
   - `src/app/(dashboard)/dashboard/Dashboard.tsx` (KPI_DEFS) + `AdvancedWidgets.tsx`
   - Fix: renombrar/diferenciar claramente o unificar.

### BAJA
3. **Label de período engañoso.** Con "All time" seleccionado, el eyebrow sigue diciendo `ANALYTICS · LAST 30 DAYS` (fallback hardcodeado). `Dashboard.tsx:271-273`.
4. **Apóstrofe sobre-escapado visible.** El summary del lead muestra `We don\'t use bots` (con `\'` literal) en Lead Info. Sanitizar el render del texto.
5. **KPI cards sin tooltips (criterio 19.3).** `KpiCard.tsx` es `<button>` sin `title`/`aria-label`/tooltip → no cumple "tooltips con explicación en lenguaje llano".
6. **Login — "Forgot password" y ojo de contraseña no accesibles.** `<p onClick>` / `<i onClick>`, no focusables ni operables por teclado, sin `aria-label`. `auth.tsx:147-152, 165-170`.
7. **Login — typo de clase Tailwind.** `mt-7s` (clase inválida) en el botón Login → no aplica el margen superior. `auth.tsx:159`.
8. **Login — redirección hardcodeada.** Siempre `router.push('/dashboard')` sin importar el rol; un lawyer sufre doble redirect `/dashboard → / → /dash-lawyers`. `auth.tsx:53`.
9. **Login — bug de closure.** `database.UpdateLawyer(lastLogin, user.id)` usa el `user` viejo del closure (null en el primer login) → puede pegarle a `/lawyers/undefined`. `auth.tsx:54`.
10. **Pluralización "1 leads"** (Lead Management) — debería ser "1 lead".
11. **Breadcrumb "MY LEADS"** en el modal Lead Info dentro de la vista admin (etiqueta orientada a lawyer).
12. **Spam empty state.** "Try adjusting your filters" se muestra aun con 0 entradas totales; debería sugerir "Add Entry".
13. **Firms — merge por ID crudo.** Pide "Source firm id / Target firm id" numéricos ("e.g. 12"/"e.g. 7"); propenso a error, sin selector por nombre de firma.

### A VERIFICAR (funcional, no visual)
14. **Timeline de actividad en Lead Info** mostró un evento ASSIGN y luego "No activity yet" al reabrir rápido el mismo lead → posible race de carga async del historial. Requiere verificación funcional.

---

## NO son bugs (verificado)
- **Fade-in de modales/dropdowns**: el aspecto "lavado/solapado" es la animación de entrada; asienta opaco con backdrop. Confirmado en período-select, bulk-assign, New Lawyer, Help&FAQs.
- **AdvancedWidgets sí reaccionan al período**: re-fetchean con `periodToRange(days)` (`AdvancedWidgets.tsx:63,75`); los valores idénticos entre "All time" y "This month" fueron coincidencia de la data de prueba (todo en agosto), no un fallo.

---

## Funciona bien (confirmado en navegador)
- **Login** renderiza (split layout, validación "You must provide all fields").
- **Dashboard**: 4 advanced widgets + 8 KPIs, sparklines, PeriodSelect aplica a KPIs, **click en tarjeta → lista de leads filtrada (19.4 ✓)**, Recent activity (audit log con actor/rol/tipo/timestamp), Lawyer performance (tabla ordenable + paginación 10/22).
- **Lead Management**: filtros por estado (chips), selección múltiple + barra de acciones masivas (Assign to / Change status / Archive / Move to Trash / Delete) con **modal de confirmación y REASON requerido** (7.6/7.7/8.2), **Lead Info** (campos EMAIL/PHONE/SERVICE con candado read-only 13.5, cambio de estado, timeline, comentarios 0/500), paginación.
- **Lawyer Management**: 4 stat cards, filtros con contadores, tabla completa, **New Lawyer** (campos requeridos, upload de imagen JPG/PNG ≤2MB con validación de tipo/peso 24.12, areas of law multi-select).
- **Verification**: tabla con **formato LIC-2026-XXXXX (24.4 ✓)**, acciones Document/Approve/Reject.
- **Spam Settings**: tabs Blacklist/Suspicious Patterns, empty state, Add Entry modal.
- **Notification Settings**: Quiet Hours, Retry Policy, Deduplication, Summary Schedule (15.6/15.7/16.5), Save + Send Test Email.
- **Firms**: herramienta Merge firms con avisos (25.8/25.9).
- **Chrome/Header**: colapso de sidebar fluido (sin roturas), menú de perfil (Help & FAQs accordion, Sign out), logout con confirmación.
- **Responsive**: implementado en código (`HeaderMobile.tsx` + drawer móvil del sidebar + grids `md:/lg:`). Nota: el viewport móvil no se pudo verificar visualmente con la herramienta de navegador (captura a resolución fija 1512px) — validar en DevTools device mode / dispositivo real.

---

## No verificado (por seguridad / requiere permiso)
- **Export CSV** (Leads / Lawyers): botón presente; no ejecutado para evitar descarga sin autorización.
- **Acciones destructivas** (Delete / Move to Trash / Approve / Reject / Merge / Send Test Email): no disparadas (mutan backend / envían correo). La UX de confirmación de bulk sí se validó (modal + reason).
- **Login real**: la contraseña la ingresó el usuario (no la teclea el agente por política de seguridad).

---

## Ronda 2 — Fixes aplicados + pruebas funcionales (2026-08-11)

### Fixes aplicados
1. **Nav "Lawyers" arreglado.** `assigned-leads` y `lost-leads` `page.tsx` restaurados para renderizar sus vistas reales (existían, estaban con `redirect`). `reassigned-leads` **comentado en `routes.ts`** (oculto del sidebar) porque su vista es un placeholder honesto: no hay `action_type='reassign'` ni endpoint global de auditoría, y el DTO del lead no trae `previous_lawyer_id`. Descomentar cuando el backend lo soporte.

### Bug nuevo encontrado (MEDIA) — ✅ ARREGLADO
- **Control STATUS mostraba "Flagged" (verde) en todo lead NEW** (y por la misma causa: EXPIRED, ASSIGNED). En `LeadInfoModal`, `selectedStatus` se inicializa al estado actual `'NEW'` (LeadInfoModal.tsx:153), pero `STATUS_OPTIONS_NEW` (LeadManagement.tsx:96) **no incluye `NEW`** → el `<select>` caía a la primera opción habilitada ("Flagged"/PROBLEMATIC), mientras el estilo se calculaba de `'NEW'` (emerald). Resultado: caja verde etiquetada "Flagged", desincronización React(`NEW`) vs DOM(`Flagged`).
  - **Fix aplicado** (`LeadInfoModal.tsx`, select del status): se añade una opción **deshabilitada del estado actual** cuando no figura entre los targets, de modo que el `<select>` matchee `selectedStatus` y muestre el estado real ("New (current)") con su color correcto, sin permitir "cambiar a sí mismo". Sin regresión: si el estado actual ya está en las opciones (p.ej. PROBLEMATIC), no se agrega nada.
  - **Verificado en navegador**: lead NEW #00029 ahora muestra "New (current)" en verde. ✅

### Pruebas funcionales ejecutadas como admin (todo OK salvo lo anotado)
- **Búsqueda** (Lead Mgmt): "Bertha" filtró 19→1 en vivo, contador correcto. ✅
- **Orden**: click en "Lead" ordenó A→Z. ✅
- **Act 3 — cambio de estado exige razón**: "Save changes" sin razón → toast "A reason is required for this status change". ✅
- **Act 10 — Spam blacklist**: agregar `qa-test-block@example.com` → toast "Entry added", contador 0→1; borrado → 0 (entrada de prueba limpiada). ✅ *(nota: el borrado individual no pide confirmación)*
- **Act 8 — asignación individual + capacidad**: seleccionar lawyer + razón + "Assign lawyer" → toast accionable "This lawyer has no capacity configured. Edit the lawyer and set 'No. Leads Allowed' >= 1." Bloqueó sin mutar. ✅
- **Notification Settings — guardar**: Max retries 3→7 persistió tras reload; restaurado a 3. ✅
- **Editar abogado**: el modal carga los datos existentes correctamente (Ali Tarrabain: nombre, email, phone, firma). ✅
- **Dato inconsistente**: Ali muestra "0/40" en la tabla pero "No. Leads Allowed (per area) = 0" en el form con 0 áreas → por eso la asignación reporta "no capacity". Config de datos/backend, no UI.
