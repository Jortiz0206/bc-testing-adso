# Semana 8 — CI completo

Rama: `test/semana-08` (sale de `test/semana-07`) · Reto: [`week-08/3-reto`](https://github.com/ergrato-dev/bc-testing-adso/tree/main/bootcamp/week-08-ci_completo/3-reto)

## Estado inicial del CI

> ⚠️ Las GitHub Actions de la cuenta `Jortiz0206` **no arrancan**: cada run termina en segundos con
> *"The job was not started because your account is locked due to a billing issue"*. Por eso no hay enlaces
> a runs en verde o en rojo. Cada job se ejecutó **en local con los mismos comandos del workflow**, sobre una
> BD recién creada (ver abajo). Cuando se resuelva la facturación, el primer push a una rama `test/**` corre
> el workflow completo.

Antes de esta semana el workflow tenía `frontend`, `backend` y `evidencia-individual`; el backend mostraba
**18 tests saltados** (los de integración, sin `DATABASE_URL`) y no había E2E, caché ni artefactos.

## Roles (columna S8: Jan Front · Johanna Backend · Alejandra BD)

| Integrante | Rol | Job |
|---|---|---|
| Jan Janos | Front | `frontend`: caché de pnpm por `pnpm-lock.yaml` y reporte de cobertura como artefacto (`cobertura-frontend`) |
| Alejandra Guio | BD | `integracion`: PostgreSQL 15 como servicio (misma versión que desarrollo), `init.sql` corre en el job antes de los tests, cero saltados. Y el job `e2e` (abajo), que también levanta la BD como servicio |
| Johanna Ortiz | Backend | `backend`: caché de uv y reporte HTML de cobertura como artefacto (`cobertura-backend`); excluye `tests/integracion` (tiene su job) para quedar con cero saltados |
| Alejandra Guio | BD | `e2e`: BD como servicio, docente de prueba con contraseña aleatoria por corrida (enmascarada, nunca versionada), backend en segundo plano, espera con `curl --retry`, reporte de Playwright y `api.log` como artefacto si falla |

## Prueba local de cada job (mismos comandos, BD recreada desde cero)

| Job | Resultado | Saltados |
|---|---|---|
| backend | 135 passed, cobertura 100 % | 0 |
| integracion | 18 passed | 0 |
| e2e (con el docente creado por el job) | 20 passed (incluye `setup`) | 0 |
| frontend | 178 passed, cobertura 81.95 % | 0 |

## Tests nuevos nacidos del análisis de cada rol

| Integrante | Rama sin cubrir / flujo que faltaba | Test | Mutante que lo hace fallar |
|---|---|---|---|
| Jan (Front) | `AlertsPanel` y `RecentStudents` sin ningún test | `src/pages/Dashboard.test.tsx` (7 tests) | quitar `.filter(esAlertaActiva)` → falla `el panel de alertas cuenta solo las activas` |
| Johanna (Backend) | `main.py` 98 (arranque en producción sin `JWT_SECRET`) y 159-160 (hash de contraseña dañado) | `backend/tests/test_arranque.py` | quitar el `try/except` del login → 500 en vez de 401 |
| Alejandra (BD) | flujo de observaciones del estudiante, sin E2E | `e2e/tests/observaciones.spec.ts` | no recargar la lista tras guardar → falla `una observación registrada aparece…` |

## Hallazgos corregidos

- 🔎 **"Ver todos" de Estudiantes destacados llevaba a una página 404** (`/estudiantes` en vez de `/app/estudiantes`).
  Ahora va a la lista, y tocar un estudiante abre la lista filtrada por su nombre.
- 🔎 **El panel "Alertas Tempranas" contaba como activas las alertas resueltas.** Ahora filtra con `esAlertaActiva`
  y usa `tiempoTranscurrido` (mismo arreglo de "Hace -1 días" de la semana 5).
- Accesibilidad: nombre accesible para el buscador del Dashboard y para el tipo, el texto y el botón de borrar
  de las observaciones.

## El CI no miente (checklist del grupo)

- [x] Frontend, backend, integración y E2E corren en cada PR (`on: pull_request`)
- [x] Cero tests saltados en cada job (comprobado en local con los comandos del workflow)
- [ ] Todos los jobs obligatorios en el ruleset de `main` — el repo no tiene `main` y Actions está bloqueado por
      facturación; se mantiene la regla manual (nadie fusiona en rojo)
- [x] Artefactos de cobertura (frontend y backend) y de Playwright
- [x] Ningún test marcado como *flaky*: la suite E2E pasó `--repeat-each=5` en la semana 7

Pendiente para cuando Actions funcione: provocar un rojo por rol y guardar los enlaces de los runs.

## Cierre de semana

| Parte | Cobertura real | Umbral nuevo (máx(80, real)) |
|---|---|---|
| Frontend | 81.95 % líneas · 80.94 % ramas · 80.23 % funciones | líneas y sentencias 81 · ramas y funciones 80 |
| Backend | 100 % | 100 |
