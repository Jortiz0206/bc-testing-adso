# Esquema de base de datos — ClassKids

Especificación técnica de la estructura relacional de datos de la plataforma **ClassKids**, basada en el archivo DDL de inicialización (`backend/init.sql`) ejecutado sobre el motor de base de datos **PostgreSQL 15** (desplegado mediante Docker Compose).

---

### 1. Diagrama entidad–relación (Modelo conceptual)

```text
               ┌──────────────┐
               │  user_roles  │
               └──────┬───────┘
                      │ (rol_id)
                      ▼
               ┌──────────────┐          ┌──────────────┐
               │   usuarios   ├─────────>│ invitaciones │
               └──────┬───────┘          └──────────────┘
                      │
                      │ (*) docente_id (FK -> usuarios.id)
                      ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│    grupos    │<┤ asignaciones ├>│   materias   │
└──────┬───────┘ └──────────────┘ └──────┬───────┘
       │                                 │
       ├───┐                         ┌───┤
       │   ▼                         ▼   │
       │ ┌──────────────┐     ┌──────────────┐
       │ │ estudiantes  │     │ actividades  │
       │ └──────┬───────┘     └──────┬───────┘
       │        │                    │
       │        ├──────────────┬─────┴────────────────┐
       ▼        ▼              ▼                      ▼
┌───────────────────────────┐ ┌──────────────────┐ ┌──────────────┐
│      calificaciones       │ │  observaciones   │ │   alertas    │
└───────────────────────────┘ └──────────────────┘ └──────────────┘
```

> **Nota de integridad:** `asignaciones.docente_id` referencia directamente a `usuarios(id)`. La API REST convalida que la cuenta de usuario posea asignado el rol de `Docente`.

---

### 2. Estructura detallada de las tablas

#### 2.1 `user_roles`
Catálogo del sistema para la definición de roles y niveles de acceso.

| Campo | Tipo de Dato | Restricciones | Descripción técnica |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Identificador único del rol. |
| `nombre` | `VARCHAR(50)` | `NOT NULL, UNIQUE` | Nombre del rol (`Administrador`, `Docente`, `Acudiente`). |
| `descripcion` | `TEXT` | — | Descripción funcional del rol. |

*Nota:* El rol `Acudiente` se encuentra registrado a nivel de base de datos pero omite interfaz o lógica de negocio asociada en la API/Frontend.

#### 2.2 `usuarios`
Entidad para el control de acceso y autenticación a la plataforma.

| Campo | Tipo de Dato | Restricciones | Descripción técnica |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Identificador interno. |
| `email` | `VARCHAR(255)` | `NOT NULL, UNIQUE` | Correo corporativo/usuario. |
| `nombre` | `VARCHAR(120)` | `NOT NULL` | Nombres y apellidos. |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | Clave cifrada mediante hash PBKDF2. |
| `rol_id` | `INTEGER` | `FK -> user_roles(id)` | Identificador del rol. |
| `activo` | `BOOLEAN` | `NOT NULL, DEFAULT TRUE` | Estado lógico del perfil. |
| `created_at` | `TIMESTAMP` | `NOT NULL, DEFAULT now()` | Marca de tiempo de registro. |
| `last_sign_in_at` | `TIMESTAMP` | — | Último acceso al sistema. |

#### 2.3 `invitaciones`
Registro de solicitudes de acceso enviadas para la incorporación de nuevos usuarios.

| Campo | Tipo de Dato | Restricciones | Descripción técnica |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Identificador único. |
| `email` | `VARCHAR(255)` | `NOT NULL` | Correo de la persona invitada. |
| `rol_id` | `INTEGER` | `NOT NULL, FK -> user_roles(id)` | Rol a otorgar tras la activación. |
| `token` | `VARCHAR(120)` | `NOT NULL, UNIQUE` | Token único de activación. |
| `expires_at` | `TIMESTAMP` | `NOT NULL` | Expiración (48 horas post-creación). |
| `accepted_at` | `TIMESTAMP` | — | Fecha de activación efectiva. |
| `created_at` | `TIMESTAMP` | `NOT NULL, DEFAULT now()` | Marca de tiempo de emisión. |

#### 2.4 `grupos`
Cursos o grupos académicos de la institución.

| Campo | Tipo de Dato | Restricciones | Descripción técnica |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Identificador del grupo. |
| `nombre` | `VARCHAR(120)` | `NOT NULL` | Identificador del curso (ej. "Grado 1A"). |
| `grado` | `VARCHAR(30)` | — | Nivel académico. |
| `turno` | `VARCHAR(30)` | — | Jornada (Matutino / Vespertino). |
| `ano_lectivo` | `INTEGER` | `DEFAULT 2026` | Año escolar. |

#### 2.5 `estudiantes`
Hojas de vida de los alumnos inscritos.

| Campo | Tipo de Dato | Restricciones | Descripción técnica |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Identificador interno. |
| `documento` | `VARCHAR(50)` | `NOT NULL, UNIQUE` | Documento de identidad. |
| `nombre` | `VARCHAR(120)` | `NOT NULL` | Nombres del estudiante. |
| `apellido` | `VARCHAR(120)` | `NOT NULL` | Apellidos del estudiante. |
| `grupo_id` | `INTEGER` | `FK -> grupos(id) ON DELETE SET NULL` | Asignación de grupo. |
| `activo` | `BOOLEAN` | `NOT NULL, DEFAULT TRUE` | Estado del alumno. |

#### 2.6 `materias`
Catálogo de asignaturas del plan de estudios.

| Campo | Tipo de Dato | Restricciones | Descripción técnica |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Identificador de la materia. |
| `nombre` | `VARCHAR(120)` | `NOT NULL` | Nombre de la asignatura. |
| `codigo` | `VARCHAR(30)` | — | Código alfanumérico opcional. |

#### 2.7 `actividades`
Evaluaciones y tareas programadas.

| Campo | Tipo de Dato | Restricciones | Descripción técnica |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Identificador de la evaluación. |
| `materia_id` | `INTEGER` | `NOT NULL, FK -> materias(id)` | Materia asociada. |
| `grupo_id` | `INTEGER` | `NOT NULL, FK -> grupos(id)` | Grupo académico. |
| `titulo` | `VARCHAR(200)` | `NOT NULL` | Título de la actividad. |
| `tipo` | `VARCHAR(30)` | `NOT NULL, DEFAULT 'tarea'` | Tipo de entrega (tarea, examen, proyecto, participación). |
| `descripcion` | `TEXT` | — | Indicaciones de la actividad. |
| `fecha_entrega` | `DATE` | — | Fecha límite de presentación. |

#### 2.8 `calificaciones`
Registro cuantitativo de notas.

| Campo | Tipo de Dato | Restricciones | Descripción técnica |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Identificador único. |
| `estudiante_id` | `INTEGER` | `NOT NULL, FK -> estudiantes(id) ON DELETE CASCADE` | Estudiante evaluado. |
| `materia_id` | `INTEGER` | `NOT NULL, FK -> materias(id)` | Materia vinculada. |
| `actividad_id` | `INTEGER` | `FK -> actividades(id) ON DELETE SET NULL` | Actividad evaluada (opcional). |
| `nota` | `NUMERIC(3,1)` | `NOT NULL, CHECK (nota >= 0 AND nota <= 5)` | Rango permitido de 0.0 a 5.0. |
| `periodo` | `INTEGER` | `NOT NULL, DEFAULT 1` | Periodo académico. |
| `observacion` | `TEXT` | — | Comentario cualitativo sobre la nota. |
| `fecha_registro` | `TIMESTAMP` | `NOT NULL, DEFAULT now()` | Fecha de registro. |

#### 2.9 `observaciones`
Bitácora de seguimiento cualitativo del estudiante.

| Campo | Tipo de Dato | Restricciones | Descripción técnica |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Identificador interno. |
| `estudiante_id` | `INTEGER` | `NOT NULL, FK -> estudiantes(id) ON DELETE CASCADE` | Estudiante observado. |
| `tipo` | `VARCHAR(50)` | `DEFAULT 'Convivencial'` | Categoría (Académica, Convivencial, etc.). |
| `descripcion` | `TEXT` | `NOT NULL` | Detalle del seguimiento. |
| `fecha` | `TIMESTAMP` | `NOT NULL, DEFAULT now()` | Fecha del registro. |

#### 2.10 `alertas`
Registros de alertas por situaciones de riesgo académico o comportamental.

| Campo | Tipo de Dato | Restricciones | Descripción técnica |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Identificador de la alerta. |
| `estudiante_id` | `INTEGER` | `NOT NULL, FK -> estudiantes(id) ON DELETE CASCADE` | Estudiante afectado. |
| `tipo` | `VARCHAR(80)` | `NOT NULL` | Tipo de alerta (ej. `low_grade`, `Bajo Rendimiento`, `Inasistencia`). |
| `mensaje` | `TEXT` | `NOT NULL` | Descripción del riesgo. |
| `estado` | `VARCHAR(30)` | `NOT NULL, DEFAULT 'Pendiente'` | Estado del caso (`active`, `reviewed`, `resolved`). |
| `fecha_creacion` | `TIMESTAMP` | `NOT NULL, DEFAULT now()` | Fecha de generación. |

#### 2.11 `asignaciones`
Matriz para el control de la carga docente por asignatura y grupo.

| Campo | Tipo de Dato | Restricciones | Descripción técnica |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Identificador único. |
| `docente_id` | `INTEGER` | `NOT NULL, FK -> usuarios(id)` | Docente asignado. |
| `materia_id` | `INTEGER` | `NOT NULL, FK -> materias(id)` | Asignatura dictada. |
| `grupo_id` | `INTEGER` | `NOT NULL, FK -> grupos(id)` | Curso asignado. |

---

### 3. Matriz comparativa entre la especificación y el código

| Tabla | Diseño original | Código implementado (`init.sql`) | Diferencia relevante |
| :--- | :--- | :--- | :--- |
| `usuarios` | `rol ENUM` | `rol_id` (FK a `user_roles`) | Mapeo relacional normalizado. |
| `calificaciones` | Relación con `id_actividad` | Relación a `materia_id` y `actividad_id` opcional | Permite notas generales por materia y vínculos a actividades específicas. |
| `alertas` | Catálogos `ENUM` estrictos | Campos `VARCHAR` con normalización en API | Permite flexibilidad y compatibilidad con estados legacy (`Pendiente`, `active`, etc.). |
| `observaciones` | Posee `id_docente` | Omite `id_docente` | Carece de la autoría del docente que escribe la nota. |
