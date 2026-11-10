# Matriz de rotación de roles

> Se llena al inicio de cada semana del bootcamp de testing.

**Grupo**: ClassKids · **Ficha**: _número_ · **Stack**: React + FastAPI + PostgreSQL

Roles: **Front** (React y sus E2E) · **Backend** (API FastAPI) · **BD** (datos, repositorio e integración con PostgreSQL).
Los tests E2E se reparten entre los tres roles según el flujo que prueban.

Reglas:

- Cada semana cada integrante cambia de rol, en un ciclo de tres semanas
  (S1/S4/S7 · S2/S5/S8 · S3/S6/S9): al cerrar el bootcamp cada quien pasó **tres veces por cada rol**.
- Cada test de la semana lo firma (autor del commit) quien tiene el rol de ese test.
- Quien revisa tu PR debe tener otro rol esa semana.
- Regla de rama: el repo aplica la regla manual — **nadie fusiona un PR con el CI en rojo**
  (workflow `.github/workflows/tests.yml`).

| Integrante (usuario GitHub) | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 |
|---|---|---|---|---|---|---|---|---|---|
| Johanna Ortiz (`jortiz0206`) | **Front**: E2E inicio de sesión válido · cobertura del frontend | **Backend**: reglas.py: alertas, roles, contraseña y recuperación | **BD**: componente Estudiantes (registro y validación) | **Front**: contrato del API que consume la interfaz | **Backend**: Notificador (correo) con spy, stub y mock |  |  |  |  |
| Alejandra Guio (`alejandraguio2026-ux`) | **Backend**: E2E contraseña incorrecta · cobertura del backend | **BD**: esquemas.py contra las restricciones de las tablas | **Front**: componente Auth | **Backend**: CRUD de estudiantes y recursos · seguridad y errores | **BD**: repositorio como dependencia (mock autospec) |  |  |  |  |
| Jan Janos (`jandairollanosnarvaez-bit`) | **BD**: E2E validación del registro de estudiantes | **Front**: reglas de rendimiento, análisis y calificaciones; rutas, cliente HTTP y sesión | **Backend**: componente AdminUsuarios (usuarios y roles del API) | **BD**: repositorio.py y repositorio falso (aislar la BD) | **Front**: cliente HTTP con MSW, Alertas y Grupos · E2E con page.route |  |  |  |  |

## Cobertura semanal

Anota la cobertura real al cerrar cada semana. El umbral de la semana siguiente es el mayor entre el piso del plan y este valor, redondeado hacia abajo.

| Semana | Frontend (%) | Backend (%) | Umbral configurado para la semana siguiente |
|---|---|---|---|
| S1 (línea base) | 0 | 42.63 | Frontend 0 · Backend 42 |
| S2 (piso 30) | 40.05 | 46.38 | Frontend 40 · Backend 46 |
| S3 (piso 40) | 53.06 | 46.38 | Frontend 53 · Backend 46 |
| S4 (piso 50) | 53.06 | 94.10 | Frontend 53 · Backend 94 |
| S5 (piso 60) | 62.90 | 99.33 | Frontend 62 · Backend 99 |

> La línea base del backend no es 0 porque al importar `main.py` se ejecutan las
> definiciones de rutas y modelos; el único test de la semana (`GET /`) solo cubre el
> arranque. Los E2E no cuentan para la cobertura.

## Registro de vocero aleatorio

El vocero escribe su respuesta **antes** de que el instructor llegue a la mesa; el instructor la verifica con una pregunta corta y anota el resultado.

| Semana | Vocero | Rol preguntado | Respuesta escrita | Resultado (Alto / Medio / Bajo) |
|---|---|---|---|---|
| S1 | | | | |
