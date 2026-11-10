# Semana 7 — Playwright a fondo

Rama: `test/semana-07` (sale de `test/semana-06`) · Reto: [`week-07/3-reto`](https://github.com/ergrato-dev/bc-testing-adso/tree/main/bootcamp/week-07-playwright_a_fondo/3-reto)

Semana de E2E; cada flujo crítico lo toma el rol más cercano (S7: **Johanna Front · Alejandra Backend · Jan BD**).

## Los 3 flujos críticos

| Flujo | Responsable (rol) | Por qué es crítico | Archivo |
|---|---|---|---|
| Acceso: inicio de sesión y permisos por rol | Alejandra Guio (Backend) | Mueve acceso y datos de menores; sin él nadie trabaja y con un fallo alguien ve lo que no le toca | `e2e/tests/acceso.spec.ts` |
| Registrar un estudiante | Jan Janos (BD) | El estudiante es el recurso central: notas, observaciones y alertas cuelgan de él | `e2e/tests/estudiantes-bd.spec.ts` |
| Calificar y hacer seguimiento a la alerta | Johanna Ortiz (Front) | Es lo que el docente hace todos los días y lo que se muestra en la sustentación: de la nota a la alerta temprana | `e2e/tests/calificaciones-y-alertas.spec.ts` |

## Base de la suite

- `playwright.config.ts`: `baseURL`, reporte HTML, `trace: 'on-first-retry'`; el backend corre contra la BD de pruebas (semana 6).
- **Sesión reutilizada**: el proyecto `setup` (`tests/auth.setup.ts`) inicia sesión una vez por la UI y guarda
  `playwright/.auth/docente.json`; el resto la carga con `storageState`. Solo `acceso.spec.ts` la desactiva,
  porque prueba el inicio de sesión mismo.
- **Datos por API** con valores únicos: fixture `datos` en `tests/api.ts` (grupo, materia, actividad, estudiante,
  alerta), con el token de la misma sesión guardada.
- **Objetos de página sin aserciones**: `e2e/pages/` (`LoginPage`, `EstudiantesPage`, `CalificacionesPage`, `AlertasPage`).
- Locators accesibles y aserciones web-first; ningún `waitForTimeout`. Para poder usar `getByRole`/`getByLabel`
  se agregaron nombres accesibles en Calificaciones (selectores, cada nota y cada interruptor) y Actividades.

Cada flujo tiene un caso feliz y al menos uno de error visible: contraseña incorrecta y docente en `/admin`;
documento repetido; alerta borrada mientras se mira (404 real del API).

## Parte 3: defectos de tiempos (rol Front, Johanna) (`e2e/tests/tiempos.spec.ts` y el último test de `estudiantes-bd.spec.ts`)

Se retrasaron las respuestas 800 ms dentro de `page.route` y se hizo `dblclick` en cada botón que crea o guarda.

| Botón | Antes | Corrección |
|---|---|---|
| Estudiantes → "Registrar" | 🔎 2 POST: el segundo respondía 409 y la persona veía un error aunque el registro sí se creó | botón deshabilitado mientras guarda (`saving`) |
| Grupos → "Crear grupo" | 🔎 2 POST y **2 grupos iguales** en la BD | botón deshabilitado mientras crea (`creating`) |
| Calificaciones → "Guardar cambios" | 1 POST: ya se deshabilitaba | — |
| Inicio de sesión | 1 POST: ya se deshabilitaba (test de componente de la semana 3) | — |

Red lenta: con `GET /grupos` retrasado, el selector de actividad sigue deshabilitado y no aparece "Guardar
cambios" hasta tener datos; no se encontró una acción posible antes de tiempo.

## Estabilidad

`pnpm exec playwright test --repeat-each=5` en paralelo: **86 passed** (17 tests × 5 + setup), sin reintentos.

## Mutantes

| Integrante | Mutante | Test y mensaje |
|---|---|---|
| Alejandra (Backend) | se quitó la redirección de `AdminRoute` para no-admin | `un docente que intenta abrir el panel de administración…` — `expect(page).toHaveURL` falla |
| Jan (BD) | sin `disabled={saving}` en "Registrar" | `doble clic en "Registrar"…` — `Expected: 1, Received: 2` |
| Johanna (Front) | `porcentajeANota` vuelve a `toFixed(1)` | `la nota digitada en porcentaje queda guardada en escala 0-5` — la BD guarda 3.0 en vez de 3.1 |

## Backend y cierre

Responsable del backend (rol Backend, Alejandra): ya estaba en 99.34 %, sin cambios.
Frontend (rol Front, Johanna): tests de componente de Actividades con MSW (`src/pages/Actividades.test.tsx`).

| Parte | Cobertura real | Umbral nuevo (máx(75, real)) |
|---|---|---|
| Frontend | 78.38 % (funciones 77.77 %) | 78 (funciones 77) |
| Backend | 99.34 % | 99 |
