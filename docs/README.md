# Documentación — ClassKids

ClassKids es una plataforma web para la gestión académica de un colegio pequeño. Permite a administradores y docentes gestionar grupos, estudiantes, materias, actividades, calificaciones, observaciones, asignaciones y alertas.

Proyecto desarrollado por Faloon Johanna Ortiz, Alejandra Guio y Yan (Jan) Llanos, como parte del programa Análisis y Desarrollo de Software (ADSO) del SENA.

## Cómo se construyó esta documentación

Esta carpeta se generó a partir de dos fuentes combinadas:

1. **El código fuente real del proyecto** (`backend/` en FastAPI + PostgreSQL, `frontend/` en React + TypeScript), analizado endpoint por endpoint, tabla por tabla y pantalla por pantalla.
2. **El documento de diseño original** *"Proyecto Class Kids — Sistema de apoyo a la atención y seguimiento académico con alertas tempranas"* (SENA, aprendices Guio / Ortiz / Llanos), que contiene la idea de negocio, los casos de uso, el modelo relacional y los anexos de requisitos.

Donde el código implementado coincide con el diseño, se documenta como funcionalidad vigente. Donde el código difiere del diseño, se registra como limitación real en [`conceptos/restricciones.md`](conceptos/restricciones.md). La fuente de verdad es el código actual de `backend/`, `frontend/` y `backend/init.sql`.

## Índice

- [`backlog.md`](backlog.md) — Backlog actualizado: trabajo terminado y siguiente iteración.
- [`pruebas.md`](pruebas.md) — Registro de pruebas, validaciones y resultados de Playwright.

### Conceptos
- [`conceptos/patrones-arquitectonicos.md`](conceptos/patrones-arquitectonicos.md) — Patrones de diseño y arquitectura aplicados (o parcialmente aplicados) en el proyecto.
- [`conceptos/trazabilidad.md`](conceptos/trazabilidad.md) — Matriz de trazabilidad: cada RF/RNF/HU cruzado con su documento, frontend, endpoint, tabla de base de datos y estado real verificado.

### Referencia técnica
- [`referencia-tecnica/architecture.md`](referencia-tecnica/architecture.md) — Arquitectura general del sistema, capas, flujo de datos y stack tecnológico.
- [`referencia-tecnica/database-schema.md`](referencia-tecnica/database-schema.md) — Modelo de datos, tablas, relaciones y diccionario de datos.
- [`referencia-tecnica/api-endpoints.md`](referencia-tecnica/api-endpoints.md) — Referencia completa de los endpoints REST del backend.

### Requisitos
- [`conceptos/RFs.md`](conceptos/RFs.md) — Requisitos funcionales (RF) por módulo, con su estado de implementación.
- [`conceptos/NFs.md`](conceptos/NFs.md) — Requisitos no funcionales (RNF): seguridad, rendimiento, usabilidad y disponibilidad.
- [`conceptos/HUs.md`](conceptos/HUs.md) — Historias de usuario derivadas de los casos de uso del proyecto.
- [`conceptos/restricciones.md`](conceptos/restricciones.md) — Restricciones técnicas, de negocio y brechas conocidas.

### Políticas
- [`politicas/terminos-y-condiciones.md`](politicas/terminos-y-condiciones.md) — Términos y condiciones de uso de la plataforma.
- [`politicas/politica-de-privacidad.md`](politicas/politica-de-privacidad.md) — Qué datos se tratan y con qué finalidad.
- [`politicas/politica-de-cookies.md`](politicas/politica-de-cookies.md) — Almacenamiento del navegador usado por la plataforma.
- [`politicas/proteccion-de-datos.md`](politicas/proteccion-de-datos.md) — Tratamiento de datos personales (Ley 1581 de 2012 / Decreto 1377 de 2013) y medidas de seguridad.

Estas cuatro políticas también están publicadas en la plataforma (`/legal/terminos`, `/legal/privacidad`, `/legal/cookies`, `/legal/proteccion-datos`), enlazadas desde el CTA final y el pie de página de la landing.

## Datos demo verificados

La base de datos local contiene 7 usuarios activos (1 administrador y 6 docentes, uno especializado por materia; la tabla `usuarios` separa `nombre`/`apellido` igual que `estudiantes`), 10 grupos (grados 1° a 5°, secciones A y B, 20 estudiantes cada uno), 200 estudiantes — todos con al menos una calificación —, 5 materias con al menos una actividad y un docente asignado en cada uno de los 10 grupos (52 actividades en total), 215 calificaciones, 10 observaciones, 32 alertas activas (todas por bajo rendimiento real, con la misma regla de promedio &lt; 3.0 que usa `POST /calificaciones`) y 50 asignaciones docente-materia-grupo. Ver el detalle de la ampliación en [`backend/init.sql`](../backend/init.sql).

## Marco metodológico del proyecto

- **Marco de trabajo:** Scrum, con organización en sprints y entregas incrementales.
- **Gestión de requisitos:** historias de usuario derivadas de casos de uso (CU-01 a CU-13).
- **Priorización:** metodología MoSCoW para definir el alcance del producto mínimo viable (MVP).

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router, Recharts |
| Backend | FastAPI, Uvicorn, SQLAlchemy Core, Pydantic, JWT y passlib PBKDF2 |
| Base de datos | PostgreSQL 15, ejecutada en contenedor Docker |
| Empaquetado / tooling | pnpm (workspace), Docker Compose |

## Estado general del proyecto

ClassKids es un **MVP académico funcional**: el flujo principal funciona de extremo a extremo sobre PostgreSQL y datos de demostración. La API protege rutas privadas con JWT, aplica permisos administrativos, usa PBKDF2 para contraseñas, ofrece métricas y gestiona asignaciones. Permanecen limitaciones de alcance: no existe asistencia, las reglas automáticas solo cubren promedio bajo, no hay notificaciones en tiempo real y los tokens de recuperación se mantienen en memoria. Todo se detalla en [`conceptos/restricciones.md`](conceptos/restricciones.md).
