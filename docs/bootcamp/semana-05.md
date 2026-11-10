# Semana 5 — Dobles de prueba

Rama: `test/semana-05` (sale de `test/semana-04`) · Reto: [`week-05/3-reto`](https://github.com/ergrato-dev/bc-testing-adso/tree/main/bootcamp/week-05-dobles_de_prueba/3-reto)

## Inventario de dependencias que el proyecto no controla

| Dependencia | Dónde | Cómo se aísla en los tests |
|---|---|---|
| Servidor de correo (SMTP) | invitaciones y recuperación de contraseña | interfaz propia `Notificador` (`backend/notificador.py`) |
| La base de datos | todos los endpoints | `Repositorio` (fake en memoria o mock con `create_autospec`) |
| El reloj | vencimiento de tokens (backend), "Hace N días" de las alertas (frontend) | `ahora` como parámetro en `src/lib/fechas.ts` |
| El backend, visto desde el frontend | `src/api/client.ts` | MSW en tests de componentes; `page.route` en E2E |

## Roles (columna S5: Jan Front · Johanna Backend · Alejandra BD)

| Integrante | Rol | Tests (tipo de doble) |
|---|---|---|
| Johanna Ortiz | Backend | `backend/tests/test_dobles_notificador.py`: spy (correo enviado y su contenido), stub (SMTP caído), mock (no se llama) |
| Alejandra Guio | BD | `backend/tests/test_dobles_repositorio.py`: mock con `create_autospec(Repositorio)` — no se guarda ante datos inválidos, se guarda exactamente lo validado, una sola confirmación |
| Jan Janos | Front (incluye los E2E de la semana) | `src/api/client.msw.test.ts` (feliz, 500, 422, no JSON), `Alertas.test.tsx` y `Grupos.test.tsx` con MSW; `e2e/tests/estados-dificiles.spec.ts` con `page.route` (API caído, lista vacía, 422) |

Comportamiento y estado: los spies y mocks verifican *con qué* se llamó o que *no* se llamó;
los tests con stub verifican el *estado* final (invitación guardada, respuesta 200 con `email_sent: false`).

## Refactor previo

El backend usaba `smtplib` directamente dentro de los endpoints. Se creó la interfaz propia `Notificador`
(`NotificadorSMTP` para producción, `NotificadorDesactivado` sin `SMTP_HOST`) y los endpoints la reciben con
`Depends(get_notificador)`. Los tests reemplazan la interfaz, nunca la librería.

## Hallazgos corregidos

- 🔎 **Invitación con SMTP caído → 500**: la invitación quedaba guardada pero el admin recibía un error y no el enlace.
  Ahora responde 200 con `email_sent: false` y el enlace. Test: `test_invitation_should_survive_a_failing_smtp_server`.
- 🔎 **"Hace -1 días" en las alertas**: la BD guarda la hora en UTC sin zona y el navegador la lee como hora local
  (UTC-5), así que una alerta recién creada quedaba "en el futuro". Ahora se muestra "Hoy". Una fecha inválida
  muestra "N/A" (antes "Hace NaN semana(s)"). Test: `tiempoTranscurrido > una fecha unas horas en el futuro…`.
- 🔎 **200 con HTML** (un proxy o portal cautivo): el cliente mostraba `Unexpected token <`. Ahora
  `Respuesta inválida del servidor`. Test: `cliente HTTP con MSW > 200 con HTML en vez de JSON…`.
- Accesibilidad: nombres accesibles en los filtros de Alertas y Grupos y etiquetas asociadas en "Crear nuevo grupo".

## Mutantes

| Integrante | Mutante | Test que lo detectó |
|---|---|---|
| Johanna (Backend) | se quitó el `try/except` del envío de la invitación | `test_invitation_should_survive_a_failing_smtp_server` |
| Alejandra (BD) | se quitó la verificación de alerta activa antes de crear otra | `test_should_not_duplicate_low_grade_alert_when_one_is_active` (y el de contrato de la semana 4) |
| Jan (Front) | se quitó el `try/catch` al leer el JSON de una respuesta 200 | `200 con HTML en vez de JSON…` |

## Revisión de exceso de mocks (grupo)

Se revisó un test por integrante con la tabla "Cuándo un doble ayuda y cuándo estorba":

- `test_should_save_exactly_the_validated_grade_and_commit_once` (mock del repositorio): verifica el contrato entre
  endpoint y repositorio, no solo que el mock devuelve lo que se le dijo. Se mantiene.
- `test_invitation_should_be_sent_to_normalized_email_with_activation_link` (spy): verifica destinatario y que el
  enlace del correo es el mismo de la respuesta. Se mantiene.
- Tests de página con MSW: se prefirió MSW sobre `vi.mock` del cliente para que el cliente real (token, errores,
  JSON) también se ejecute. Ningún test verifica solo el mock.

Observación para la semana 6: `Estudiantes` muestra "Error al registrar estudiante" aunque el API mande un
mensaje específico (el E2E con `page.route` lo deja documentado).

## Cierre de semana

| Parte | Cobertura real | Umbral nuevo (máx(60, real)) |
|---|---|---|
| Frontend | 62.90 % | 62 |
| Backend | 99.33 % | 99 |
