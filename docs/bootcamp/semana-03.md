# Semana 3 — Componentes React

Rama: `test/semana-03` (sale de `test/semana-02`) · Reto: [`week-03/3-reto`](https://github.com/ergrato-dev/bc-testing-adso/tree/main/bootcamp/week-03-componentes_react/3-reto)

La semana es de componentes React, pero cada integrante conserva su rol rotativo (S3: **Alejandra Front · Jan Backend · Johanna BD**) y toma el componente
más cercano a su rol: la interfaz pura, los datos de usuarios y roles que entrega el API, y el registro de datos con su validación.

| Integrante · rol | Componente | Archivo de test | Interacción | Estado no feliz |
|---|---|---|---|---|
| Alejandra Guio · Front | `Auth` (inicio de sesión y recuperación) | `src/pages/Auth.test.tsx` | escribir, enviar, pegar | credenciales rechazadas, respuesta sin token, envío fallido, botón deshabilitado mientras carga |
| Johanna Ortiz · BD | `Estudiantes` (lista y formulario) | `src/pages/Estudiantes.test.tsx` | buscar, filtrar, registrar, editar | cargando, lista vacía, API caído, formulario incompleto, 409 |
| Jan Janos · Backend | `AdminUsuarios` (según el rol) | `src/pages/admin/AdminUsuarios.test.tsx` | invitar, cambiar rol, eliminar con confirmación | cargando, vacío, sin permisos, usuario existente, acciones sobre sí mismo |

- `renderWithProviders` compartido en `src/test/render.tsx` (router en memoria, sesión y toasts).
- El cliente HTTP se reemplaza con `vi.mock("@/api/client")`.
- `src/test/setup.ts` agrega `ResizeObserver`, `hasPointerCapture` y `scrollIntoView`, que jsdom no trae y Radix necesita.
- Queries accesibles en todos los tests; ningún `getByTestId`.

## Hallazgos y arreglos de accesibilidad

- 🔎 **El administrador podía quitarse su propio rol o eliminarse**: `AdminUsuarios` comparaba `r.user_id === user.id`,
  pero `/usuarios` envía el id como texto y el login como número; la comparación nunca era verdadera y los
  controles nunca se deshabilitaban. Corregido comparando como texto.
  Test: `AdminUsuarios > el administrador no puede cambiar su propio rol ni eliminarse`.
- 🔎 **Regresión atrapada por los tests de componente**: la validación extraída en la semana 2 hacía `grupoId.trim()`
  y el id del grupo llega como número desde el API (`TypeError: c.trim is not a function` al registrar).
  Corregido en `validarFormularioEstudiante` con un test unitario nuevo para el id numérico.
- Accesibilidad: etiquetas asociadas en la invitación (`Correo electrónico`, `Rol`), nombre accesible para el
  buscador y los filtros de Estudiantes, para los botones de solo ícono (`Ver a …`, `Eliminar a …`) y para el
  selector de rol de cada fila.

## Mutantes

| Integrante | Mutante | Test que lo detectó |
|---|---|---|
| Alejandra (Front) | `navigate("/app")` → `navigate("/app/grupos")` en `Auth` | `con credenciales válidas guarda la sesión y lleva al panel` |
| Johanna (BD) | se quitó `fetchData()` después de registrar | `registra un estudiante completo, cierra el diálogo y recarga la lista` |
| Jan (Backend) | se volvió a la comparación `r.user_id === user.id` | `el administrador no puede cambiar su propio rol ni eliminarse` |

## Backend

El rol Backend de la semana (Jan) verificó que el backend ya estaba en 46.38 %, por encima del piso del 40 %.

## Cierre de semana

| Parte | Cobertura real | Umbral nuevo (máx(40, real)) |
|---|---|---|
| Frontend | 53.06 % | 53 |
| Backend | 46.38 % | 46 |
