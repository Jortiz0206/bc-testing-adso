# Matriz de trazabilidad — ClassKids

Vista consolidada que cruza cada requisito funcional (RF), no funcional (RNF) e
historia de usuario (HU) con su implementación real: documento fuente, archivo(s)
de frontend, endpoint(s) de backend y tabla(s) de base de datos involucradas.

Esta matriz es una **vista de cruce**, no reemplaza el detalle narrativo de
[`RFs.md`](RFs.md), [`NFs.md`](NFs.md) y [`HUs.md`](HUs.md) — para la descripción
completa de cada requisito, criterios de aceptación y justificación técnica,
consulta esos archivos. Aquí se responde a una pregunta distinta: *¿qué archivo
de código implementa esto, y coincide con lo documentado?*

Última verificación: 1 de septiembre de 2026 (contra el código real en `backend/`
y `frontend/src/` tras la auditoría y corrección de bugs de esa fecha).

---

## Requisitos funcionales (RF) e Historias de Usuario (HU) asociadas

| RF | HU | Frontend | Backend / Endpoint | Base de datos | Estado real |
| :--- | :--- | :--- | :--- | :--- | :--- |
| RF-01 | HU-01 | `pages/Auth.tsx`, `contexts/AuthContext.tsx` | `POST /auth/login` | `usuarios`, `user_roles` | ✅ Implementado. CORS corregido para el puerto real del frontend (8080). |
| RF-02 | HU-03 | `contexts/AuthContext.tsx` (`signOut`) | — (solo cliente; JWT apátrida) | — | ⚠️ Parcial. Sin blacklist de JWT en backend (ver `restricciones.md`). |
| RF-16 | HU-02 | `pages/Auth.tsx`, `pages/ResetPassword.tsx` | `POST /auth/forgot-password`, `POST /auth/reset-password` | `password_reset_tokens`, `usuarios` | ⚠️ Implementado pero **inutilizable en dev sin SMTP** (el token nunca viaja por HTTP). Corregido este sprint: `ResetPassword.tsx` ya no mostraba el formulario con token inválido. |
| RF-17 | HU-04 | `pages/admin/AdminUsuarios.tsx` | `POST /usuarios/invitar`, `GET/POST /invitaciones/{token}` | `invitaciones`, `usuarios`, `user_roles` | ✅ Implementado y funcional. |
| RF-18 | HU-05 | `pages/admin/AdminUsuarios.tsx` | `PUT /usuarios/{id}/rol` | `usuarios`, `user_roles` | ✅ Implementado. |
| RF-19 | HU-06 | `pages/admin/AdminUsuarios.tsx` | `DELETE /usuarios/{id}` | `usuarios` | ✅ Implementado (baja lógica). |
| RF-03 | HU-07 | `pages/Grupos.tsx` | CRUD `/grupos` | `grupos` | ✅ Implementado. Corregido este sprint: valores de `grado` alineados a los reales (`1°`/`2°`/`3°`), color derivado en cliente (no inventado). `DELETE` ahora responde `409` en vez de `500` si el grupo tiene actividades asociadas. |
| RF-04 | HU-08 | `pages/Estudiantes.tsx` | CRUD `/estudiantes` | `estudiantes` | ✅ Implementado. Corregido este sprint: el botón de edición existía en el código pero no era alcanzable desde la UI; ahora funciona y ya no vacía el documento del estudiante al editar. |
| RF-05 | HU-08 | `pages/Estudiantes.tsx`, `pages/Calificaciones.tsx` | `GET /estudiantes?grupo_id=` | `estudiantes`, `grupos` | ✅ Implementado. |
| RF-20 | HU-09 | `pages/Materias.tsx` | CRUD `/materias` | `materias` | ✅ Implementado (UI solo expone alta/baja, no edición — ver `HUs.md`). |
| RF-21 | HU-10 | `pages/Materias.tsx` | `GET/POST/DELETE /asignaciones` | `asignaciones`, `usuarios`, `materias`, `grupos` | ✅ Implementado. Backend simplificado este sprint (se retiraron alias `materia`/`grupo` redundantes en la respuesta, nunca usados por el frontend). |
| RF-06 | HU-11 | `pages/Actividades.tsx` | CRUD `/actividades` | `actividades` | ⚠️ Parcial (no valida fechas pasadas). Corregido este sprint: "entregados" y estado "completada" ahora se calculan desde calificaciones reales, no desde un campo inexistente; se retiró el estado "en progreso" inalcanzable. |
| RF-07 | HU-12 | `pages/Calificaciones.tsx` | `POST/PUT /calificaciones` | `calificaciones` | ⚠️ Parcial (documentado: sin reglas de asistencia). Corregido este sprint: **bug crítico** — el formulario filtraba solo por materia y no por actividad, pudiendo reasignar silenciosamente la nota de una actividad a otra dentro de la misma materia. |
| RF-08 | HU-12 | `pages/Estudiantes.tsx`, `pages/Grupos.tsx`, `pages/Analisis.tsx` (cliente); `backend/main.py::registrar_calificacion` (servidor, para alertas) | `GET /calificaciones` + cálculo en cliente | `calificaciones` | ⚠️ Parcial (documentado). |
| RF-09 | HU-13 | `pages/Calificaciones.tsx`, `pages/Estudiantes.tsx` | `GET /calificaciones?actividad_id=` | `calificaciones` | ✅ Implementado. |
| RF-10 | HU-15 | `pages/Analisis.tsx`, `components/dashboard/PerformanceChart.tsx` | `GET /grupos`, `/estudiantes`, `/calificaciones`, `/actividades` | `grupos`, `estudiantes`, `calificaciones`, `actividades` | ✅ Implementado. Corregido este sprint: la tendencia y la lista de "estudiantes en riesgo" se calculan comparando promedios reales por periodo; se retiró la columna "Asistencia" (dato inexistente). |
| RF-14 | HU-14 | `components/students/ObservacionesEstudiante.tsx` | `POST /observaciones` | `observaciones` | ✅ Implementado. Corregido este sprint: el selector de tipo usaba claves (`academica`/`comportamental`/`positiva`) que nunca coincidían con los datos reales (`Académica`/`Convivencial`/`Reconocimiento`); ahora alineado. |
| RF-15 | HU-14 | `components/students/ObservacionesEstudiante.tsx` | `GET /observaciones` | `observaciones` | ✅ Implementado. |
| RF-11 | HU-16 | `pages/Alertas.tsx` (manual); `backend/main.py::registrar_calificacion` (automática) | `POST /alertas`; lógica interna en `POST /calificaciones` | `alertas` | ⚠️ Parcial (documentado: sin reglas de inasistencia). Corregido este sprint: se unificó el vocabulario de `estado` (`active`/`reviewed`/`resolved`) entre el seed de la base de datos y el código; antes coexistían dos vocabularios (`Pendiente` vs `active`). |
| RF-12 | HU-17 | `pages/Alertas.tsx`, `components/dashboard/AlertsPanel.tsx` | `GET /alertas` | `alertas`, `estudiantes` | ✅ Implementado. Corregido este sprint: `Alertas.tsx` leía un objeto anidado (`a.estudiantes.nombre`) que el backend nunca envía (envía campos planos `estudiante_nombre`/`estudiante_apellido`); todas las alertas mostraban "Estudiante" genérico. También se corrigió el mapeo de tipo (`tipo` es texto libre en español, no el enum en inglés que esperaba el frontend). |
| RF-13 | HU-17 | `pages/Alertas.tsx` | `PUT /alertas/{id}/estado` | `alertas` | ✅ Implementado. |
| RF-22 | HU-18 | `pages/admin/AdminDashboard.tsx` | `/docentes/count`, `/admins/count`, `/grupos/count`, `/estudiantes/count`, `/actividades/count`, `/alertas/activas/count` | `usuarios`, `grupos`, `estudiantes`, `actividades`, `alertas` | ✅ Implementado. |
| RF-23 | HU-19 | `pages/admin/AdminDatos.tsx` | `GET /grupos`, `/estudiantes`, `/alertas` | `grupos`, `estudiantes`, `alertas` | ✅ Implementado. Corregido este sprint: columnas "Estado" (estudiante) y "Nivel" (alerta) leían campos inexistentes; la primera ahora usa el campo real `activo`, la segunda se retiró (no hay dato real que la respalde). |

**Sin correspondencia HU dedicada** (cubiertas transversalmente por HU-01/HU-07/HU-08/HU-17):
ninguna — los 23 RF tienen HU asociada, directa o transversal.

---

## Requisitos no funcionales (RNF)

El detalle completo de cada RNF (descripción, actor, justificación) está en
[`NFs.md`](NFs.md). Aquí solo se referencia el mecanismo real que los implementa
o los explica cuando no aplica:

| RNF | Mecanismo real | Estado real (resumen) |
| :--- | :--- | :--- |
| RNF-01 | `backend/main.py::pwd_context` (passlib, `pbkdf2_sha256`) | ⚠️ Parcial — cifrado sí, revocación de JWT no. |
| RNF-02 | — (sin suite de carga) | 🔍 No verificado. |
| RNF-03 | PostgreSQL 15 + `backend/init.sql` | ✅ Cumplido. |
| RNF-04 | `shadcn/ui` + `sonner` en todo el frontend | ✅ Cumplido. |
| RNF-05 | — (sin exportación PDF/Excel) | ❌ No implementado. |
| RNF-06 | `observaciones.fecha`, `alertas.fecha_creacion` (sin autoría) | ⚠️ Parcial. |
| RNF-07 | React 18 + Tailwind responsive + `hooks/use-mobile.tsx` | ✅ Cumplido. |
| RNF-08 | — (sin WebSockets/polling) | ❌ No implementado. |
| RNF-09 | Volumen Docker `postgres_data` (sin backups automatizados) | ❌ No implementado. |
| RNF-10 | Toda la UI en español (`sonner`, componentes, mensajes de error) | ✅ Cumplido. |
| RNF-11 | `calificaciones.nota CHECK (nota >= 0 AND nota <= 5)` | ⚠️ Parcial (sin validar fechas). |
| RNF-12 | `localStorage` sin expiración por inactividad | ❌ No implementado. |
| RNF-13 | Entorno de desarrollo local, sin infraestructura productiva | 🔍 No aplicable. |
| RNF-14 | Middleware `require_authentication` en `backend/main.py` | ⚠️ Parcial (sin filtro por asignación docente). |
| RNF-15 | `CORS_ORIGINS` en `backend/main.py` | ✅ Cumplido. Corregido este sprint: el default no incluía el puerto real del frontend (8080). |
| RNF-16 | — (sin `pytest` ni specs de Playwright en el repo) | ❌ No implementado. Ver nota en `pruebas.md`. |
| RNF-17 | Tabla `password_reset_tokens` | ⚠️ Parcial — persiste en BD, pero inutilizable sin SMTP. |

---

## Requisitos obsoletos o que ya no corresponden al sistema

Se revisó cada RF, RNF y HU contra el código real (`backend/main.py`,
`backend/init.sql`, y cada archivo de `frontend/src/`). **No se encontró ningún
requisito duplicado, obsoleto, o que describa una funcionalidad que ya no exista
en el sistema.** Tampoco existe ningún RF/RNF/HU redactado en función de Supabase
o Lovable: la documentación de requisitos siempre describió el backend FastAPI +
PostgreSQL actual, nunca las plantillas de scaffolding originales. Por eso no se
eliminó ni se reescribió ningún requisito en esta pasada — solo se corrigieron,
en `RFs.md`/`NFs.md`/`HUs.md`, las notas técnicas que habían quedado desactualizadas
respecto al código (ver historial de cambios de esos archivos).

## Documentado pero no implementado / Implementado pero no documentado

- **Documentado pero no implementado:** ninguno. Todo lo marcado como
  "✅ Implementado" en `RFs.md`/`HUs.md` corresponde a código real verificado en
  esta auditoría (endpoint, tabla y componente de UI existentes y conectados).
- **Implementado pero no documentado:** ninguno detectado. El manejo de errores
  de integridad (`409`) agregado este sprint en `DELETE /grupos` y
  `DELETE /materias` es un detalle de robustez interno, no un requisito de negocio
  nuevo, por lo que no requiere una entrada RF propia.
