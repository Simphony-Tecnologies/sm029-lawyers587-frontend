# QA de Aceptación — 587 Lawyers, Fase 2

Ref: STG-587L-PH2-2026
Alcance: 22 de 31 actividades. 5 fases. 155 criterios.
Marcar: `[x]` OK · `[!]` Falla · `[b]` Bloqueado · `[-]` N/A

---

## Pendientes de definición (resolver antes de ejecutar)

- [ ] D1. El resumen ejecutivo dice "31 actividades", el alcance real cubre 22. Confirmar cifra vinculante por escrito.
- [ ] D2. El criterio "última conexión" (12.4) depende del session tracking de la Act. 18, que está fuera de alcance.
- [ ] D3. No hay umbral de latencia para "resultados sin recarga" (1.7) ni intervalo para "números autoactualizables" (19.6).
- [ ] D4. El filtro por *score* (1.5) usa una variable cuyo origen y cálculo no aparecen en el documento.

---

# FASE 1 — Lead Management & History Core

## Act. 1 — Filtros avanzados y búsqueda

- [ ] 1.1 Filtro por fuente (chatbot / formulario web)
- [ ] 1.2 Filtro por estado del lead
- [ ] 1.3 Filtro por abogado asignado
- [ ] 1.4 Filtro por rango de fechas
- [ ] 1.5 Filtro por score
- [ ] 1.6 Filtros combinados actuando simultáneamente (AND, no reemplazo)
- [ ] 1.7 Resultados se actualizan sin recarga de página
- [ ] 1.8 Exportación CSV respeta los filtros aplicados (no exporta todo)
- [ ] 1.9 CSV abre con tildes y ñ correctas (UTF-8 + BOM) y delimitador estable

## Act. 2 — Lead Info expandido

- [ ] 2.1 Vista de detalle ampliada respecto a la versión anterior
- [ ] 2.2 Fecha de ingreso visible en el encabezado
- [ ] 2.3 `pull_date` visible en el encabezado
- [ ] 2.4 Etiqueta "New Lead" con enlace directo funcional
- [ ] 2.5 Timeline de cambios embebido en la vista
- [ ] 2.6 Comentarios muestran autor, rol, fecha y tipo de nota

## Act. 3 — Cambio de estado con comentario obligatorio

- [ ] 3.1 Estado "Problematic" exige razón para guardar
- [ ] 3.2 Estado "Send Back" exige razón para guardar
- [ ] 3.3 Botón Guardar deshabilitado hasta que haya comentario
- [ ] 3.4 **CRÍTICO** — La validación también aplica en servidor: petición directa a la API sin comentario es rechazada
- [ ] 3.5 Historial registra abogado, razón y timestamp del cambio

## Act. 4 — Send Back / liberar el cupo

- [ ] 4.1 **CRÍTICO** — Operación atómica: cambio de estado + desasignación + log en una sola transacción
- [ ] 4.2 **CRÍTICO** — Si falla un paso intermedio no queda estado parcial (rollback verificado)
- [ ] 4.3 El lead vuelve a estar disponible para reasignación
- [ ] 4.4 Historial registra abogado, razón y fecha/hora

## Act. 7 — Asignación y reasignación masiva

- [ ] 7.1 Checkboxes de multiselección en el listado
- [ ] 7.2 Acción masiva "Assign to"
- [ ] 7.3 Acción masiva "Change status"
- [ ] 7.4 Acción masiva "Archive"
- [ ] 7.5 Acción masiva "Delete"
- [ ] 7.6 Confirmación previa obligatoria antes de ejecutar
- [ ] 7.7 **CRÍTICO** — Un registro de historial por cada lead afectado, no uno agregado
- [ ] 7.8 Operación masiva sobre volumen alto (≥100 leads) no rompe ni deja registros a medias

## Act. 8 — Reasignación individual desde Lead Info

- [ ] 8.1 Dropdown "Assign to" presente en el detalle del lead
- [ ] 8.2 Historial registra quién cambió, cuándo y la razón opcional
- [ ] 8.3 El abogado anterior recibe notificación de la desasignación

## Act. 11 — Historial completo de cambios (CRÍTICO)

- [ ] 11.1 **CRÍTICO** — Se registra entidad afectada
- [ ] 11.2 **CRÍTICO** — Se registra actor con nombre + rol
- [ ] 11.3 **CRÍTICO** — Se registra tipo de acción
- [ ] 11.4 **CRÍTICO** — Se registran valor anterior y valor nuevo
- [ ] 11.5 **CRÍTICO** — Se registra timestamp
- [ ] 11.6 Se registra fuente del cambio
- [ ] 11.7 Se registra el comentario asociado
- [ ] 11.8 Timeline legible en Lead Info
- [ ] 11.9 Historial filtrable por tipo de acción
- [ ] 11.10 Exportación a PDF
- [ ] 11.11 Exportación a CSV
- [ ] 11.12 **CRÍTICO** — El registro es automático: ninguna ruta de escritura (masiva, API, chatbot) evade el historial

## Act. 12 — Historial y auditoría por abogado

- [ ] 12.1 Página de historial personal por abogado
- [ ] 12.2 Registra cambios de perfil
- [ ] 12.3 Registra leads asignados y desasignados
- [ ] 12.4 **CRÍTICO** — Muestra última conexión (ver D2: depende de Act. 18, fuera de alcance)
- [ ] 12.5 Registra cambios de estado gestionados por ese abogado
- [ ] 12.6 Exportación a PDF y CSV

## Act. 13 — Campos editables y permisos por rol

- [ ] 13.1 Admin puede editar estado, asignación y campos de contacto
- [ ] 13.2 Abogado solo puede editar sus propios comentarios
- [ ] 13.3 **CRÍTICO** — Abogado NO puede editar comentarios de otro abogado
- [ ] 13.4 Fecha de ingreso, fuente y logs históricos son de solo lectura
- [ ] 13.5 Campos protegidos muestran icono de candado
- [ ] 13.6 Todo intento de edición queda registrado, incluidos los rechazados
- [ ] 13.7 **CRÍTICO** — Permisos validados en servidor: petición API con rol abogado sobre campo protegido es rechazada

## Act. 14 — Comentarios con autor y tipo de nota

- [ ] 14.1 Cada comentario muestra autor, rol, fecha y tipo
- [ ] 14.2 Selector con los tres tipos: internal / client-facing / urgent
- [ ] 14.3 Filtrable por tipo dentro de Lead Info
- [ ] 14.4 Persistido en base de datos y reflejado en historial

---

# FASE 2 — Trash, Spam & Notifications

## Act. 9 — Papelera y archivado

- [ ] 9.1 Marcar lead como "Archived"
- [ ] 9.2 Mover lead a "Trash"
- [ ] 9.3 Los archivados quedan ocultos del listado estándar
- [ ] 9.4 Los archivados son restaurables
- [ ] 9.5 Sección "Trash" con sus propios filtros
- [ ] 9.6 Restauración en un clic
- [ ] 9.7 **CRÍTICO** — Eliminación permanente restringida a admin
- [ ] 9.8 Eliminación individual desde Lead Info solo para admin
- [ ] 9.9 Purga automática gobernada por `TRASH_RETENTION_DAYS` (probar con valor corto)
- [ ] 9.10 Toda acción de archivado/eliminación queda en historial
- [ ] 9.11 **CRÍTICO** — Eliminar un lead no rompe ni borra su rastro en el historial de auditoría

## Act. 10 — Detección y filtrado de spam

- [ ] 10.1 Bloqueo por lista negra de correos
- [ ] 10.2 Detección de valores sospechosos en campos ("Test", "Admin")
- [ ] 10.3 Detección de correos duplicados en ventana corta de tiempo
- [ ] 10.4 **CRÍTICO** — Lead marcado como "Review": se guarda pero NO se auto-asigna
- [ ] 10.5 Admin puede sobrescribir: marcar como spam o como válido
- [ ] 10.6 CAPTCHA/reCAPTCHA activo en formularios de captura
- [ ] 10.7 Falso positivo: un lead legítimo con datos normales no cae en Review

## Act. 15 — Tipos de notificación y ajustes globales

- [ ] 15.1 Notificación Immediate (asignación / eventos urgentes)
- [ ] 15.2 Notificación Scheduled (hora específica)
- [ ] 15.3 Resumen diario
- [ ] 15.4 Resumen semanal
- [ ] 15.5 Recordatorio de calendario
- [ ] 15.6 Quiet hours configurables (inicio/fin) y realmente respetadas
- [ ] 15.7 Política de reintentos: máximo de intentos + backoff
- [ ] 15.8 Política de recordatorio por defecto aplicada

## Act. 16 — Ajustes por abogado y deduplicación

- [ ] 16.1 Cada abogado elige qué tipos de notificación recibir
- [ ] 16.2 Pausar y reanudar notificaciones
- [ ] 16.3 Canal preferido: email, SMS o ambos
- [ ] 16.4 **CRÍTICO** — SMS entrega efectivamente (proveedor configurado y con saldo)
- [ ] 16.5 Deduplicación dentro de `NOTIF_DEDUP_MINUTES`
- [ ] 16.6 Los eventos deduplicados quedan registrados en historial
- [ ] 16.7 **CRÍTICO** — La deduplicación no suprime reintentos legítimos de un envío fallido
- [ ] 16.8 Variables activas y ajustables sin cambio de código: `DEFAULT_REMINDER_POLICY`, `NOTIF_RETRIES`, `NOTIF_BACKOFF_MS`, `NOTIF_QUIET_HOURS_START/END`, `NOTIF_DEDUP_MINUTES`

---

# FASE 3 — Dashboard & Analytics

## Act. 19 — Widgets del dashboard

- [ ] 19.1 Cuatro tarjetas: New Leads, In Progress, Contacted, Conversions
- [ ] 19.2 Cada tarjeta muestra conteo + comparación contra el período anterior
- [ ] 19.3 Tooltips con explicación en lenguaje llano
- [ ] 19.4 Clic en tarjeta filtra el listado de leads por ese estado
- [ ] 19.5 Distinción visible entre totales globales y totales asignados
- [ ] 19.6 Los números se actualizan solos (validar mecanismo e intervalo)
- [ ] 19.7 **CRÍTICO** — Los conteos cuadran contra consulta directa a base de datos

## Act. 20 — Ranking de abogados

- [ ] 20.1 Columnas: nombre, leads asignados, conversiones, tasa (%), días promedio a conversión
- [ ] 20.2 Ordenable por cualquier columna
- [ ] 20.3 Exportable a CSV
- [ ] 20.4 Cálculo de "días promedio a conversión" verificado contra un caso manual

## Act. 21 — Análisis de fuente de leads

- [ ] 21.1 Embudo de conversión Chatbot vs. Web Form (capturados → conversiones %)
- [ ] 21.2 Filtrable por mes, trimestre y año
- [ ] 21.3 Exportable a CSV y PDF
- [ ] 21.4 Leads sin fuente registrada no distorsionan los porcentajes

## Act. 22 — Reporte de antigüedad (aging)

- [ ] 22.1 Tiempo promedio en estado "New" (días antes del primer contacto)
- [ ] 22.2 Tiempo promedio en "In Progress" (días antes de conversión)
- [ ] 22.3 Tiempo promedio en "Contacted" (días antes de la siguiente acción)
- [ ] 22.4 Percentil P50
- [ ] 22.5 Percentil P90
- [ ] 22.6 Filtrable por período

---

# FASE 4 — Lawyer Signup & Firm Admin

## Act. 24 — Flujo de registro de abogado

- [ ] 24.1 Paso 1: email y contraseña
- [ ] 24.2 Paso 2: datos profesionales (nombre, licencia, firma)
- [ ] 24.3 Paso 3: carga de licencia en imagen o PDF
- [ ] 24.4 Paso 4: `user_id` autogenerado con formato `LIC-2026-XXXXX`
- [ ] 24.5 **CRÍTICO** — `user_id` es único y no colisiona bajo registros concurrentes
- [ ] 24.6 Paso 5: verificación manual por admin antes de habilitar la cuenta
- [ ] 24.7 **CRÍTICO** — Cuenta sin verificar no puede acceder a leads
- [ ] 24.8 Si el abogado pertenece a una firma existente, queda autovinculado
- [ ] 24.9 Onboarding en video (YouTube embebido) en el primer inicio de sesión
- [ ] 24.10 Opciones "Skip" y "Restart onboarding" disponibles desde el perfil
- [ ] 24.11 La elección de onboarding queda guardada en los ajustes de usuario
- [ ] 24.12 **CRÍTICO** — Validación de tipo y peso del archivo de licencia (rechaza ejecutables y archivos grandes)

## Act. 25 — Administración a nivel de firma

- [ ] 25.1 El primer abogado de una firma nueva queda como Firm Admin automáticamente
- [ ] 25.2 Firm Admin ve y gestiona los leads de su firma
- [ ] 25.3 Firm Admin agrega abogados
- [ ] 25.4 Firm Admin ve reportes de la firma
- [ ] 25.5 Firm Admin configura ajustes de firma (notificaciones, plantillas)
- [ ] 25.6 Rol de admin transferible entre abogados de la misma firma
- [ ] 25.7 Soporta múltiples admins por firma
- [ ] 25.8 Fusión de firmas o solicitud de fusión
- [ ] 25.9 **CRÍTICO** — La fusión conserva historial y asignaciones de ambas firmas
- [ ] 25.10 Aislamiento: un abogado solo ve leads de su firma en la interfaz
- [ ] 25.11 **CRÍTICO** — Aislamiento validado en servidor: pedir por API un lead de otra firma devuelve 403/404

## Act. 26 — Identificación de fuente del lead

- [ ] 26.1 El sistema etiqueta automáticamente el origen: "Chatbot" o "Web Form"
- [ ] 26.2 Fuente visible en Lead Info y en historial
- [ ] 26.3 Listado filtrable por fuente

---

# FASE 5 — AI Chatbot Integration

## Act. 30 — Captura y clasificación automática

- [ ] 30.1 Chatbot embebido y visible en el sitio WordPress
- [ ] 30.2 Saluda y pregunta por el servicio requerido
- [ ] 30.3 Captura nombre, email, teléfono y resumen del caso
- [ ] 30.4 Clasifica el tipo de caso (penal, civil, laboral, etc.)
- [ ] 30.5 Determina nivel de urgencia
- [ ] 30.6 **CRÍTICO** — La sugerencia de tipo de abogado se muestra al admin y NUNCA al prospecto
- [ ] 30.7 Crea el lead automáticamente en el sistema
- [ ] 30.8 Historial completo de la conversación registrado y visible para abogados
- [ ] 30.9 Mensaje de confirmación automático al prospecto
- [ ] 30.10 Chatbot pausable y reanudable desde el panel admin
- [ ] 30.11 Instrucciones personalizadas configurables desde el backend
- [ ] 30.12 Backend de gestión/entrenamiento del chatbot operativo
- [ ] 30.13 **CRÍTICO** — El usuario debe aprobar la política de datos antes de iniciar la conversación
- [ ] 30.14 Proveedor de IA configurable (OpenAI / Anthropic) sin cambio de código
- [ ] 30.15 `CHATBOT_AI_CONFIDENCE_THRESHOLD` configurable y con efecto real
- [ ] 30.16 Soporte inglés y español con detección de idioma del usuario
- [ ] 30.17 Personalización visual del widget
- [ ] 30.18 Fallback a contacto humano cuando la confianza está bajo el umbral
- [ ] 30.19 Fallback a humano cuando el usuario lo pide explícitamente
- [ ] 30.20 Validación de email y teléfono en leads capturados
- [ ] 30.21 Override manual cuando la clasificación de IA es incorrecta
- [ ] 30.22 **CRÍTICO** — Caída o timeout del proveedor de IA degrada a formulario, no rompe la página
- [ ] 30.23 **CRÍTICO** — Resistencia a inyección de prompt: instrucciones del visitante no alteran la clasificación ni exponen el system prompt
- [ ] 30.24 **CRÍTICO** — La API key del proveedor no es accesible desde el frontend

---

# TRANSVERSAL

## Regresión cruzada entre fases

- [ ] T1.1 **CRÍTICO** — Acciones de Fases 2–5 escriben en el historial de Fase 1 (papelera, spam, chatbot, firma)
- [ ] T1.2 Un lead creado por el chatbot cumple todas las reglas de Fase 1 (filtros, historial, permisos)
- [ ] T1.3 Los contadores del dashboard excluyen leads en papelera y marcados como spam
- [ ] T1.4 **CRÍTICO** — Un lead de otra firma nunca aparece en filtros, exportaciones ni reportes

## Configuración y entorno

- [ ] T2.1 Todas las variables de entorno documentadas en un archivo de referencia
- [ ] T2.2 Cambiar cualquier variable surte efecto sin redesplegar código
- [ ] T2.3 Build desplegable en staging revisado y aprobado antes de producción
- [ ] T2.4 **CRÍTICO** — Sin credenciales ni claves en el repositorio ni en el frontend

## Calidad transversal

- [ ] T3.1 Exportaciones CSV/PDF: codificación, tildes y saltos de línea correctos
- [ ] T3.2 Interfaz usable en móvil y tablet
- [ ] T3.3 Listado con volumen real (≥5.000 leads): paginación y filtros con tiempo de respuesta aceptable
- [ ] T3.4 **CRÍTICO** — Zona horaria consistente entre historial, reportes y notificaciones
- [ ] T3.5 Mensajes de error explican qué pasó y qué hacer, sin exponer trazas técnicas

## Cierre contractual

- [ ] T4.1 Los 5 hitos de pago corresponden a entregables verificados en staging
- [ ] T4.2 Bitácora de bugs abierta para la garantía técnica de 15 días calendario
- [ ] T4.3 Todo cambio fuera de este alcance quedó formalizado como Change Request escrito

## Fuera de alcance — verificar que NO esté a medias

- [ ] T5.1 Act. 5 — Autoexpiración configurable de "In Progress": ausente o desactivada
- [ ] T5.2 Act. 6 — Recordatorio automático por fecha de selección: ausente o desactivada
- [ ] T5.3 Act. 17 — Integración de calendario (Google/Outlook): ausente
- [ ] T5.4 Act. 18 — Validación de sesión y tracking de conexión: ausente (revisar impacto en 12.4)
- [ ] T5.5 Act. 23 — Cronómetro por lead: ausente
- [ ] T5.6 Act. 27–29 — Carga, versionado, firma electrónica y validación de documentos: ausentes
- [ ] T5.7 Act. 31 — Botón "Call" click-to-call en Lead Info: ausente