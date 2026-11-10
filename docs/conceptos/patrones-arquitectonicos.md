# Patrones arquitectónicos — ClassKids

Análisis integral de los patrones arquitectónicos, de diseño y de estructuración de código implementados en la plataforma **ClassKids**, detallando la separación de responsabilidades, los patrones de datos y el estado de implementación actual.

---

### 1. Arquitectura cliente–servidor desacoplada

ClassKids sigue una arquitectura de **tres componentes físicamente separados**, que se comunican por HTTP/JSON:

```text
┌─────────────────────┐        HTTP/JSON        ┌──────────────────────┐        SQL        ┌──────────────────┐
│   Frontend (SPA)    │ ───────────────────────>│   Backend (API REST) │ ─────────────────>│    PostgreSQL    │
│  React + TS + Vite  │<─────────────────────── │   FastAPI + Uvicorn  │<──────────────────│     (Docker)     │
└─────────────────────┘                         └──────────────────────┘                   └──────────────────┘
     puerto 8080                                     puerto 8000                                puerto 5432
```

El propio backend se autodescribe como *"Backend desacoplado con CRUDs completos en PostgreSQL local"* (`main.py`). No hay renderizado en servidor: el frontend es una Single Page Application (SPA) que consume la API vía `fetch` asíncrono.

---

### 2. Arquitectura en capas (parcialmente aplicada)

El documento de diseño original define explícitamente cuatro capas: presentación, lógica de negocio, acceso a datos y base de datos. En el código real, el mapeo es el siguiente:

| Capa de diseño | Dónde vive en el código | Observación |
| :--- | :--- | :--- |
| **Presentación** | `frontend/src/pages`<br>`frontend/src/components` | **Bien separada:** Páginas por módulo + componentes de UI reutilizables. |
| **Lógica de negocio** | Dentro de las funciones de ruta de `backend/main.py` | **Acoplada:** No existe una capa de servicios independiente; cada `@app.get/post/put/delete` mezcla validación, reglas de negocio y acceso a datos en la misma función. |
| **Acceso a datos** | Dentro de `backend/main.py`, usando `sqlalchemy.text()` | **Acoplada:** No hay un módulo de repositorios ni modelos ORM declarativos que aíslen el SQL del resto de la lógica. |
| **Base de datos** | `backend/init.sql`, PostgreSQL en Docker | **Bien definida:** Aislada formalmente mediante Docker Compose. |

---

### 3. Acceso a datos "SQL-first" en lugar de ORM declarativo

`backend/database.py` configura SQLAlchemy con `declarative_base()` y un `engine`, lo cual sugiere una intención inicial de usar el ORM. Sin embargo, **ningún modelo ORM llega a definirse**: todas las consultas del proyecto usan `sqlalchemy.text()` con SQL parametrizado nativo, ejecutado directamente sobre `Session`.

- **Sin Repository / Active Record:** No se implementan patrones de abstracción de datos sobre clases de entidad.
- **Sin migraciones dinámicas:** No se usa Alembic; el esquema se crea una única vez con `init.sql` al levantar el contenedor de PostgreSQL.
- **Seguridad:** Las consultas utilizan parámetros vinculados (`:param`), previniendo vulnerabilidades de inyección SQL.

---

### 4. Patrón Schema/DTO (Pydantic)

Cada entidad tiene un modelo Pydantic (`GrupoSchema`, `EstudianteSchema`, `MateriaSchema`, `ActividadSchema`, `CalificacionSchema`, `ObservacionSchema`, `AlertaSchema`, `LoginSchema`, etc.) que actúa como **contrato de entrada (DTO)** para los endpoints.

- **Desacoplamiento:** Los esquemas validan tipos de datos de entrada independientemente del esquema físico de la base de datos.
- **Validaciones delegadas:** Ciertas restricciones (como el rango numérico `0.0`–`5.0` en notas) dependen de los `CHECK` de PostgreSQL o de la lógica interna de los endpoints.

---

### 5. Patrón CRUD uniforme por entidad

El backend repite, para cada entidad principal (Grupos, Estudiantes, Materias, Actividades, Calificaciones, Observaciones, Alertas), el mismo patrón de cuatro operaciones con una convención de nombres consistente en español:

```text
obtener_<entidad>()    → GET    /<entidad>
crear_<entidad>()      → POST   /<entidad>
actualizar_<entidad>() → PUT    /<entidad>/{id}
eliminar_<entidad>()   → DELETE /<entidad>/{id}
```

Esta uniformidad facilita la lectura del backend y el consumo desde el frontend, a costa de duplicar código entre entidades al carecer de una capa CRUD genérica.

---

### 6. Frontend: Context API para estado transversal

El frontend usa el patrón de **React Context** para exponer estado compartido a todo el árbol de componentes sin incurrir en *prop-drilling*:

- **`AuthContext`** (`src/contexts/AuthContext.tsx`): Maneja la sesión del usuario, token y métodos `login()` / `signOut()`. Persiste la información en `localStorage` bajo las claves `classkids_token` y `classkids_user`.
- **`SidebarContext`** (`src/contexts/SidebarContext.tsx`): Controla el estado visual de colapso y apertura del menú lateral.

---

### 7. Patrón de rutas protegidas (Route Guard)

`src/App.tsx` define componentes de orden superior que envuelven rutas según el estado de sesión y de rol:

- **`ProtectedRoute`**: Exige sesión iniciada para acceder al panel docente (`/app/*`).
- **`AdminRoute`**: Exige sesión iniciada **y** rol `admin` (`/admin/*`); redirige a `/app` si el usuario no es administrador.
- **`AuthRoute`**: Impide ver pantallas de autenticación (`/auth`) si ya existe una sesión iniciada (redirige a `/app`).

> *Importante:* Estos guards mejoran la experiencia de usuario en el cliente, complementando la seguridad del servidor donde el backend valida JWT en rutas privadas y exige rol `admin` en rutas administrativas.

---

### 8. Cliente API centralizado (Facade)

`src/api/client.ts` centraliza toda la comunicación HTTP en un único objeto fachada (`api.get/post/put/delete`), que añade automáticamente el encabezado `Authorization: Bearer <token>` desde `localStorage` y normaliza el manejo de errores. Todas las páginas consumen la API a través de este cliente en lugar de usar `fetch` directamente.

---

### 9. Sistema de diseño basado en componentes (shadcn/ui + Radix + Tailwind)

`src/components/ui/` contiene componentes de interfaz (botón, diálogo, tabla, select, tabs, tooltip, etc.) generados con **shadcn/ui** sobre primitivas accesibles de **Radix UI** y estilizados con **Tailwind CSS**. Es un patrón de **Design System local** (los componentes viven en el propio repositorio, no en un paquete externo), configurado en `components.json`.

---

### 10. Gestión de estado de servidor: declarada pero infrautilizada

`@tanstack/react-query` está instalado y `App.tsx` envuelve la aplicación en un `QueryClientProvider`, lo que sugiere la intención de usar el patrón **stale-while-revalidate** de React Query para cachear datos de servidor.

Sin embargo, en el código actual la mayoría de vistas obtienen datos combinando `useState` + `useEffect` con el cliente `api`, lo que representa una oportunidad de refactorización para aprovechar mutaciones y caché declarativo.

---

### 11. Autorización por rol, no por institución (single-tenant)

El sistema separa vistas de **Administrador** (`/admin`) y **Docente** (`/app`), pero opera sobre una única base de datos compartida, sin aislamiento por colegio o institución (no existe el concepto de "tenant").

Tampoco existe segmentación de datos por docente: cualquier usuario autenticado puede ver y registrar sobre grupos, estudiantes, calificaciones y alertas de todo el sistema académico local.
