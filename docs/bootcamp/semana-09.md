# Semana 9 — Cierre y sustentación

Rama: `test/semana-09` (sale de `test/semana-08`) · Reto: [`week-09/3-reto`](https://github.com/ergrato-dev/bc-testing-adso/tree/main/bootcamp/week-09-integrador/3-reto)

Rotación S9: **Alejandra Front · Jan Backend · Johanna BD** (matriz completa del trimestre en `docs/matriz-rotacion.md`;
cada integrante pasó tres veces por cada rol).

## Tests de la semana por rol

| Integrante | Rol | Test |
|---|---|---|
| Alejandra Guio | Front | Incidencia INC-1 registrada con `it.fails` (`src/lib/estudiantes.test.ts`) |
| Jan Janos | Backend | `ahora_utc()` reemplaza `datetime.utcnow()`, obsoleto desde Python 3.12 (`backend/reglas.py`, test en `test_reglas.py`): la suite del backend pasó de 69 avisos a 1 |
| Johanna Ortiz | BD | Conteos del panel de administración contra PostgreSQL real (`test_conteos_del_panel_cambian_con_cada_registro`) |

## Parte 1: cerrar la suite

1. **Workflow completo dos veces seguidas, sin reintentos manuales.** Como las Actions de la cuenta están bloqueadas
   por facturación, se corrieron los mismos comandos del workflow en local, sobre una BD recreada desde cero en cada corrida:

   | Corrida | frontend | backend | integracion | e2e |
   |---|---|---|---|---|
   | 1 | 179 passed · 81.95 % | 136 passed · 100 % | 19 passed | 20 passed |
   | 2 | 179 passed · 81.95 % | 136 passed · 100 % | 19 passed | 20 passed |

   🔎 Al repetir la instalación limpia del job `frontend` apareció un fallo que no se veía en los equipos con
   `node_modules` ya instalado: `pnpm install --frozen-lockfile` terminaba con `ERR_PNPM_IGNORED_BUILDS` por el
   script de instalación de `msw` (agregado en la semana 5). Se corrigió en `frontend/pnpm-workspace.yaml`
   (`msw: false`; su script solo copia el worker del navegador, que los tests en Node no usan) **en la rama de la
   semana 5** y se llevó con *merge* a las semanas 6, 7, 8 y 9.
2. **Tests saltados**: cero en cada job.
3. **Hallazgos del trimestre**: todos corregidos con su test, salvo uno registrado como incidencia
   ([`docs/incidencias.md`](../incidencias.md), INC-1) con su test marcado `it.fails`.
4. **Umbral ≥ 80 %**: frontend 81 (ramas y funciones 80), backend 100.

## Parte 2: informe de estrategia

[`docs/estrategia-pruebas.md`](../estrategia-pruebas.md), con las siete secciones de la plantilla. Reparto
sugerido (cada quien escribe sobre roles que no tuvo en S8):

| Sección | Quién |
|---|---|
| 1. Qué no puede fallar · 2. Qué prueba cada capa | Alejandra Guio |
| 3. Qué no se prueba · 4. Datos y entornos | Jan Janos |
| 5. CI y umbrales · 6. Hallazgos | Johanna Ortiz |
| 7. Evidencia individual · revisión final | Todo el grupo |

## Parte 3: ensayo cruzado (para llenar en clase)

| Integrante | Rol que más le costó | Qué repasó |
|---|---|---|
| Johanna Ortiz | | |
| Jan Janos | | |
| Alejandra Guio | | |

## Para la sustentación

- Informe abierto: `docs/estrategia-pruebas.md`.
- Último run en verde: pendiente de que GitHub desbloquee Actions en la cuenta (los comandos del workflow pasan en local).
- Cada vocero puede apoyarse en `docs/bootcamp/semana-NN.md`, que lista por semana los tests, los hallazgos y los mutantes de cada rol.
