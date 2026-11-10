# Estrategia de pruebas — ClassKids

**Grupo**: Johanna Ortiz, Jan Janos, Alejandra Guio · **Ficha**: _número_ · **Stack**: React + FastAPI + PostgreSQL · **Fecha**: 2026-11-09

## 1. Qué hace la app y qué no puede fallar

ClassKids es el seguimiento académico de un colegio pequeño: los docentes registran estudiantes, actividades y
notas; una nota baja genera una alerta temprana; el administrador gestiona usuarios y asignaciones.

| Riesgo | Por qué importa |
|---|---|
| Alguien entra o ve lo que no le toca | Son datos de menores: notas, observaciones y alertas |
| Una nota se guarda mal (escala 0–100 vs 0–5, redondeo) | Cambia si un estudiante aprueba y si se genera su alerta |
| No se genera la alerta de bajo rendimiento | La alerta temprana es la razón de ser del producto |
| Registros duplicados o huérfanos (doble clic, documento repetido, grupo inexistente) | Notas y alertas quedan sin dueño o se cuentan doble |
| Errores que la interfaz no explica (500, `[object Object]`) | El docente no sabe qué corregir y abandona el registro |

## 2. Qué prueba cada capa y por qué

| Capa | Qué verifica | Herramienta | Tests |
|---|---|---|---|
| Unitarias | Reglas puras: porcentaje↔nota, nivel y tendencia, estado del estudiante, alertas activas, fechas relativas (frontend `src/lib`); estados de alerta, roles, contraseña, destino de recuperación, alerta por promedio, validación contra las restricciones de las tablas (backend) | Vitest · pytest | 110 · 68 |
| Componentes React | Formularios, listas y estados (carga, vacío, error, sin permisos), con `user-event`; cliente HTTP real contra MSW | Vitest + Testing Library + MSW | 68 |
| API | Contrato de cada endpoint con el repositorio falso: feliz, validación, inexistente, 401/403, formato de error; correo y repositorio como dependencias con dobles | pytest + TestClient | 68 |
| Integración con BD | El repositorio y los endpoints contra PostgreSQL 15 real: cada restricción de las tablas, filtros, orden y `JOIN` | pytest + `DATABASE_URL` | 19 |
| E2E (flujos críticos) | Acceso por rol, registrar estudiante, calificar y resolver la alerta, observaciones, estados difíciles (`page.route`) y doble envío | Playwright | 19 (+ setup) |

**Por qué esta forma**: en ClassKids la lógica que más se equivoca vive en el **frontend** (conversiones de
escala, promedios, estados) y en las **reglas del backend**, por eso la base son tests unitarios rápidos. Las
páginas son grandes y mezclan carga de datos con interfaz: los tests de componente con MSW cubren esa unión sin
backend. El SQL vive solo en `repositorio.py`, así que la integración se concentra ahí. Los E2E se reservan para
los 3 flujos críticos y para lo que solo se ve con todo junto (doble clic, red lenta, sesión).

## 3. Qué no se prueba y por qué

| Fuera de la suite o de la cobertura | Motivo |
|---|---|
| `frontend/src/components/ui/**` | Componentes de shadcn/ui generados por su CLI: código de terceros |
| `main.tsx`, `vite-env.d.ts`, `src/types/**` | Arranque y solo tipos, sin lógica |
| `repositorio.py`, `database.py` (en la cobertura) | Adaptadores de BD: se prueban con integración, no con unitarias |
| `NotificadorSMTP` (`# pragma: no cover`) | Adaptador de red; se reemplaza por la interfaz `Notificador` |
| Pantallas legales y Landing (solo render) | Texto estático; se verifica que cargan en `App.test.tsx` |
| Firefox / WebKit, carga y rendimiento | Fuera del alcance del proyecto formativo |

## 4. Datos y entornos

- **BD de pruebas**: `docker-compose.yml` (PostgreSQL 15, puerto 5433, `classkids_test`), esquema desde `init.sql`.
  Cada test de integración corre en una transacción con **rollback**; se niegan a correr si la BD no termina en `_test`.
- **Dobles**: repositorio falso en memoria para los tests de API; `create_autospec(Repositorio)` para verificar qué se
  guarda; `Notificador` con spy/stub/mock (el SMTP nunca se usa real); MSW para el backend visto desde el frontend;
  `page.route` para API caído, listas vacías y red lenta. El reloj de las alertas entra como parámetro.
- **E2E**: la sesión se prepara una vez (`auth.setup.ts`) y se reutiliza; los datos se crean **por el API** con valores
  únicos, así la suite pasa dos veces seguidas y después de `down -v`. Las contraseñas llegan por variables de entorno;
  en el CI el job crea un docente con contraseña aleatoria.

## 5. CI y umbrales

- Workflow: [`.github/workflows/tests.yml`](../.github/workflows/tests.yml) con los jobs `frontend`, `backend`,
  `integracion` (BD como servicio), `e2e` y `evidencia-individual`; caché de pnpm y uv; artefactos de cobertura y de Playwright.
- ⚠️ Las Actions de la cuenta no arrancan por un bloqueo de facturación, así que **no hay enlace a un run en verde**.
  Cada job se corrió en local con los mismos comandos, dos veces seguidas sobre una BD recién creada, cero saltados.
- Regla de rama: manual (nadie fusiona en rojo); el repo no tiene `main`.

| Parte | Cobertura actual | Umbral configurado |
|---|---|---|
| Frontend | 81.95 % líneas · 80.97 % ramas · 80.23 % funciones | 81 líneas y sentencias · 80 ramas y funciones |
| Backend | 100 % | 100 |

## 6. Hallazgos y riesgos conocidos

| Defecto | Capa que lo encontró | Estado |
|---|---|---|
| 61 % se guardaba como 3.0 (redondeo binario de `toFixed`) | Unitaria front (S2) | Corregido |
| Tendencia mensual con el mes equivocado (UTC vs Colombia) | Unitaria front (S2) | Corregido |
| Nota fuera de 0–5, `periodo: null` o texto largo → 500 | Unitaria BD (S2) | Corregido (422) |
| El admin podía quitarse su propio rol o eliminarse | Componente (S3) | Corregido |
| Errores de validación mostrados como `[object Object]`; 500 en texto plano | API (S4) | Corregido |
| El login revelaba si una cuenta estaba deshabilitada | API · seguridad (S4) | Corregido |
| Borrar algo inexistente respondía 200 | API (S4) | Corregido (404) |
| Invitación con SMTP caído → 500 | Dobles (S5) | Corregido |
| "Hace -1 días" en las alertas | Dobles · reloj (S5) | Corregido |
| Documento repetido / grupo o estudiante inexistente → 500 | Integración (S6) | Corregido (409/422) |
| Doble clic creaba dos grupos / dos POST de estudiante | E2E (S7) | Corregido |
| "Ver todos" llevaba a un 404; el panel contaba alertas resueltas | CI · ramas sin cubrir (S8) | Corregido |
| Estudiante sin notas aparece "en riesgo" | Unitaria (S2, revisado en S9) | [Incidencia INC-1](incidencias.md) (`it.fails`) |
| `pnpm --frozen-lockfile` fallaba por el script de msw | Revisión del CI (S9) | Corregido |

## 7. Evidencia individual

Roles rotativos en un ciclo de tres semanas: cada integrante pasó **tres veces por cada rol** (detalle en
[`matriz-rotacion.md`](matriz-rotacion.md)). Cada commit de test está firmado por quien tenía ese rol esa semana.

| Integrante (GitHub) | Front | Backend | BD | Commits de test |
|---|---|---|---|---|
| Johanna Ortiz (`jortiz0206`) | S1 · S4 · S7 | S2 · S5 · S8 | S3 · S6 · S9 | `git shortlog -sn -- '*tests/*' '*.test.*' '*e2e/*'` |
| Alejandra Guio (`alejandraguio2026-ux`) | S3 · S6 · S9 | S1 · S4 · S7 | S2 · S5 · S8 | ídem |
| Jan Janos (`jandairollanosnarvaez-bit`) | S2 · S5 · S8 | S3 · S6 · S9 | S1 · S4 · S7 | ídem |

> Los commits de coordinación (traer el código de ClassKids, CI, documentación y cierres de semana) quedaron a nombre de `jortiz0206`.
