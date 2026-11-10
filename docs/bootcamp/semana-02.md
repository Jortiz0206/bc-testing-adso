# Semana 2 — Pruebas unitarias y CI con umbral

Rama: `test/semana-02` (sale de `test/semana-01`) · Reto: [`week-02/3-reto`](https://github.com/ergrato-dev/bc-testing-adso/tree/main/bootcamp/week-02-pruebas_unitarias_y_ci/3-reto)

## Roles (columna S2)

| Integrante | Rol | Unidades probadas |
|---|---|---|
| Jan Janos | Front | `src/lib/rendimiento.ts`, `analisis.ts`, `estudiantes.ts`, `calificaciones.ts` (extraídas de las páginas) |
| Johanna Ortiz | Backend | `backend/reglas.py` (estados de alerta, rol de sesión, contraseña, destino de recuperación, alerta por promedio) |
| Alejandra Guio | BD | `backend/esquemas.py`: validación de datos contra las restricciones de `init.sql` |

Además, para llegar al piso del 30 % en el frontend, se probaron las reglas de acceso
(`App.test.tsx`: sin sesión → `/auth`, docente en `/admin` → `/app`), el cliente HTTP
(`api/client.test.ts`, con `fetch` reemplazado) y la sesión (`AuthContext.test.tsx`), a cargo del rol Front (Jan).

## Refactor previo

- Frontend: la lógica pura estaba dentro de los `useEffect` de Análisis, Estudiantes y Calificaciones.
  Se extrajo a `src/lib/` y las páginas ahora solo llaman esas funciones.
- Backend: las reglas estaban mezcladas en los endpoints de `main.py`; se movieron a `reglas.py`.
  Los modelos Pydantic se movieron a `esquemas.py`.

## Hallazgos corregidos

- 🔎 **Redondeo de notas** (`porcentajeANota`): `(p / 20).toFixed(1)` redondeaba 59 % (2.95) a 3.0 pero
  61 % (3.05) a 3.0, por la representación binaria. Ahora se redondea de forma consistente (61 % → 3.1).
  Test: `porcentajeANota > convierte 61 % a la nota 3.1 con un decimal`.
- 🔎 **Mes equivocado en la tendencia mensual**: la etiqueta se armaba con `new Date("AAAA-MM-01")`
  (interpretado en UTC) y con el mes base 0, así que en Colombia (UTC-5) mostraba otro mes.
  Test: `calcularAnalisis > agrupa por mes en orden cronológico…` (`Feb 26`, `Mar 26`).
- 🔎 **500 por datos que la BD rechaza**: una nota fuera de 0–5, un `periodo: null` o un texto más largo
  que su columna llegaban a la BD y respondían 500. Ahora responden 422 desde `esquemas.py`.
- Validación del formulario de estudiantes: un campo con solo espacios ya no pasa.

## Mutantes

| Integrante | Mutante | Test que lo detectó |
|---|---|---|
| Jan (Front) | `porcentaje >= 90` → `porcentaje > 90` en `nivelRendimiento` | `nivelRendimiento > clasifica 90 % como excelente` |
| Johanna (Backend) | `promedio < 3.0` → `promedio <= 3.0` en `requiere_alerta_por_promedio` | `test_should_require_low_grade_alert_only_below_three[3.0-False]` |
| Alejandra (BD) | `Field(ge=0, le=5)` → `le=50` en la nota | `test_should_reject_grade_outside_zero_to_five[5.1]` |

## CI

`.github/workflows/tests.yml`: jobs `frontend` (`pnpm test`), `backend` (`uv run pytest`) y
`evidencia-individual`. Corre en cada pull request y en push a `main` y a las ramas `test/**`.
Regla de rama: manual (nadie fusiona en rojo), registrada en la matriz.

## Cierre de semana

| Parte | Cobertura real | Umbral nuevo (máx(30, real)) |
|---|---|---|
| Frontend | 40.05 % | 40 |
| Backend | 46.38 % | 46 |
