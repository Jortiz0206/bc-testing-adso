# Restricciones — ClassKids

Análisis consolidado de las restricciones del proyecto **ClassKids**, diferenciando las **decisiones deliberadas de alcance** (propias de la fase de MVP académico en el programa ADSO del SENA) y las **brechas técnicas y de diseño** identificadas tras auditar los componentes del sistema (`backend/main.py`, `backend/init.sql` y el frontend).

---

### 1. Restricciones de alcance (MVP académico)

- **Propósito del proyecto:** Desarrollado con fines exclusivamente formativos y académicos (SENA ADSO), enfocado en validar el flujo de gestión escolar de un colegio pequeño.
- **Roles y vistas habilitadas:** El alcance implementado cubre **Administrador** y **Docente**. Aunque el catálogo de base de datos (`user_roles`) incluye el rol **Acudiente**, no existe un portal o vista de consulta para padres de familia en este MVP.
- **Módulo de asistencia:** Ausencia de un control de inasistencias en el sistema. Aunque el diseño conceptual define la alerta "Inasistencia Crítica", actualmente las alertas de inasistencia deben registrarse manualmente.
- **Aislamiento institucional (Multi-tenancy):** Ausencia del concepto multi-institución. Todos los grupos, estudiantes y usuarios coexisten en una única base de datos compartida sin segmentación por colegio.
- **Reportes y exportaciones:** No se implementó la exportación de reportes a formatos PDF o Excel (incumplimiento del RNF-05 del diseño original).
- **Notificaciones en tiempo real:** Ausencia de mecanismos Push o WebSockets (RNF-08). Las alertas generadas se almacenan en base de datos y se visualizan al consultar o recargar la vista.

---

### 2. Restricciones técnicas y de arquitectura

- **Estrategia de base de datos y migraciones:** No se utiliza una herramienta de control de versiones de esquema como Alembic. Las migraciones dependen del script `init.sql` o de intervenciones manuales con SQL directo.
- **Acceso a datos "SQL-First":** Aunque se inicializa SQLAlchemy (`declarative_base()`), no existen modelos ORM declarativos definidos. Las operaciones de datos utilizan SQL nativo parametrizado (`text()`), ejecutado directamente en la sesión.
- **Arquitectura de backend centralizada:** La lógica de negocio, validaciones y endpoints están concentradas en `backend/main.py` (~650 líneas), sin desacoplamiento en capas de servicios o repositorios independientes.
- **Persistencia de tokens de recuperación:** Los tokens generados en `/auth/forgot-password` se almacenan en la tabla `password_reset_tokens` (con `expires_at` y `used_at`), por lo que sí sobreviven a un reinicio del backend. Sin embargo, sin `SMTP_HOST` configurado el enlace nunca llega al usuario por ningún medio (el endpoint nunca devuelve el token en la respuesta HTTP), por lo que el flujo de recuperación es inutilizable en un entorno local sin SMTP.
- **Políticas CORS:** Restringidas por defecto a las URL de desarrollo local (`localhost:8080`/`127.0.0.1:8080`, el puerto real configurado en `frontend/vite.config.ts`, más `localhost:5173`/`127.0.0.1:5173`) mediante la variable `CORS_ORIGINS`.

---

### 3. Restricciones y hallazgos de seguridad

> ⚠️ **Advertencia:** Los siguientes puntos deben ser subsanados de manera obligatoria antes de desplegar la plataforma con datos reales de estudiantes.

- **Compatibilidad con contraseñas heredadas:** Ya retirada. El sistema de login valida exclusivamente hashes PBKDF2 mediante `passlib`; no existe ninguna ruta de comparación en texto plano.
- **Invalidez de revocación en JWT:** El backend valida firma y tiempo de expiración (8 horas), pero carece de una lista de revocación activa (*blacklisting*). El cierre de sesión destruye el token en la UI pero lo deja funcional en la API hasta su expiración.
- **Autorización por propiedad de datos:** El backend restringe rutas privadas y de administrador, pero no aplica filtros de aislamiento por asignación docente (un docente autenticado puede consultar o editar registros de otros cursos).

---

### 4. Estado de integración frontend-backend

La integración general entre la SPA y la API REST se encuentra operativa, presentando las siguientes particularidades técnicas:

| Funcionalidad / Endpoint | Mecanismo de integración | Estado de operación |
| :--- | :--- | :--- |
| **Cambio de rol de usuario** | `PUT /usuarios/{id}/rol` | Operativo. Exige token con rol `admin`. |
| **Baja de usuarios** | `DELETE /usuarios/{id}` | Operativo. Realiza una desactivación lógica en la base de datos (`activo = FALSE`). |
| **Métricas del Dashboard Admin** | 6 endpoints de conteo (`/count`) | Operativo. Retorna totales protegidos para el rol administrativo. |
| **Carga docente (Asignaciones)** | `POST` y `DELETE /asignaciones` | Operativo. Relaciona la tríada docente (`usuarios.id`), materia y grupo. |
| **Gestión de estado de alertas** | `PUT /alertas/{id}/estado` | Operativo. Recibe payload JSON `{ estado }` y conserva compatibilidad con query params. |
| **Filtrado por URL** | Parámetros `grupo_id` / `actividad_id` | Operativo para listados de estudiantes, actividades y calificaciones. |

---

### 5. Restricciones del modelo de datos

- **Relación de asignaciones docentes:** El modelo relaciona `asignaciones.docente_id` directamente con `usuarios(id)`, aplicando una restricción de unicidad para la combinación de docente, materia y grupo.
- **Vinculación de calificaciones y actividades:** Las notas se asocian obligatoriamente a la materia (`calificaciones.materia_id`) y de forma opcional a una evaluación (`calificaciones.actividad_id`), permitiendo notas generales por materia o vinculadas a una actividad específica.
- **Catálogo de actividades no restringido:** El tipo de actividad (`tarea`, `examen`, `proyecto`, `participación`) se valida en la interfaz y esquemas, sin restricciones `ENUM` estrictas a nivel de PostgreSQL.
- **Falta de restricciones en alertas:** La entidad `alertas` no cuenta con columna de prioridad fija, y los campos `tipo` y `estado` se almacenan como texto normalizado sin tipos `ENUM` de base de datos.
- **Trazabilidad de observaciones:** La tabla `observaciones` no almacena el identificador del docente redactor (`docente_id`), lo que impide auditar la autoría individual (incumplimiento parcial de auditoría RNF-06).

---

### 6. Reglas de negocio heredadas del diseño

Restricciones conceptuales vigentes derivadas del documento de diseño original:

- **Pertenencia de estudiantes:** Un estudiante solo puede pertenecer a un grupo académico simultáneamente (relación 1–N).
- **Escala de evaluación:** Escala cuantitativa restringida numéricamente entre `0.0` y `5.0` mediante `CHECK` en PostgreSQL.
- **Catálogo previsto de alertas:** *Bajo Rendimiento Académico*, *Inasistencia Crítica*, *Riesgo Comportamental* y *Alerta de Deserción*.
- **Escala de prioridades y estados:** Prioridad (*Alta*, *Media*, *Baja*) y Estado (*Activa/Pendiente*, *En revisión*, *Resuelta*).
- **Privilegios de administración:** Exclusividad del rol Administrador para enviar invitaciones, modificar roles y consultar métricas institucionales globales.

---

### 7. Hoja de ruta sugerida para la mitigación de brechas

Priorización recomendada para resolver los hallazgos técnicos en iteraciones futuras:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. AUTORIZACIÓN BASADA EN ASIGNACIONES                                  │
│    Filtrar las consultas de la API según las materias/grupos del docente│
├─────────────────────────────────────────────────────────────────────────┤
│ 2. AUTOMATIZACIÓN DE REGLAS DE ALERTA                                   │
│    Incorporar reglas para inasistencia y bitácora de observaciones.     │
├─────────────────────────────────────────────────────────────────────────┤
│ 3. INTEGRACIÓN DE NOTIFICACIONES Y AUDITORÍA                            │
│    Implementar envío por email (SMTP), WebSockets y logs de auditoría.  │
└─────────────────────────────────────────────────────────────────────────┘
```
