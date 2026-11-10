# Pruebas y validación

Estado revisado: 28 de agosto de 2026.

> **Nota de reproducibilidad (1 de septiembre de 2026):** las validaciones de esta
> tabla se ejecutaron manualmente/exploratoriamente en su momento. Actualmente el
> repositorio **no contiene** ningún archivo `*.spec.ts` de Playwright, ningún
> `playwright.config.*` ni ninguna suite de `pytest` para el backend, por lo que
> estos resultados no se pueden reproducir automáticamente ejecutando un comando.
> El script `test` de la raíz (`package.json`) tampoco invoca Playwright. Ver el
> ítem "Crear la suite de pruebas automatizadas" en [`backlog.md`](backlog.md).

## Validaciones ejecutadas

| Validación | Resultado | Evidencia |
|---|---|---|
| Sintaxis backend | Aprobada | `py -m py_compile backend/main.py backend/database.py` |
| Importación de dependencias backend | Aprobada | FastAPI, SQLAlchemy, jose y passlib importan correctamente |
| PostgreSQL | Aprobada | Contenedor `classkids_db` activo y aceptando conexiones en puerto 5432 |
| API de salud | Aprobada | `GET /` responde estado operativo |
| Autenticación | Aprobada | Login demo devuelve JWT tipo bearer para roles docente y admin |
| Rutas privadas | Aprobada | Petición sin token o token inválido responde `401 Unauthorized` |
| Control de roles | Aprobada | Docente bloqueado en `/usuarios` (`403 Forbidden`); Admin permitido (`200 OK`) |
| CORS | Aprobada | Preflight `OPTIONS` responde `200` |
| Métricas administrativas | Aprobada | 1 docente, 1 administrador, 3 grupos, 20 estudiantes, 15 actividades y 8 alertas |
| Asignaciones | Aprobada | Crear asignación, rechazar duplicados (`409 Conflict`) y eliminar |
| Actividades | Aprobada | Crear y listar actividad con tipo `examen` |
| Alertas automáticas | Aprobada | Calificación baja (< 3.0) crea automáticamente alerta `low_grade` |
| Suite de pruebas de consola | Aprobada | 31/31 pruebas automatizadas pasadas en suite CLI |
| Pruebas frontend | Aprobada | Vitest: 1 prueba pasada (`src/test/example.test.ts`) |
| Build frontend | Aprobada | Vite build finalizado correctamente (`dist/`) |
| Navegador | Aprobada | Playwright verificó login, dashboard, materias y análisis |

## Recorridos Playwright

- Login como administrador y carga del dashboard.
- Dashboard con métricas reales y alertas visibles.
- Pantalla de materias y asignaciones.
- Pantalla de análisis con promedio general, estudiantes en riesgo y rendimiento por tipo de actividad.
- Login como docente y saludo con el nombre registrado.

## Observaciones

- El lint del frontend mantiene errores preexistentes de `any` y reglas de Fast Refresh.
- Vite muestra una advertencia de bundle mayor a 500 kB, pero la compilación es correcta.
- Las pruebas usan datos locales de demostración y no sustituyen una prueba de carga o un entorno productivo.
