1. en la parte donde dice activiy and comments de las modales y el lead el cliente dice que la info alli mostrad es escueta y no esta bien diagramada, que el card solo muestra la persona, update y nada mas, le gustaria algo mas como: 


STATUS CHANGED

NEW → ARCHIVED

Note description....

By:
Sergio Perez (Admin)

May 27, 2026 — 7:17 AM

2. este es un punto logio que quiza podamos hacer desde el frontend revisarlo: Despues de haber sido "Archived", no hay forma de regresar al pool, bajo "New".. El admin debe poder regresar al pool.

3. de nuevo en la modal de lead info tenemos esto mas de cambio de copy realmente no complejo: Aqui se esta cambiando de "in progress" a "sent back", la nota deberia decir "Reason for Sending Back" en vez de "reason for lost"

4. en los cambios de status de un lead desde el admin deberian todos pedir una nota de la razon por la cual se cambia el status: 

ALL status changes require notes

This is the more professional/legal/audit-safe approach.

For a law platform:

Recommendation:

ALL status changes should require:

internal note/comment
timestamp
user who changed it
previous status
new status


5. recuerda esto el cliente aunque esoty seguro que esto ya esta isolated lo dejo para hacer testing de estos roles y sus permisos

ALL status changes require notes

This is the more professional/legal/audit-safe approach.

For a law platform:

Recommendation:

ALL status changes should require:

internal note/comment
timestamp
user who changed it
previous status
new status
[2:56 PM, 5/27/2026] _client-catmarketing: Sergio: RECOMMENDED USER ROLE STRUCTURE


ADMIN

Purpose:

manages platform
manages lawyers
assigns leads
overrides statuses
archives/deletes
views everything
not treated as lawyer

Admin should:

NEVER appear inside lawyer lists
NEVER count as active lawyer
NEVER receive lawyer metrics unless explicitly assigned
Have unrestricted permissions
[2:58 PM, 5/27/2026] _client-catmarketing: Sergio: Admin should NOT behave like lawyer

Separate permission logic completely.
[2:59 PM, 5/27/2026] _client-catmarketing: Sergio: ALL status changes require notes

Mandatory textarea before save.


6. en el dashboard principal del admin el filtro de tiempo esta seteado a default last week deberie estar por defecto siempre all time lo mismo que en el lawyer dashboard



