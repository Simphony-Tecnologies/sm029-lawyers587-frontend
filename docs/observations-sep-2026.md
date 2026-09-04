# Prompt maestro — Remediación QA · 587 Lawyers (admin.587lawyers.com)

> Origen: reporte de QA del cliente (Sergio Pérez, Cat Marketing) vía Telegram, 24–31 ago 2026.
> Sistema **en producción**. Toda intervención es quirúrgica, aislada y reversible.

---

## 0. Instrucciones de operación para Claude Code

**Rol:** ingeniero de mantenimiento sobre sistema productivo. No eres refactorizador ni arquitecto en greenfield.

**Reglas duras:**

1. **Fase de descubrimiento obligatoria antes de escribir código.** No asumas stack, rutas ni nombres de módulos. Para cada ítem: localiza el archivo/endpoint responsable, léelo completo, y solo entonces propón el parche.
2. **Un ítem = una rama = un commit** (`fix/<ID>-<slug>`). Nunca agrupes ítems de bloques distintos en el mismo commit.
3. **Diff mínimo.** Prohibido: renombrar variables no relacionadas, reordenar imports, reformatear archivos completos, "de paso" mejorar otra cosa. Si detectas deuda adyacente, la registras en `FOLLOWUP.md`, no la tocas.
4. **Prohibido tocar migraciones destructivas.** Cualquier cambio de esquema debe ser aditivo (nueva columna nullable, nuevo enum value) y con script de rollback explícito.
5. **Detente y pregunta** en todo ítem marcado `⛔ DECISIÓN DE PRODUCTO`. Esos no se resuelven con criterio propio: cambian la semántica del dominio.
6. **Verificación antes de cerrar:** reproducir el bug (estado previo), aplicar parche, reproducir el flujo (estado posterior), y ejecutar el flujo adyacente más cercano para descartar regresión.
7. Si el ítem no es reproducible en el entorno local, lo declaras `NO REPRODUCIBLE` con la evidencia de por qué, y no parcheas a ciegas.

**Clasificación de capa que debes emitir por ítem** (no la asumas del documento; el documento propone una hipótesis, tú la confirmas leyendo el código):

- `FE` — presentación, estado de cliente, routing, layout.
- `BE` — persistencia, endpoints, reglas de negocio, permisos, jobs.
- `FE+BE` — requiere contrato nuevo o cambio de payload.
- `PRODUCTO` — no hay bug técnico; hay ambigüedad de diseño no resuelta.

**Plantilla de salida obligatoria por ítem:**

```
ID:
CAPA CONFIRMADA:        FE | BE | FE+BE | PRODUCTO
ARCHIVOS TOCADOS:       rutas exactas
CAUSA RAÍZ:             1–3 líneas, técnica, sin hipótesis vagas
PARCHE:                 qué se cambió y por qué esa es la corrección mínima
CRITERIO DE ACEPTACIÓN: cómo verificar en producción
RIESGO DE REGRESIÓN:    qué se rompe si el parche está mal
ROLLBACK:               comando/pasos
```

**Orden de ejecución sugerido:** Bloque A → B → E → D → F → C → G.
Justificación: A y B son fallos de integridad de datos y control de acceso (impacto operativo y de seguridad). C exige decisión de producto antes de código. G es cosmético.

---

## Bloque A — Identidad, roles y permisos

### A1 · El rol admin se administra con el formulario de abogado
**Hipótesis de capa:** `FE+BE` (modelo de roles).
**Evidencia:** el usuario `Sergio Perez` (rol `admin`, `info@catmarketing.ca`) abre en el modal `LAWYER MANAGEMENT · Lawyer Details`, con campos `AREAS OF LAW`, `NO. LEADS ALLOWED (PER AREA)` y `ACTIVITY SUMMARY` (0 leads, estado `At capacity` con leyenda "This lawyer is at the limit of assigned leads").
**Reporte literal:** *"Cómo se puede crear un admin desde un panel de admin?"* / *"Un usuario admin es tratado como abogado."*

**Diagnóstico a verificar:** existe una única entidad `lawyer` sobre la que se cuelga el rol, sin separación entre `user` (identidad/rol) y `lawyer_profile` (capacidad, áreas, leads). Consecuencias observadas: un admin arrastra semántica de capacidad (`At capacity`) que no le aplica, y no existe ruta de alta de administradores.

**Alcance:**
- Determinar si el modelo actual soporta `role` como atributo o si el rol es implícito por tabla.
- Exponer creación de admin desde el panel (endpoint + acción de UI), con validación de permisos: solo `super_admin` crea `admin`.
- Suprimir en el formulario los campos de capacidad cuando `role != lawyer` (no ocultar por CSS: no enviarlos ni calcularlos).

**⛔ DECISIÓN DE PRODUCTO:** ¿un admin puede además recibir leads (rol dual), o son roles mutuamente excluyentes? La respuesta cambia el modelo de datos. No avanzar sin definición.

---

### A2 · `Error to delete lawyer` al eliminar un usuario admin
**Hipótesis de capa:** `BE`.
**Evidencia:** modal `Delete` → *"Are you sure you want to delete the user Sergio?"* → toast rojo `Error to delete lawyer`. El mismo usuario reporta que sí logró eliminar un registro en estado `pending setup`.
**Reporte literal:** *"Error al tratar de borrar un abogado. Depronto por ser Admin. Pude borrar una que decia 'pending setup'."*

**Diagnóstico a verificar:** el borrado falla probablemente por restricción de integridad referencial (FK desde `leads`, `activity_log`, `notifications` o `firm_admins`) o por una regla de permisos que impide eliminar un usuario con rol elevado. Los registros `pending setup` no tienen dependencias, por eso sí se eliminan.

**Alcance:**
- Capturar el error real del backend, no el genérico. El toast debe distinguir al menos tres casos: sin permiso (403), con dependencias (409), fallo interno (500).
- Si la causa es dependencia referencial, la corrección **no** es borrado en cascada. Es bloquear el borrado con mensaje explícito y ofrecer desactivación (ver A3).
- Verificar que el endpoint de borrado no permite auto-eliminación del usuario en sesión.

---

### A3 · `Deactivate` y `Delete` sin diferencia expuesta; el desactivado desaparece sin destino
**Hipótesis de capa:** `FE+BE` + `PRODUCTO`.
**Evidencia:** modal `Deactivate lawyer` con campo `Reason (required)`. Tras confirmar, el registro no es localizable.
**Reporte literal:** *"Cual es la diferencia entre 'deactivar' abogado y 'borrar'? Una ves deactivado, para donde se va el abogado? No se donde se fue."*

**Alcance:**
- Confirmar en BD qué hace cada acción (`status = inactive` vs `DELETE` físico vs `soft delete`).
- El listado debe exponer un filtro/segmento de inactivos. Hoy los chips visibles son `All`, `Assignable`, `At capacity`, `Unassignable`, `Pending`: falta `Inactive`.
- El `Reason` capturado debe ser consultable en la ficha del abogado y en el log de actividad. Si hoy se descarta, es pérdida silenciosa de dato de auditoría.
- La UI debe declarar la consecuencia de cada acción antes de ejecutarla (desactivar = reversible, no recibe leads; borrar = irreversible, condicionado a que no tenga histórico).

---

## Bloque B — Lawyer Management: CRUD y listado

### B1 · Abogado autenticado no aparece en el listado ni en el buscador
**Hipótesis de capa:** `BE` (scoping de query) o `FE` (filtros persistentes).
**Evidencia:** `Lawyer Demo` (`lawyer1@587lawyers.com`) opera con sesión activa. En `Lawyer Management` el encabezado indica `22 lawyers`, la búsqueda `Lawyer demo` devuelve *"No lawyers match your filters"* y el pie muestra `Showing 50 of 0 lawyers`.
**Reporte literal:** *"Este abogado no esta en la lista de abogados"* / *"No esta en la lista y no aparece en el buscador."*

**Diagnóstico a verificar (en este orden):**
1. ¿El registro existe en la tabla de abogados o solo existe como usuario de autenticación? Si es lo segundo, hay usuarios huérfanos sin perfil, y eso es un fallo de integridad, no de búsqueda.
2. ¿El listado filtra por `firm_id`? `Lawyer Demo` pertenece al dominio `587lawyers.com` y el admin en sesión a `catmarketing.ca`: posible filtrado por firma que el usuario no percibe.
3. ¿La búsqueda es case-sensitive o exige coincidencia exacta? El término consultado fue `Lawyer demo` en minúscula intermedia.
4. La contradicción `22 lawyers` en el header contra `of 0 lawyers` en el pie indica que el contador agregado y la query paginada no comparten el mismo predicado. Unificar la fuente.

**Criterio de aceptación:** todo usuario con sesión válida y rol `lawyer` debe ser recuperable por nombre, correo o código desde el panel del admin de su firma.

---

### B2 · Mensaje `Email exists or error to create lawyer` conflaciona dos causas
**Hipótesis de capa:** `BE` (tipado de error) + `FE` (mapeo a mensaje).
**Evidencia:** toast rojo al crear al abogado `Sergio Perez` con `catcreativo@gmail.com`.
**Reporte literal:** *"No deja crear usuario y el email no esta repetido."*

**Alcance:**
- El backend debe responder con código y `error_code` semántico: `EMAIL_ALREADY_EXISTS`, `VALIDATION_FAILED` (con campo), `PERMISSION_DENIED`, `INTERNAL_ERROR`.
- Verificar si la colisión ocurre contra registros **eliminados o desactivados** que conservan el correo, o contra usuarios de otra firma. Ese es el escenario más probable dado que el cliente afirma que el correo no está repetido.
- El frontend deja de concatenar causas con `or`. Un error, un mensaje.

---

### B3 · El formulario `New Lawyer` se abre con datos prellenados no intencionados
**Hipótesis de capa:** `FE`.
**Evidencia:** al abrir `New Lawyer` en limpio, `NAME OF LAW FIRM` viene con `info@catmarketing.ca` y `PASSWORD` viene con puntos.
**Reporte literal:** *"Al crear un nuevo abogado, ya tiene esta info por defecto prellenada que no deberia estar ahi"* / *"porque aparecen puntos donde va el 'password'?"*

**Diagnóstico:** autocompletado del gestor de contraseñas del navegador. El campo `NAME OF LAW FIRM` está siendo interpretado como campo de identidad y recibe el correo guardado; el campo de contraseña recibe la credencial almacenada del admin en sesión.

**Severidad real:** alta. Se pueden crear cuentas con una credencial que el operador nunca escribió ni conoce, y que además puede ser la del propio admin.

**Alcance:**
- `autocomplete="off"` no basta en Chrome. Usar nombres de campo no semánticos, `autocomplete="new-password"` en la contraseña, y `readonly` liberado en `onFocus` donde aplique.
- Resetear el estado del formulario en cada apertura del modal (no reutilizar la instancia montada).
- Añadir verificación: si el valor de contraseña no proviene de un evento de entrada del usuario, no enviarlo.

---

### B4 · `NAME OF LAW FIRM` es texto libre con semántica ambigua
**Hipótesis de capa:** `FE+BE`.
**Reporte literal:** *"Al colocar aqui un nombre de una firma, eso crea la firma?"*

**Alcance:** determinar si ese campo escribe en la tabla de firmas, si crea duplicados por variación de escritura, o si es un campo muerto. Si existe entidad `firm`, el control correcto es un selector contra el catálogo, con creación explícita separada (ver F1). Depende de F1.

---

### B5 · Selector de paginación: el chevron no responde y el valor no persiste
**Hipótesis de capa:** `FE`.
**Evidencia:** `Showing [10 ▾] of 20 lawyers`. El clic sobre la flecha no abre el desplegable; solo el número es interactivo.
**Reporte literal:** *"Al hacer click en la flecha, no pasa nada. Hay que hacer click en el numnero para poder cambiar de 10 a 20. Y siempre por defecto muestra 10, podria recordar el ultimo valor seleccionado?"*

**Alcance:**
- El ícono es decorativo y captura el evento o queda fuera del área clicable del `<select>`. Corregir el área de interacción completa, no añadir un handler al ícono.
- Persistir el tamaño de página por usuario (preferencia de sesión o local), aplicable a todas las tablas del panel para no generar comportamiento inconsistente entre módulos.

---

## Bloque C — Leads: ciclo de vida y nomenclatura

### C1 · Cinco denominaciones para un mismo estado en una sola pantalla
**Hipótesis de capa:** `PRODUCTO` → luego `BE` (enum) + `FE` (copy).
**Evidencia (lead `#00041`, Maria Restrepo):**

| Ubicación | Texto |
|---|---|
| Badge de cabecera | `Sent back` |
| Fila de estado | `Send Back` |
| Banner de advertencia | "Once marked as **lost**…" |
| Botón de confirmación | `Mark as Lost` |
| Log de actividad (tipo) | `UNASSIGN` |

**Reporte del QA:** el mismo lead se llama *Sent Back*, *Send Back*, *Lost* o *Unassign* según dónde se mire, y no queda claro si `Mark as Lost` y `Send Back` son dos conceptos distintos fusionados en una pantalla.

**Alcance:**
1. Levantar el enum real de estados en base de datos y el enum de tipos de acción del log.
2. Construir la tabla de correspondencia estado interno ↔ etiqueta visible, una sola etiqueta por estado.
3. Sustituir copies en un único punto de verdad (catálogo de labels), no cadena por cadena dispersa en componentes.

**⛔ DECISIÓN DE PRODUCTO:** ¿`Send Back` (el abogado devuelve el lead al pool) y `Lost` (el lead se descarta del negocio) son el mismo evento? Operativamente no lo son: uno debería devolver el lead al pool asignable y el otro cerrarlo. Que hoy compartan botón sugiere fusión indebida. Requiere definición del cliente antes de tocar el enum.

---

### C2 · `Move to Trash` y `Mark as Lost` conviven sin diferenciación
**Hipótesis de capa:** `PRODUCTO` + `FE`.
**Alcance:** determinar si son dos rutas de rechazo distintas (papelera recuperable vs cierre definitivo) o si una es residual. Si son distintas, la UI debe declarar el destino de cada una. Si son redundantes, se elimina una y se migra su histórico.

---

### C3 · Verificar que la permanencia declarada se cumple en backend
**Hipótesis de capa:** `BE`.
**Evidencia:** el banner afirma que la acción es permanente, que el lead no se reintegra a la cola activa y que será revisado por el super admin.
**Alcance:** confirmar que (a) el estado es efectivamente terminal y ningún endpoint lo revierte, y (b) existe la notificación o cola de revisión para el super admin. Si el texto promete un comportamiento que no existe, es o corrección de código o corrección de copy: decidir con el cliente cuál.

---

## Bloque D — Notificaciones

### D1 · El clic en una notificación no abre detalle ni enlaza al recurso
**Hipótesis de capa:** `FE` + `BE` (payload).
**Reporte literal:** *"Al hacer click en una notificacion no muestra nada adicional. No se puede ver la notificion completa."* / *"lleva a 'leads manage' pero no muestra nada relevante a la notificacion."*

**Alcance:**
- Verificar si la notificación persiste el identificador del recurso (`lead_id`). Si no lo hace, el enlace profundo es imposible y la corrección empieza en el backend.
- El clic debe navegar al recurso concreto (`/leads/:id` o listado con el lead preseleccionado), no a la vista raíz.
- Texto truncado: exponer contenido completo en el panel, con `title`/expansión, sin depender de la navegación.

### D2 · Cuatro notificaciones idénticas por un mismo evento
**Hipótesis de capa:** `BE`.
**Evidencia:** cuatro entradas `Lead "spam" has been flagged as poten…` con marca de tiempo `08/24/2026 06:25 am` idéntica, para un único lead cargado.
**Reporte literal:** *"Subi un lead llamado Spam y hay 4 notificaciones sobre este."*

**Alcance:** identificar si el emisor se dispara por regla (una notificación por patrón coincidente), por reintento, o por trigger duplicado. Corrección: clave de idempotencia por `(evento, recurso, destinatario)` y agregación de motivos en una sola notificación.

### D3 · Contador de 50 sin gestión de lectura por ítem
**Hipótesis de capa:** `FE+BE`.
**Alcance:** marcar leído individual y masivo, y que el contador refleje no leídos reales. Verificar que existe el campo de estado de lectura; si no existe, es cambio aditivo de esquema.

---

## Bloque E — Spam

### E1 · El lead marcado como potencial spam no aparece en `Spam Settings`
**Hipótesis de capa:** `BE` + `PRODUCTO`.
**Evidencia:** las notificaciones confirman el flag sobre el lead `spam`, pero `Spam Settings` muestra `Blacklist 0`, `Suspicious Patterns 0` y `Showing 20 of 0 entries`.
**Reporte literal:** *"Luego reviso aqui y no se ve el lead de spam."*

**Diagnóstico a verificar:** probable confusión de dominio. `Spam Settings` podría ser el catálogo de **reglas** (correos y patrones bloqueados) y no el registro de **detecciones**. Si es así, no hay bug de datos, hay ausencia de una vista: falta el listado de leads marcados como spam con su motivo y acción de resolución.

**Alcance:**
- Confirmar qué persiste el detector y dónde.
- Si el flag no genera entrada consultable en ninguna vista, el operador no puede auditar falsos positivos: eso es fallo funcional, no cosmético.
- Definir con el cliente si marcar un lead como spam debe alimentar automáticamente la blacklist o requiere confirmación manual.

---

## Bloque F — Firms

### F1 · La sección `Firms` solo permite fusionar; no crear ni listar
**Hipótesis de capa:** `BE` (endpoints) + `FE` (vistas).
**Evidencia:** `Firms` renderiza únicamente `Merge firms` (source firm id → target firm id, por identificador numérico manual).
**Reporte literal:** *"En 'firms' no se deberia poder crear un 'firm'? Como se crean las firmas de abogados? Donde se ven las firmas creadas?"*

**Alcance:**
- Listado de firmas con identificador, nombre, cantidad de abogados y estado (incluido `merged`).
- Alta y edición de firma.
- `Merge firms` debe operar sobre selectores del catálogo, no sobre IDs escritos a mano: hoy un error de digitación fusiona firmas equivocadas de forma irreversible. Añadir confirmación con nombres resueltos ("Vas a mover N abogados de X a Y").
- Bloquea a B4: el campo de firma en el formulario de abogado depende de que exista este catálogo.

---

## Bloque G — Interfaz responsive

### G1 · Dashboard del rol abogado: `Pipeline Overview` se corta
**Hipótesis de capa:** `FE`.
**Evidencia:** en el dashboard `Lawyer Demo` (`13 active of 50 capacity`), la tarjeta `Pipeline Overview` con el gráfico de dona queda cortada en el borde derecho del contenedor; los valores de `Active`, `Waiting`, `Flagged` y `Retained` se truncan.
**Reporte literal:** *"Aqui se puede mejorar la parte responsive?"*

**Alcance:** el grid de tarjetas no colapsa a una columna en anchos reducidos y la tarjeta de pipeline mantiene ancho mínimo mayor que el disponible. Corregir en el sistema de grid del dashboard, no con `overflow` ni con anchos fijos por tarjeta. Verificar en 390 px, 768 px, 1024 px y 1440 px.

---

## Registro de decisiones de producto pendientes

Bloquean el código. Recolectar respuesta del cliente antes de ejecutar los ítems asociados.

| # | Pregunta | Bloquea |
|---|---|---|
| 1 | ¿Un admin puede recibir leads, o los roles son excluyentes? | A1 |
| 2 | ¿`Send Back` y `Mark as Lost` son el mismo evento o dos distintos? | C1, C2 |
| 3 | ¿`Move to Trash` es papelera recuperable o cierre definitivo? | C2 |
| 4 | ¿Marcar un lead como spam alimenta la blacklist automáticamente? | E1 |
| 5 | ¿Quién puede crear firmas: super admin, admin de firma, o ambos? | F1 |
| 6 | ¿El borrado de abogado con histórico debe bloquearse o anonimizarse? | A2, A3 |

---

## Entregable esperado

Al cerrar el ciclo, produce `REMEDIATION-REPORT.md` con: la plantilla completa por ítem, la matriz final `ID → capa → estado (corregido / bloqueado / no reproducible)`, y el orden de despliegue con sus dependencias.