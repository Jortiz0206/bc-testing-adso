# Semana 4 — Pruebas de API

Rama: `test/semana-04` (sale de `test/semana-03`) · Reto: [`week-04/3-reto`](https://github.com/ergrato-dev/bc-testing-adso/tree/main/bootcamp/week-04-pruebas_de_api/3-reto)

## Roles (columna S4: Johanna Front · Alejandra Backend · Jan BD)

| Integrante | Rol | Ángulo | Archivo |
|---|---|---|---|
| Johanna Ortiz | Front | Contrato que consume la interfaz (campos exactos del JSON y formato de error) | `backend/tests/test_api_contrato_front.py` |
| Alejandra Guio | Backend | El recurso principal (`/estudiantes`): feliz, validación e inexistente; el resto del CRUD; y lo transversal: 401/403/autorizado y contrato de errores | `backend/tests/test_api_estudiantes.py`, `test_api_recursos.py`, `test_api_seguridad.py` |
| Jan Janos | BD | Aislar la base de datos: `repositorio.py` y el repositorio falso en memoria | `backend/repositorio.py`, `backend/tests/fakes.py`, `backend/tests/conftest.py` |

## Primer aporte: aislar la base de datos (rol BD, Jan)

`main.py` ejecutaba SQL directamente en cada endpoint, así que no había forma de probar el API sin PostgreSQL.
Se movió todo el SQL a `backend/repositorio.py` (clase `Repositorio`), que los endpoints reciben con
`Depends(get_repo)`. En los tests, `app.dependency_overrides[get_repo]` lo reemplaza por un repositorio
falso en memoria (`tests/fakes.py`). El repositorio y `database.py` quedan fuera de la medición de cobertura
con un comentario: se prueban contra la BD real en la semana 6.

## Hallazgos corregidos

- 🔎 **Errores de validación ilegibles en la interfaz**: los 422 de FastAPI traen `detail` como lista y
  `api/client.ts` mostraba `[object Object]`. Ahora todo error de validación responde
  `{"detail": "Datos inválidos - campo: mensaje", "errores": [...]}`.
  Test: `test_validation_error_should_have_readable_detail_string_not_a_list`.
- 🔎 **JSON mal formado**: ahora responde 422 con `"El cuerpo no es un JSON válido"`.
  Test: `test_should_answer_422_json_when_body_is_malformed_json`.
- 🔎 **Errores no controlados**: respondían texto plano (`Internal Server Error`). Ahora responden JSON genérico
  sin trazas ni SQL y el detalle va al log del servidor.
  Test: `test_unexpected_error_should_answer_generic_json_without_internals`.
- 🔎 **Seguridad — enumeración de cuentas**: el login respondía 403 "cuenta deshabilitada" aunque la contraseña
  fuera incorrecta, lo que revelaba qué correos existen. Ahora primero valida la contraseña.
  Test: `test_wrong_password_should_not_reveal_that_account_is_disabled`.
- 🔎 **Borrar un registro inexistente respondía 200**: `DELETE /estudiantes/999` (y actividades, calificaciones,
  observaciones, alertas) ahora responde 404. Test: `test_should_answer_404_when_updating_or_deleting_missing_student`.

## Mutantes

| Integrante | Mutante | Test que lo detectó |
|---|---|---|
| Alejandra (Backend) | se quitó el chequeo `role != "admin"` del middleware | `test_should_answer_403_when_docente_calls_admin_endpoints` |
| Johanna (Front) | el 422 vuelve a enviar `detail` como lista | `test_validation_error_should_have_readable_detail_string_not_a_list` |
| Jan (BD) | `POST /estudiantes` sin `status_code=201` | `test_should_create_student_and_answer_201_with_json_body` |

## Cierre de semana

| Parte | Cobertura real | Umbral nuevo (máx(50, real)) |
|---|---|---|
| Frontend | 53.06 % (sin tareas nuevas, ya sobre el 50 %) | 53 |
| Backend | 94.10 % | 94 |

Los E2E de la semana 1 siguen en verde contra el backend refactorizado.
