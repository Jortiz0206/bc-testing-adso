# Requisitos funcionales — ClassKids

Matriz consolidada de los requisitos funcionales del sistema **ClassKids**, estructurada por módulos y contrastada directamente contra el código fuente (`backend/main.py`, `backend/init.sql` y el frontend). La numeración `RF-01` a `RF-15` proviene del diseño original del proyecto (SENA ADSO), y se incorporan los requisitos adicionales `RF-16` a `RF-23` para cubrir la funcionalidad administrativa y de autenticación descubierta en el repositorio.

---

### Módulo 1 — Seguridad y acceso al sistema

| RF | Caso de uso | Nombre | Descripción | Actor | Estado de desarrollo |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-01** | `CU-01` | Iniciar sesión | Autenticación mediante correo y contraseña. Valida usuario activo y credenciales, otorgando un token de acceso según el rol. | Docente, Administrador | ✅ **Implementado** (`POST /auth/login`). Cifrado PBKDF2 y emisión de JWT con validez de 8 horas. |
| **RF-02** | `CU-03` | Cerrar sesión | Finalizar la sesión activa del usuario de forma segura. | Docente, Administrador | ⚠️ **Parcial** (`signOut()`). Destruye la sesión en `localStorage` del cliente; el backend apátrida no revoca el JWT activo. |
| **RF-16** | — | Recuperar contraseña | Solicitud de token de restablecimiento por correo e ingreso de nueva contraseña. | Docente, Administrador | ✅ **Implementado** (`POST /auth/forgot-password`, `POST /auth/reset-password`). |
| **RF-17** | `CU-02` | Invitar usuarios | El administrador invita docentes o administradores por correo para que ellos configuren su clave. | Administrador | ✅ **Implementado** (`POST /usuarios/invitar`, `GET/POST /invitaciones/{token}`). |
| **RF-18** | `CU-02` | Modificar rol | Cambio de rol (docente / administrador) a un usuario ya registrado. | Administrador | ✅ **Implementado** (`PUT /usuarios/{id}/rol`, restringido a `admin`). |
| **RF-19** | `CU-02` | Desactivar usuario | Inactivación lógica de cuentas de usuario en el sistema. | Administrador | ✅ **Implementado** (`DELETE /usuarios/{id}`, baja lógica protegida). |

---

### Módulo 2 — Gestión de grupos

| RF | Caso de uso | Nombre | Descripción | Actor | Estado de desarrollo |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-03** | `CU-04` | Gestionar grupos | Creación, actualización, lectura y eliminación de grupos académicos (nombre, grado y jornada). | Docente, Administrador | ✅ **Implementado** (CRUD completo en `GET/POST/PUT/DELETE /grupos`). |

---

### Módulo 3 — Gestión de estudiantes

| RF | Caso de uso | Nombre | Descripción | Actor | Estado de desarrollo |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-04** | `CU-05` | Gestionar estudiantes | Alta, edición, desvinculación y asignación de estudiantes a grupos. | Docente, Administrador | ✅ **Implementado** (CRUD completo en `/estudiantes`; al borrar un grupo, el alumno pasa a estado sin grupo asignado). |
| **RF-05** | `CU-05` | Consultar estudiantes | Listado estructurado de estudiantes registrados asociando el nombre de su grupo. | Docente, Administrador | ✅ **Implementado** (`GET /estudiantes` con `JOIN` a grupos y filtro opcional `?grupo_id=`). |

---

### Módulo 4 — Gestión académica

| RF | Caso de uso | Nombre | Descripción | Actor | Estado de desarrollo |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-20** | `CU-06` | Gestionar materias | Administrar asignaturas del plan de estudios (crear, editar y eliminar). | Docente, Administrador | ✅ **Implementado** (Endpoints CRUD en `/materias`; la UI expone creación y eliminación en `Materias.tsx`). |
| **RF-21** | `CU-07` | Carga docente | Asignar docentes específicos a materias y grupos determinados. | Administrador | ✅ **Implementado** (`GET/POST/DELETE /asignaciones` relacionando `usuarios.id`, materia y grupo). |
| **RF-06** | `CU-08` | Registrar actividad | Creación de tareas, exámenes o proyectos con fecha límite, materia, grupo y descripción. | Docente | ✅ **Implementado** (CRUD completo de actividades; calcula estado pendiente/vencida). |
| **RF-07** | `CU-09` | Registrar calificación | Asignación de notas cuantitativas a estudiantes. | Docente | ⚠️ **Parcial** (`POST /calificaciones`). Permite asociar nota a estudiante, materia y opcionalmente actividad; dispara alerta si el promedio cae de 3.0. |
| **RF-08** | `CU-09` | Calcular promedio | Recálculo automático de promedios individuales y grupales. | Sistema | ⚠️ **Parcial**. El backend calcula el promedio individual al registrar notas para generar alertas; los consolidados grupales los procesa la UI. |
| **RF-09** | `CU-09` | Consultar historial | Visualización del registro histórico de notas por estudiante. | Docente | ✅ **Implementado** (`GET /calificaciones`, filtrable por actividad o estudiante). |

---

### Módulo 5 — Análisis de rendimiento

| RF | Caso de uso | Nombre | Descripción | Actor | Estado de desarrollo |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-10** | `CU-11` | Tablero analítico | Métricas de rendimiento mediante gráficos interactivos (distribución, promedios y tendencias). | Docente | ✅ **Implementado** (`Analisis.tsx` procesa datos de la API mediante gráficos de Recharts). |
| **RF-14** | `CU-10` | Registrar observación | Bitácora cualitativa (anotaciones conductuales o logros) de un estudiante. | Docente | ✅ **Implementado** (`POST /observaciones`). Omite autoría explícita y campo opcional de recomendaciones pedagógicas. |
| **RF-15** | `CU-10` | Consultar observaciones | Historial cronológico de observaciones por alumno. | Docente | ✅ **Implementado** (`GET /observaciones`). Sin endpoint para edición posterior (`PUT`). |

---

### Módulo 6 — Alertas

| RF | Caso de uso | Nombre | Descripción | Actor | Estado de desarrollo |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-11** | `CU-12` | Generar alertas | Disparo automático o registro manual de alertas académicas ante situaciones de riesgo. | Sistema / Docente | ⚠️ **Parcial**. Generación manual y regla automática `low_grade` (promedio < 3.0) operativas; no evalúa asistencias ni restringe tipos por `ENUM`. |
| **RF-12** | `CU-12` | Consultar alertas | Bandeja general y filtrada de alertas registradas. | Docente | ✅ **Implementado** (`GET /alertas`). |
| **RF-13** | `CU-13` | Actualizar alerta | Modificar el estado de seguimiento de una alerta (p. ej., "resuelta" o "en revisión"). | Docente | ✅ **Implementado** (`PUT /alertas/{id}/estado` con body JSON `{ estado }`). |

---

### Módulo 7 — Panel de administración

| RF | Caso de uso | Nombre | Descripción | Actor | Estado de desarrollo |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF-22** | — | Métricas globales | Indicadores consolidados de usuarios, grupos, alumnos, actividades y alertas. | Administrador | ✅ **Implementado** (Consume los 6 servicios `/docentes/count`, `/admins/count`, `/grupos/count`, `/estudiantes/count`, `/actividades/count`, `/alertas/activas/count` protegidos). |
| **RF-23** | — | Modo lectura global | Supervisión general de grupos, estudiantes y alertas de la plataforma. | Administrador | ✅ **Implementado** (`AdminDatos.tsx` reutilizando endpoints de lectura general). |

---

## Cuadro de resumen de implementación

| Estado | Cantidad | Porcentaje |
| :--- | :---: | :---: |
| ✅ **Implementados totalmente** | **19** | **82.6%** |
| ⚠️ **Parciales** | **4** | **17.4%** |
| ❌ **No implementados** | **0** | **0.0%** |
| **Total de Requisitos Funcionales** | **23** | **100%** |
