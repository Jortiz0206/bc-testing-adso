# Historias de usuario — ClassKids

Historias de usuario estructuradas bajo la plantilla estándar (`Como... quiero... para...`), basadas en los 19 casos de uso (`CU-01` a `CU-19`) de la especificación original de la plataforma y sus componentes administrativos.

---

### HU-01 — Inicio de sesión
**Como** docente o administrador, **quiero** autenticarme con mis credenciales personales (correo y contraseña) **para** ingresar a las vistas y funciones asignadas a mi perfil.

**Criterios de aceptación:**
- Si ingreso datos válidos y la cuenta está activa, el sistema me redirige al panel inicial de mi rol.
- Si los datos son erróneos, el sistema despliega una notificación de error clara.
- Si la cuenta está deshabilitada, se le informa al usuario para que gestione el caso con el administrador.

> **Estado de desarrollo:** ✅ **Implementada** (`CU-01`, `POST /auth/login`).  
> *Nota técnica:* El backend distingue ambos casos: credenciales erróneas responde `401` ("Correo o contraseña incorrectos") y cuenta deshabilitada responde `403` ("Esta cuenta se encuentra deshabilitada. Contacte al administrador.").

---

### HU-02 — Recuperación de credenciales
**Como** usuario con acceso, **quiero** solicitar un enlace de restablecimiento si olvido mi contraseña **para** recuperar el control de mi cuenta de forma autónoma.

**Criterios de aceptación:**
- La solicitud se tramita proporcionando el correo corporativo.
- El sistema envía un enlace único por correo para parametrizar la nueva contraseña.
- El token expira tras su primer uso o al vencer su plazo (30 minutos).

> **Estado de desarrollo:** ✅ **Implementada** (`POST /auth/forgot-password`, `POST /auth/reset-password`, `ResetPassword.tsx`).  
> *Nota técnica:* El enlace de recuperación viaja **solo por correo** (`SMTP_HOST` configurado); la API nunca lo devuelve en la respuesta HTTP. Sin SMTP configurado (caso por defecto en desarrollo local, sin `.env`), el flujo es inutilizable desde la UI porque no hay ningún otro camino para obtener el enlace.

---

### HU-03 — Cierre de sesión seguro
**Como** docente o administrador, **quiero** finalizar mi sesión de trabajo **para** proteger los datos de la institución, especialmente al usar terminales compartidos.

**Criterios de aceptación:**
- Al cerrar sesión, la aplicación redirige al formulario de acceso.
- Se revocan los accesos locales de modo que no sea posible navegar hacia atrás en rutas protegidas sin reautenticarse.

> **Estado de desarrollo:** ⚠️ **Parcial** (`CU-03`, `signOut()`).  
> *Nota técnica:* El cliente destruye la sesión localmente. Sin embargo, el backend valida tokens JWT de forma apátrida (*stateless*), por lo que no se ejecuta una revocación activa (*blacklisting*) en el servidor al cerrar la sesión.

---

### HU-04 — Invitación e incorporación de usuarios
**Como** administrador, **quiero** invitar a nuevos profesores o administradores mediante correo electrónico **para** darles acceso al sistema sin requerir la gestión manual de sus contraseñas iniciales.

**Criterios de aceptación:**
- Permite especificar la dirección de correo y asignar el rol de destino (docente o administrador).
- La plataforma envía un enlace de activación para que el usuario configure sus credenciales.
- Incluye la opción manual para copiar la URL de invitación en entornos sin servidor de correo activo.

> **Estado de desarrollo:** ✅ **Implementada** (`CU-02`, `POST /usuarios/invitar`, `AdminUsuarios.tsx`).

---

### HU-05 — Gestión de roles y permisos
**Como** administrador, **quiero** modificar el perfil asignado a un usuario activo **para** actualizar sus privilegios si cambian sus responsabilidades institucionales.

**Criterios de aceptación:**
- Es posible alternar la asignación de rol (docente / administrador) desde el listado general de usuarios.
- La redefinición de permisos impacta de forma inmediata en las sesiones del usuario.

> **Estado de desarrollo:** ✅ **Implementada** (`PUT /usuarios/{id}/rol`, restringido a administradores).

---

### HU-06 — Desactivación de usuarios
**Como** administrador, **quiero** remover el acceso de un usuario **para** revocar la entrada al sistema cuando la persona finaliza su vinculación laboral.

**Criterios de aceptación:**
- Se puede desactivar cualquier perfil registrado, exceptuando la cuenta del administrador en uso.
- El sistema solicita una confirmación previa antes de efectuar la acción.

> **Estado de desarrollo:** ✅ **Implementada** (`DELETE /usuarios/{id}`). Se ejecuta como un borrado lógico en base de datos con confirmación en la UI.

---

### HU-07 — Administración de grupos académicos
**Como** docente o administrador, **quiero** parametrizar los grupos de la institución (nombre, grado y jornada) **para** organizar las listas de estudiantes.

**Criterios de aceptación:**
- Permite registrar, modificar y eliminar grupos indicando grado, sección y turno.
- La eliminación de un grupo desvincula sus estudiantes pero mantiene sus registros de datos intactos (quedan en estado no asignado).

> **Estado de desarrollo:** ✅ **Implementada** (`CU-04`, CRUD completo en `/grupos`).

---

### HU-08 — Registro e inclusión de estudiantes
**Como** docente, **quiero** dar de alta a los alumnos y vincularlos a su correspondiente grupo **para** realizar el seguimiento pedagógico individual.

**Criterios de aceptación:**
- Permite la creación con documento de identidad, nombres, apellidos y asignación de grupo.
- Posibilita la actualización de datos personales y la reasignación entre grupos.
- Visualización estructurada del listado de estudiantes con sus respectivos grupos.

> **Estado de desarrollo:** ✅ **Implementada** (`CU-05`, CRUD completo en `/estudiantes`).  
> *Nota técnica:* El formato del documento de identidad depende exclusivamente de las restricciones `UNIQUE` configuradas en la base de datos, sin validación previa por expresiones regulares.

---

### HU-09 — Configuración de materias
**Como** docente o administrador, **quiero** gestionar las asignaturas del plan de estudios **para** asociar sobre ellas la planeación de evaluaciones y notas.

**Criterios de aceptación:**
- Registro de asignaturas definiendo un nombre y un código opcional.
- Inhabilitación o eliminación de materias fuera de vigencia.

> **Estado de desarrollo:** ✅ **Implementada** (`CU-06`, endpoints `/materias`).  
> *Nota técnica:* El backend soporta las operaciones completas de lectura, creación, edición y borrado, aunque la interfaz gráfica actualmente expone solo la creación y la eliminación.

---

### HU-10 — Carga docente por grupo y materia
**Como** administrador, **quiero** asignar qué profesor dicta cada materia en un grupo específico **para** delimitar las responsabilidades de evaluación y registro académico.

**Criterios de aceptación:**
- Interfaz para vincular la triada: Docente - Materia - Grupo.
- Control de redundancias que evita duplicar la misma asignación.
- Listado de distribución docente visible por cada curso.

> **Estado de desarrollo:** ✅ **Implementada** (`GET`, `POST`, `DELETE` en `/asignaciones`).

---

### HU-11 — Planificación de actividades evaluativas
**Como** docente, **quiero** registrar tareas, exámenes, proyectos o participaciones con su fecha límite **para** estructurar los criterios de evaluación del periodo.

**Criterios de aceptación:**
- Formulario con título, tipo de actividad, materia, grupo, fecha límite y descripción.
- Validación de la completitud de campos obligatorios y formato de fecha.

> **Estado de desarrollo:** ⚠️ **Parcial**.  
> *Nota técnica:* La creación se realiza con la estructura requerida y valida tipos de datos, pero la API aún no restringe el guardado de fechas de entrega que ya hayan transcurrido.

---

### HU-12 — Registro de calificaciones e historial
**Como** docente, **quiero** ingresar las notas de los estudiantes **para** llevar su historial cuantitativo y detectar alertas de rendimiento.

**Criterios de aceptación:**
- Rango de evaluación comprendido de `0.0` a `5.0`.
- Control que rechaza automáticamente valores fuera de la escala establecida.
- Recálculo en tiempo real del promedio ponderado y detección automática de riesgo académico.

> **Estado de desarrollo:** ⚠️ **Parcial**.  
> *Nota técnica:* Funciona la validación de rango (`0.0 - 5.0`) y el backend recalcula el promedio acumulado generando la alerta `low_grade` si baja de `3.0`. No están integradas aún las reglas asociadas a faltas de asistencia o bitácora de observaciones.

---

### HU-13 — Consulta de expediente académico
**Como** docente, **quiero** revisar la trazabilidad de evaluaciones, observaciones y alertas de un estudiante **para** analizar su evolución académica global.

**Criterios de aceptación:**
- Acceso consolidado al histórico de notas, actividades entregadas, anotaciones y alertas del alumno.

> **Estado de desarrollo:** ✅ **Implementada**.  
> *Nota técnica:* Los módulos operan de forma independiente (pestañas dedicadas con filtros de cliente). El resumen centralizado existe como vista preliminar en el modal de detalle del módulo `Estudiantes.tsx`.

---

### HU-14 — Bitácora de observaciones pedagógicas
**Como** docente, **quiero** registrar anotaciones cualitativas (conductuales, logros o aspectos a mejorar) **para** documentar el desarrollo integral del estudiante más allá de las calificaciones.

**Criterios de aceptación:**
- Registro de observaciones categorizadas (tipo, descripción y alumno asociado).
- Historial cronológico de entradas por estudiante.

> **Estado de desarrollo:** ✅ **Implementada** (`CU-10`, `POST`/`GET` en `/observaciones`).  
> *Nota técnica:* El esquema actual de datos omite la autoría explícita del docente que redacta la nota y el campo opcional de recomendaciones formativas descrito en la especificación.

---

### HU-15 — Tablero analítico de rendimiento
**Como** docente, **quiero** visualizar gráficos con el desempeño consolidado de mis grupos **para** identificar de forma oportuna tendencias de bajo rendimiento o vacíos académicos.

**Criterios de aceptación:**
- Muestra promedios por grupo, comparativas y alertas activas en una sola pantalla.
- Filtros por curso y controles para la gestión de estados sin datos.

> **Estado de desarrollo:** ✅ **Implementada** (`CU-11`, `Analisis.tsx`). La interfaz procesa en el cliente las métricas para renderizar gráficos de barra por curso, gráficos circulares de distribución y tendencias en el tiempo.

---

### HU-16 — Generación automática de alertas académicas
**Como** sistema, **quiero** detectar situaciones de riesgo académico (como notas deficientes recurrentes) y notificar al docente **para** agilizar las intervenciones pedagógicas.

**Criterios de aceptación:**
- Disparo automático de una alerta al registrar notas que vulneren los umbrales mínimos establecidos.
- Visibilidad inmediata del caso en la bandeja del docente a cargo.

> **Estado de desarrollo:** ⚠️ **Parcial**.  
> *Nota técnica:* Permite la gestión manual de alertas y activa una regla automática (`low_grade`) cuando el promedio ponderado decae por debajo de `3.0`. Aún no analiza patrones de inasistencia ni clasifica mediante un catálogo estricto de prioridades.

---

### HU-17 — Seguimiento al estado de alertas
**Como** docente, **quiero** actualizar el estado de una alerta activa (p. ej., "En revisión" o "Resuelta") **para** mantener la trazabilidad de los casos atendidos.

**Criterios de aceptación:**
- Cambio directo de estado desde la bandeja de gestión.
- Persistencia del nuevo estado reflejada de forma inmediata en la base de datos.

> **Estado de desarrollo:** ✅ **Implementada** (`PUT /alertas/{id}/estado`).

---

### HU-18 — Panel de control institucional (Métricas globales)
**Como** administrador, **quiero** consultar los indicadores globales del sistema (total de docentes, alumnos, grupos, actividades y alertas) **para** evaluar la adopción y el estado general de la plataforma.

**Criterios de aceptación:**
- Métrica resumida de contadores globales con actualización en tiempo real al cargar el panel.

> **Estado de desarrollo:** ✅ **Implementada**. Consume los 6 servicios de conteo expuestos en la API para el rol administrativo.

---

### HU-19 — Supervisión global de datos (Modo lectura)
**Como** administrador, **quiero** revisar los listados completos de cursos, alumnos y alertas de toda la institución **para** auditar el sistema sin intervenir en las aulas virtuales de los profesores.

**Criterios de aceptación:**
- Vistas globales agrupadas por pestañas para la revisión de datos académicos generales en modo de solo lectura.

> **Estado de desarrollo:** ✅ **Implementada** (`AdminDatos.tsx`).

---

## Matriz de estado de las Historias de Usuario

| Clasificación | Cantidad | Historias asociadas |
| :--- | :---: | :--- |
| ✅ **Implementada** | **15** | HU-01, HU-02, HU-04, HU-05, HU-06, HU-07, HU-08, HU-09, HU-10, HU-13, HU-14, HU-15, HU-17, HU-18, HU-19 |
| ⚠️ **Parcial** | **4** | HU-03, HU-11, HU-12, HU-16 |
| ❌ **No implementada** | **0** | *Ninguna* |

---

> El detalle sobre las limitaciones de desarrollo, casos no cubiertos y las razones técnicas de los estados parciales se encuentra disponible en el archivo [`restricciones.md`](restricciones.md).