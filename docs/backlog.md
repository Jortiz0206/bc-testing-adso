# Backlog de ClassKids

Estado revisado: 28 de agosto de 2026.

Este backlog refleja el estado real del MVP y está organizado para las columnas del GitHub Project: `Done`, `Evidence`, `In progress` y `Backlog`.

## Done

- [x] Autenticación de administrador y docente con JWT.
- [x] Contraseñas nuevas protegidas con PBKDF2.
- [x] Protección de rutas privadas y autorización administrativa.
- [x] Invitación y activación de usuarios.
- [x] Cambio de rol y desactivación de usuarios.
- [x] CRUD de grupos, estudiantes, materias, actividades y calificaciones.
- [x] Actividades con tipo, materia, grupo, descripción y fecha.
- [x] Asignaciones docente-materia-grupo con alta, consulta, baja y control de duplicados.
- [x] Observaciones por estudiante.
- [x] Alertas manuales y alerta automática por promedio acumulado menor a 3.0.
- [x] Cambio de estado de alertas.
- [x] Dashboard docente con métricas, alertas y estudiantes destacados.
- [x] Dashboard administrativo con conteos globales.
- [x] Análisis por grupo, distribución, tendencia y tipo de actividad.
- [x] Datos demo de un colegio pequeño en PostgreSQL.
- [x] Documentación técnica, requisitos, historias de usuario y restricciones.
- [x] Persistir tokens de recuperación en la base de datos (tabla `password_reset_tokens`) con expiración.
- [x] Retirar compatibilidad con contraseñas heredadas en texto plano.

## Evidence

Evidencias para enlazar en las tarjetas terminadas del Project:

- [x] Documentación técnica: [`docs/README.md`](README.md).
- [x] Registro de pruebas: [`docs/pruebas.md`](pruebas.md) (nota: describe recorridos manuales/exploratorios ejecutados en su momento; no hay archivos `*.spec.ts` de Playwright ni suite de pytest en el repositorio, por lo que estas validaciones no son reproducibles automáticamente hoy — ver "Crear la suite de pruebas automatizadas" en Backlog).
- [x] API verificó creación, consulta y eliminación de asignaciones.
- [x] API verificó creación y eliminación de actividad con tipo `examen`.
- [x] Rutas privadas sin token responden `401` y CORS preflight responde `200`.
- [x] Datos demo: 3 grupos, 20 estudiantes, 15 actividades, 35 calificaciones, 10 observaciones, 8 alertas y 15 asignaciones.

## In progress

- [ ] Validar desde la interfaz el flujo completo de creación de asignaciones.
- [ ] Corregir errores existentes de lint de TypeScript y advertencias de Fast Refresh.
- [ ] Revisar el bundle frontend mayor a 500 kB mediante división de código.

## Backlog

- [ ] Implementar módulo de asistencia: jornadas, asistencia por estudiante y estadísticas.
- [ ] Generar alertas automáticas por inasistencia y reglas de comportamiento.
- [ ] Filtrar grupos, estudiantes, calificaciones y alertas por asignación del docente.
- [ ] Registrar usuario y fecha en observaciones, alertas y cambios relevantes.
- [ ] Añadir exportación de reportes a PDF y Excel.
- [ ] Añadir notificaciones por correo o tiempo real para alertas nuevas.
- [ ] Añadir migraciones versionadas con Alembic.
- [ ] Crear la suite de pruebas automatizadas (backend con pytest, frontend con Vitest, recorridos Playwright): actualmente no existe ningún archivo de pruebas en el repositorio pese a lo descrito en `pruebas.md`.

## Criterio de cierre del MVP

El MVP se considera funcional cuando el administrador puede preparar la estructura académica, asignar docentes, y el docente puede registrar el seguimiento académico de sus estudiantes, consultar métricas y atender alertas desde el navegador.
