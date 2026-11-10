# Referencia de la API — ClassKids

Documentación de referencia para la API REST del backend de **ClassKids** desarrollada en **FastAPI** (URL base por defecto `http://127.0.0.1:8000`). La interfaz interactiva de Swagger UI se encuentra disponible en `/docs` y la especificación ReDoc en `/redoc`.

> **Especificaciones generales:**  
> - **Formato de datos:** `application/json` en todas las respuestas y payloads de entrada.  
> - **Autenticación:** Rutas privadas protegidas mediante `Authorization: Bearer <JWT>`.  
> - **Autorización:** Endpoints de administración restringen la ejecución exigiendo el rol `admin`.

---

## Índice de módulos de la API

1. [Módulo de Inicio](#inicio)
2. [Módulo de Autenticación](#autenticación)
3. [Módulo de Usuarios e Invitaciones](#usuarios-e-invitaciones)
4. [Módulo de Grupos Académicos](#grupos)
5. [Módulo de Estudiantes](#estudiantes)
6. [Módulo de Materias](#materias)
7. [Módulo de Actividades Evaluativas](#actividades)
8. [Módulo de Calificaciones](#calificaciones)
9. [Módulo de Observaciones Pedagógicas](#observaciones)
10. [Módulo de Alertas Académicas](#alertas)
11. [Módulo de Roles y Asignaciones Docentes](#roles-y-asignaciones)
12. [Módulo de Métricas y Conteo Administrativo](#métricas-administrativas)
13. [Matriz de integración Frontend-Backend](#estado-de-integración-frontend-backend)

---

## Inicio

| Método | Ruta | Payload Requerido | Descripción y Respuesta |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | — | Verifica el estado de salud de la API. Devuelve `{ "proyecto": "ClassKids", "estado": "Operativo - PostgreSQL Docker", "autor": "Johanna Ortiz" }`. |

---

## Autenticación

| Método | Ruta | Payload / Body | Descripción técnica |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | `{ email, password }` | Autentica contra la tabla `usuarios` usando cifrado PBKDF2. Exige `activo = TRUE`, actualiza `last_sign_in_at` y emite un token JWT conteniendo `{ id, email, nombre, rol }`. |
| `POST` | `/auth/forgot-password` | `{ email, redirect_to? }` | Genera un token de recuperación y lo persiste en la tabla `password_reset_tokens` (con expiración). El token **nunca** se incluye en la respuesta HTTP: solo viaja por correo (requiere `SMTP_HOST` configurado). Responde HTTP `200` con `{ mensaje, email_sent }` para prevenir enumeración de usuarios. |
| `POST` | `/auth/reset-password` | `{ password, token? }` | Valida contraseñas de mínimo 6 caracteres, consume el `reset_token` (de un solo uso) y actualiza el campo `password_hash`. |

> **Nota sobre la sesión JWT:**  
> El token `access_token` está firmado mediante **HS256** con una vigencia de 8 horas. El servidor valida la firma y vigencia en cada petición privada.

---

## Usuarios e invitaciones

| Método | Ruta | Payload / Body | Descripción técnica |
| :--- | :--- | :--- | :--- |
| `GET` | `/usuarios` | — | Retorna la lista de usuarios activos (`activo = TRUE`), mapeando sus roles a `admin` o `docente`. Exige rol administrativo. |
| `POST` | `/usuarios/invitar` | `{ email, role }` | Registra una invitación con token válido por 48 horas. Si no hay servicio SMTP activo, retorna la URL completa en `invitation_url` para copia manual. Responde `409 Conflict` si el correo ya existe. |
| `GET` | `/invitaciones/{token}` | — | Consulta el estado de una invitación pendiente y verifica su validez temporal. Devuelve el correo y rol asignado. |
| `POST` | `/invitaciones/{token}/aceptar` | `{ password, nombre }` | Completa la vinculación del usuario activando la cuenta y definiendo sus credenciales de acceso iniciales. |
| `PUT` | `/usuarios/{id}/rol` | `{ role }` | Modifica el rol de un usuario existente (`admin` o `docente`). Requiere permisos de administrador. |
| `DELETE` | `/usuarios/{id}` | — | Desactiva lógicamente la cuenta (`activo = FALSE`). Protegido para rol administrador. |

---

## Grupos

Operaciones CRUD completas para la entidad `grupos`.

| Método | Ruta | Payload / Body | Descripción técnica |
| :--- | :--- | :--- | :--- |
| `GET` | `/grupos` | — | Devuelve el listado de todos los grupos académicos ordenados por `id` ascendente. |
| `POST` | `/grupos` | `GrupoSchema` (`nombre`, `grado?`, `turno?`, `año_lectivo?`) | Registra un nuevo grupo institucional. Responde `201 Created`. |
| `PUT` | `/grupos/{id}` | `GrupoSchema` | Actualiza los datos de un grupo existente. Devuelve `404 Not Found` si el registro no existe. |
| `DELETE` | `/grupos/{id}` | — | Remueve el grupo. Los estudiantes inscritos mantienen sus registros y se desvinculan mediante `grupo_id = NULL` (`ON DELETE SET NULL`). |

---

## Estudiantes

Operaciones CRUD para la entidad `estudiantes`, integrando `LEFT JOIN` con la tabla `grupos` para resolver el nombre del curso.

| Método | Ruta | Query / Body | Descripción técnica |
| :--- | :--- | :--- | :--- |
| `GET` | `/estudiantes` | Query `grupo_id?` | Consulta el listado de alumnos. Permite aplicar un filtro opcional por `grupo_id`. |
| `POST` | `/estudiantes` | `EstudianteSchema` (`documento`, `nombre`, `apellido`, `grupo_id?`, `activo?`) | Da de alta un estudiante en la base de datos. Responde `201 Created`. |
| `PUT` | `/estudiantes/{id}` | `EstudianteSchema` | Modifica la información del alumno. Responde `404 Not Found` en caso de ID inexistente. |
| `DELETE` | `/estudiantes/{id}` | — | Elimina al estudiante y borra en cascada (`ON DELETE CASCADE`) sus calificaciones, observaciones y alertas. |

---

## Materias

| Método | Ruta | Payload / Body | Descripción técnica |
| :--- | :--- | :--- | :--- |
| `GET` | `/materias` | — | Obtiene la lista completa de asignaturas del plan académico. |
| `POST` | `/materias` | `MateriaSchema` (`nombre`, `codigo?`) | Registra una nueva asignatura. Responde `201 Created`. |
| `PUT` | `/materias/{id}` | `MateriaSchema` | Actualiza el nombre o el código de la materia. |
| `DELETE` | `/materias/{id}` | — | Elimina la asignatura del catálogo. |

---

## Actividades

| Método | Ruta | Query / Body | Descripción técnica |
| :--- | :--- | :--- | :--- |
| `GET` | `/actividades` | Query `grupo_id?` | Obtiene evaluaciones con `JOIN` a materias y grupos, ordenadas por `fecha_entrega`. Admite filtro por `grupo_id`. |
| `POST` | `/actividades` | `ActividadSchema` (`materia_id`, `grupo_id`, `titulo`, `tipo?`, `descripcion?`, `fecha_entrega?`) | Registra una actividad calculando de forma computada su estado (`pendiente` o `vencida`). `201 Created`. |
| `PUT` | `/actividades/{id}` | `ActividadSchema` | Edita el título, tipo, descripción o fecha de entrega de una evaluación. |
| `DELETE` | `/actividades/{id}` | — | Elimina una actividad del calendario académico. |

---

## Calificaciones

| Método | Ruta | Query / Body | Descripción técnica |
| :--- | :--- | :--- | :--- |
| `GET` | `/calificaciones` | Query `actividad_id?` | Retorna el listado de notas registradas con nombres de estudiante y materia. Filtrable por `actividad_id`. |
| `POST` | `/calificaciones` | `CalificacionSchema` (`estudiante_id`, `materia_id`, `actividad_id?`, `nota`, `periodo?`, `observacion?`) | Registra la nota (escala 0.0 - 5.0). Si el promedio del alumno cae por debajo de 3.0, dispara automáticamente una alerta `low_grade`. `201 Created`. |
| `PUT` | `/calificaciones/{id}` | `CalificacionSchema` | Modifica el valor cuantitativo o la observación de una nota registrada. |
| `DELETE` | `/calificaciones/{id}` | — | Elimina un registro de calificación. |

---

## Observaciones

| Método | Ruta | Payload / Body | Descripción técnica |
| :--- | :--- | :--- | :--- |
| `GET` | `/observaciones` | — | Consulta la bitácora de anotaciones cualitativas con el nombre del estudiante, ordenadas por fecha descendente. |
| `POST` | `/observaciones` | `ObservacionSchema` (`estudiante_id`, `tipo?`, `descripcion`) | Registra una nueva anotación cualitativa (convivencial, académica, reconocimiento). `201 Created`. |
| `DELETE` | `/observaciones/{id}` | — | Elimina una entrada del historial de observaciones. |

---

## Alertas

| Método | Ruta | Payload / Parameters | Descripción técnica |
| :--- | :--- | :--- | :--- |
| `GET` | `/alertas` | — | Lista la totalidad de alertas académicas ordenadas cronológicamente por su fecha de creación. |
| `POST` | `/alertas` | `AlertaSchema` (`estudiante_id`, `tipo`, `mensaje`, `estado?`) | Genera una alerta manual normalizando el estado a `active`, `reviewed` o `resolved`. `201 Created`. |
| `PUT` | `/alertas/{id}` | Query parameter `estado: str` | Actualiza el estado de la alerta (variante por query param). |
| `PUT` | `/alertas/{id}/estado` | Body `{ estado }` | Endpoint principal para actualizar el estado de una alerta (`active`, `reviewed`, `resolved`). |
| `DELETE` | `/alertas/{id}` | — | Remueve la alerta del tablero. |

---

## Roles y asignaciones

| Método | Ruta | Payload / Body | Descripción técnica |
| :--- | :--- | :--- | :--- |
| `GET` | `/roles` | — | Consulta el catálogo completo de roles del sistema (`Administrador`, `Docente`, `Acudiente`). |
| `GET` | `/catalogo/docentes` | — | Devuelve únicamente los usuarios activos que poseen el rol `Docente`. |
| `GET` | `/asignaciones` | — | Retorna la matriz de distribución docente vinculando profesor, materia y grupo. |
| `POST` | `/asignaciones` | `AsignacionSchema` (`docente_id`, `materia_id`, `grupo_id`) | Asigna la carga académica. Si ya existe la combinación materia/grupo, responde `409 Conflict`. `201 Created`. |
| `DELETE` | `/asignaciones/{id}` | — | Elimina la carga académica asignada a un docente. |

---

## Métricas administrativas

Endpoints protegidos para el rol `admin` que alimentan el panel de control (`AdminDashboard.tsx`):

| Método | Ruta | Descripción técnica |
| :--- | :--- | :--- |
| `GET` | `/docentes/count` | Retorna el total de docentes activos (`{ "count": N }`). |
| `GET` | `/admins/count` | Retorna el total de administradores activos (`{ "count": N }`). |
| `GET` | `/grupos/count` | Retorna el total de grupos registrados (`{ "count": N }`). |
| `GET` | `/estudiantes/count` | Retorna el total de estudiantes activos (`{ "count": N }`). |
| `GET` | `/actividades/count` | Retorna el total de actividades programadas (`{ "count": N }`). |
| `GET` | `/alertas/activas/count` | Retorna el total de alertas en estado activo o pendiente (`{ "count": N }`). |

---

## Estado de integración frontend-backend

Trazabilidad entre las vistas desarrolladas en React y los servicios expuestos por la API REST:

| Módulo Frontend | Consumo de API REST | Estado en Servidor FastAPI |
| :--- | :--- | :--- |
| `admin/AdminDashboard.tsx` | `GET /docentes/count`, `/admins/count`, `/grupos/count`, `/estudiantes/count`, `/actividades/count`, `/alertas/activas/count` | ✅ **Implementados:** 6 servicios de conteo protegidos para rol `admin`. |
| `admin/AdminUsuarios.tsx` | `PUT /usuarios/{id}/rol`, `DELETE /usuarios/{id}`, `POST /usuarios/invitar` | ✅ **Implementados:** Gestión completa de usuarios y roles. |
| `admin/AdminDatos.tsx` | `GET /grupos`, `GET /estudiantes`, `GET /alertas` | ✅ **Implementados:** Supervisión global en modo lectura. |
| `Materias.tsx` | `POST /asignaciones`, `DELETE /asignaciones/{id}`, `GET /catalogo/docentes` | ✅ **Implementados:** Asignaciones y catálogo docente. |
| `Alertas.tsx` | `PUT /alertas/{id}/estado` | ✅ **Implementado:** Procesamiento de estado vía body JSON. |
| `Actividades.tsx`, `Calificaciones.tsx` | `GET /estudiantes?grupo_id=X`, `GET /actividades?grupo_id=X`, `GET /calificaciones?actividad_id=X` | ✅ **Implementados:** Filtrado por query params en PostgreSQL. |

---

> *Información complementaria:* Los detalles técnicos relativos a las brechas y limitaciones encontradas se detallan en el documento [`../conceptos/restricciones.md`](../conceptos/restricciones.md).
