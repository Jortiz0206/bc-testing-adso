# Semana 1 — Por qué probar y primer E2E

Rama: `test/semana-01` · Reto: [`week-01/3-reto`](https://github.com/ergrato-dev/bc-testing-adso/tree/main/bootcamp/week-01-por_que_probar_y_primer_e2e/3-reto)

## ¿Qué prueba esta semana?

Un flujo crítico por integrante, en E2E con Playwright (`e2e/tests/`). Rotación S1: **Johanna Front · Alejandra Backend · Jan BD**.

| Integrante | Rol | Flujo | Archivo | Por qué es crítico |
|---|---|---|---|---|
| Johanna Ortiz | Front | Inicio de sesión válido | `inicio-de-sesion.spec.ts` | Sin sesión ningún docente registra notas ni alertas |
| Alejandra Guio | Backend | Inicio de sesión con contraseña incorrecta | `contrasena-incorrecta.spec.ts` | Protege el acceso y explica por qué no se pudo entrar |
| Jan Janos | BD | Validación del formulario de estudiantes | `validacion-estudiante.spec.ts` | El estudiante es el recurso central: no se aceptan registros incompletos |

## Preparación del repo

- Se trajo el código de ClassKids (`frontend/`, `backend/`, documentación en `docs/`).
- Plantillas: `docs/matriz-rotacion.md` y `.github/pull_request_template.md`.
- `e2e/`: `@playwright/test` en versión exacta (`1.64.1`), `baseURL` y `webServer` que levanta el frontend de ClassKids.
  El test original `inicioDeSesion.ts` no se ejecutaba (Playwright solo toma `*.spec.ts`) y tenía un caso de la plantilla
  (`Get started`) que no existe en ClassKids: se renombró a `inicio-de-sesion.spec.ts` y se reescribió con AAA.
- Aporte de accesibilidad: en el formulario de estudiantes los `<Label>` no estaban asociados a su campo
  (`getByLabel` no los encontraba). Se agregaron `htmlFor`/`id` en `frontend/src/pages/Estudiantes.tsx`.

## Cobertura (línea base)

| Parte | Comando | Línea base | Umbral fijado |
|---|---|---|---|
| Frontend (Johanna, Front) | `pnpm test` → `vitest run --coverage` | 0 % | 0 |
| Backend (Alejandra, Backend) | `uv run pytest` → `--cov` en `pyproject.toml` | 42.63 % | 42 |

Se comprobó que el umbral muerde: con 99 ambos comandos fallan.

## Lo hicimos fallar a propósito

- Mutante: `navigate("/app")` → `navigate("/app/grupos")` en `Auth.tsx`. Falló
  `un docente con credenciales válidas entra al panel y ve su saludo` con
  `Expected pattern: /\/app$/ · Received: /app/grupos`.

## ¿Cómo lo ejecuto?

```bash
# backend y BD arriba (ver README), luego:
cd e2e
pnpm install
pnpm exec playwright install chromium
E2E_DOCENTE_PASSWORD=... E2E_ADMIN_PASSWORD=... pnpm test
```
