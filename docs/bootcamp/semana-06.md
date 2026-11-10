# Semana 6 — Integración con la base de datos

Rama: `test/semana-06` (sale de `test/semana-05`) · Reto: [`week-06/3-reto`](https://github.com/ergrato-dev/bc-testing-adso/tree/main/bootcamp/week-06-integracion_con_bd/3-reto)

## BD de pruebas

`docker-compose.yml` (raíz): PostgreSQL 15 (misma versión mayor que desarrollo), puerto **5433**, base
`classkids_test`. El esquema se crea igual que en desarrollo, con `backend/init.sql`.
Comandos en el README (sección "Pruebas de integración").

- La conexión llega solo por `DATABASE_URL`; sin ella los tests de integración se **saltan** (CI en verde).
- Se niegan a correr si el nombre de la BD no termina en `_test`.
- **Limpieza elegida: transacción con rollback.** Cada test corre en una transacción que se deshace al final;
  los `commit()` del repositorio solo cierran un SAVEPOINT. Se eligió sobre el truncado porque `init.sql`
  siembra datos de demostración que los E2E y la persona que desarrolla usan, y el rollback no los toca.
- Ningún test usa ids fijos: los datos se crean en el test con valores únicos (`uuid4`).

## Roles (columna S6: Alejandra Front · Jan Backend · Johanna BD)

| Integrante | Rol | Archivo |
|---|---|---|
| Johanna Ortiz | BD | `backend/tests/integracion/test_repositorio_bd.py` — cada método de estudiantes, filtro, orden, `JOIN`, y cada restricción (`UNIQUE`, FK, `VARCHAR(50)`, `NOT NULL`, `ON DELETE SET NULL`, `CHECK` de la nota) |
| Jan Janos | Backend | `backend/tests/integracion/test_api_bd.py` — caso feliz verificado en la BD y respuesta del API ante cada restricción violada |
| Johanna Ortiz | BD (E2E) | `e2e/tests/estudiantes-bd.spec.ts` + `e2e/tests/api.ts` — E2E contra la BD de pruebas, datos preparados por el API, sin depender de datos previos |
| Alejandra Guio | Front | `src/test/respuestas-reales.json` capturado del backend con la BD de pruebas; `Calificaciones.test.tsx` y `RecuperacionEInvitacion.test.tsx` usan esos cuerpos en MSW |

## Hallazgos (500 corregidos)

| Restricción violada | Antes | Ahora | Regla y test unitario |
|---|---|---|---|
| `estudiantes.documento UNIQUE` | 500 | 409 con mensaje | `DatoDuplicado` en `repositorio._escribir`; `test_should_answer_409_when_document_already_exists` |
| `estudiantes.grupo_id` FK a un grupo inexistente | 500 | 422 | `ReferenciaInexistente`; `test_should_answer_422_when_group_does_not_exist` |
| `calificaciones.estudiante_id` FK | 500 | 422 | igual; test de integración `test_calificacion_de_estudiante_inexistente…` |

Con el código de la semana 5 (`git stash`), los tests de integración del rol Backend fallaban en esos tres casos.

Front: el handler de `vi.mock` del test de Estudiantes rechazaba con `"Error 409"`, un mensaje que el API nunca
envía. Se cambió por el mensaje real y la página ahora muestra el motivo del API (antes, siempre
"Error al registrar estudiante"). `ResetPassword` leía el token de `window.location`: ahora lo lee del router.

## PostgreSQL vs MySQL

- `ORDER BY fecha_entrega ASC`: PostgreSQL pone los `NULL` al **final**; MySQL los pondría al principio.
  Test: `test_actividades_ordenadas_por_fecha_con_nulos_al_final`.
- `NUMERIC(3,1)` redondea 3.45 a 3.5 en ambos; un valor fuera del `CHECK` falla en PostgreSQL (MySQL < 8.0.16 ignoraba los `CHECK`).

## Mutantes

| Integrante | Mutante | Test que lo detectó |
|---|---|---|
| Johanna (BD) | se quitó el `ORDER BY` de `listar_actividades` | `test_actividades_ordenadas_por_fecha_con_nulos_al_final` |
| Jan (Backend) | se quitó la traducción de `UNIQUE` a `DatoDuplicado` | `test_documento_repetido_responde_409_y_no_500` y `test_documento_unique` |
| Alejandra (Front) | la página vuelve a mostrar siempre "Error al registrar estudiante" | `registrar un documento que ya existe muestra el motivo…` |

## Prueba de fuego

BD recreada desde cero (equivalente a `down -v` + `up`), y luego dos corridas seguidas sin tocar nada:
backend con `DATABASE_URL` → `151 passed` dos veces; E2E → `9 passed` dos veces. La BD queda con los mismos
200 estudiantes de `init.sql` (el rollback no deja datos).

## Cierre de semana (medido sin `DATABASE_URL`, como el CI)

| Parte | Cobertura real | Umbral nuevo (máx(70, real)) |
|---|---|---|
| Frontend | 71.96 % | 71 |
| Backend | 99.34 % | 99 |
