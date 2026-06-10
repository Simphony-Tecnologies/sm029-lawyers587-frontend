# Backend Request: Lawyers Cannot Change Lead Status

**Priority:** P0 — Blocker
**Reporter:** Frontend team
**Date:** 2026-06-10

---

## El problema

Cuando un lawyer intenta cambiar el status de un lead desde su vista (`/all-leads`), el backend retorna:

```
PUT /leads/1140 → 403 Forbidden
{
  "message": "Role \"lawyer\" cannot modify field \"status\" on lead",
  "error": "Forbidden",
  "statusCode": 403
}
```

Esto bloquea **TODAS** las transiciones de status desde la vista del lawyer:
- ASSIGNED → In Progress
- ASSIGNED → Waiting on Client *(nuevo status)*
- ASSIGNED/IN PROGRESS → Flagged (PROBLEMATIC)
- ASSIGNED/IN PROGRESS → Retained (CLOSED)

El unico flujo que **podria** funcionar es "Send back" porque usa `PATCH /leads/:id/unassign` en vez de `PUT /leads/:id`. Pero el lawyer no puede avanzar su trabajo (mover leads a In Progress, marcar Flagged, cerrar como Retained, etc.).

---

## Analisis: como funciona el frontend actualmente

El frontend usa distintos endpoints segun el tipo de transicion:

```
Lawyer cambia status de lead asignado:
├── Status = LOST / SEND_BACK
│   └── PATCH /leads/:id/unassign  { status, comment }  ← probablemente funciona
│
├── Status = IN PROGRESS / WAITING_ON_CLIENT / PROBLEMATIC / CLOSED
│   └── PUT /leads/:id             { status, comment }  ← BLOQUEADO (403)
│
└── Status = ARCHIVED
    └── No disponible para lawyers (correcto)
```

```
Admin cambia status de lead:
├── Status = LOST / SEND_BACK (lead tiene lawyer)
│   └── PATCH /leads/:id/unassign  { status, comment }  ← funciona
│
├── Status = LOST / SEND_BACK (lead sin lawyer, ej: NEW)
│   └── PUT /leads/:id             { status, comment }  ← funciona
│
├── Status = ARCHIVED
│   └── PUT /leads/:id/archive     { comment }          ← funciona
│
├── Status = cualquier otro
│   └── PUT /leads/:id             { status, comment }  ← funciona
│
└── Bulk status change
    └── PATCH /leads/bulk/status   { lead_ids, status, comment } ← funciona
```

**Conclusion:** El `PUT /leads/:id` tiene un guard que bloquea el campo `status` para el rol `lawyer`, pero es el unico endpoint que el frontend puede usar para transiciones que NO son unassign/archive.

---

## Impacto en el negocio

Sin esta capacidad, un lawyer no puede:
1. Empezar a trabajar un lead (→ In Progress)
2. Marcar que espera respuesta del cliente (→ Waiting on Client)
3. Reportar un lead problematico (→ Flagged)
4. Cerrar un lead exitosamente (→ Retained/Closed)

El unico workflow disponible es: pull lead del pool → send back. No puede hacer nada intermedio.

---

## Propuesta de solucion

### Opcion A (recomendada): Permitir `status` en PUT /leads/:id para lawyers en sus propios leads

En el guard de campos por rol del `PUT /leads/:id`, agregar `status` como campo permitido para lawyers **cuando el lead esta asignado a ese lawyer**.

Transiciones permitidas para lawyer:
| Desde | Hacia | Requiere comment |
|-------|-------|-----------------|
| ASSIGNED | IN PROGRESS | No |
| ASSIGNED | WAITING_ON_CLIENT | Si (ya validado) |
| ASSIGNED | PROBLEMATIC | Si |
| ASSIGNED | CLOSED | No |
| IN PROGRESS | WAITING_ON_CLIENT | Si |
| IN PROGRESS | PROBLEMATIC | Si |
| IN PROGRESS | CLOSED | No |
| WAITING_ON_CLIENT | IN PROGRESS | No |
| WAITING_ON_CLIENT | PROBLEMATIC | Si |
| WAITING_ON_CLIENT | CLOSED | No |

Transiciones que el lawyer **NO** deberia poder hacer:
- Cualquier cosa → NEW (eso es admin/cron)
- Cualquier cosa → ASSIGNED (no puede re-asignar)
- Cualquier cosa → DISABLED (admin only)
- Cualquier cosa → ARCHIVED (admin only)
- Cualquier cosa → EXPIRED (cron only)

Validacion adicional:
- `lead.assigned_lawyer_id === request.user.id` (solo sus propios leads)
- Mantener la validacion de `comment` obligatorio para WAITING_ON_CLIENT, PROBLEMATIC, LOST, SEND_BACK
- LOST y SEND_BACK siguen usando `/unassign` (el frontend ya rutea a ese endpoint)

### Opcion B: Nuevo endpoint PATCH /leads/:id/status

```
PATCH /leads/:id/status
Body: { status: LeadStatus, comment?: string }
Auth: lawyer (own leads) + admin (any lead)
```

Ventaja: no modifica el guard existente de PUT.
Desventaja: endpoint nuevo, hay que actualizar el frontend para usarlo.

### Opcion C: Habilitar PATCH /leads/bulk/status para lawyers (workaround)

Si `PATCH /leads/bulk/status` no tiene la misma restriccion de rol, el frontend podria usarlo con `lead_ids: [singleId]` como workaround temporal. Pero es un hack — no es la solucion correcta.

---

## Contexto adicional: WAITING_ON_CLIENT

El nuevo status `WAITING_ON_CLIENT` ya esta integrado en frontend (commits de hoy). El frontend ya:
- Lo muestra en el sidebar del lawyer con filtro
- Tiene KPI y pipeline chart en el dashboard lawyer
- Requiere comment obligatorio (alineado con backend)
- Lo cuenta como lead activo en la capacidad

Solo falta que el lawyer pueda efectivamente transicionar a este status, que es parte del mismo bloqueo del PUT.

---

## Para verificar

Una vez aplicado el fix, este curl deberia funcionar (reemplazar token y id):

```bash
curl -X PUT http://localhost:3000/leads/1140 \
  -H "Authorization: Bearer <LAWYER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status": "IN PROGRESS"}'
```

Esperado: 200 OK
Actual: 403 `"Role 'lawyer' cannot modify field 'status' on lead"`

Tenemos e2e tests listos para validar: `tests/e2e/leads/lawyer-status-change.spec.ts`
