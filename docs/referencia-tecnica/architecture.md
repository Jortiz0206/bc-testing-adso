# Arquitectura del sistema — ClassKids

Documentación técnica de la arquitectura del sistema **ClassKids**, detallando sus componentes, estructura de archivos, flujo de datos y especificaciones de despliegue.

---

### 1. Visión general de la arquitectura

ClassKids utiliza una arquitectura distribuida de **tres capas desacopladas** orquestadas localmente mediante Docker Compose para el motor relacional de base de datos:

```text
┌─────────────────────────────────────────────────────────┐
│              Navegador Web / Cliente                    │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│     Frontend SPA (React 18 + TypeScript + Vite)         │
│     Puerto: 8080 (definido en frontend/vite.config.ts)  │
└────────────────────────────┬────────────────────────────┘
                             │
                             │ HTTP Async (fetch) + Payload JSON
                             │ Header -> Authorization: Bearer <token>
                             ▼
┌─────────────────────────────────────────────────────────┐
│     Backend API REST (FastAPI + Uvicorn)                │
│     Puerto: 8000                                        │
└────────────────────────────┬────────────────────────────┘
                             │
                             │ Session SQLAlchemy
                             │ Consultas SQL Parametrizadas (sqlalchemy.text)
                             ▼
┌─────────────────────────────────────────────────────────┐
│     Base de Datos Relacional (PostgreSQL 15 Docker)     │
│     Puerto: 5432                                        │
└─────────────────────────────────────────────────────────┘
```

> **Nota:** La aplicación opera de forma directa sin servidores intermediarios (BFF - Backend-For-Frontend). La SPA consume los endpoints de la API directamente.

---

### 2. Estructura del repositorio

```text
ClassKids_A/
├── backend/
│   ├── database.py         # Configuración de sesión y motor SQLAlchemy
│   ├── docker-compose.yml  # Orquestador del contenedor PostgreSQL 15-alpine
│   ├── init.sql            # Script DDL e insumos de datos iniciales
│   ├── main.py             # Definición de esquemas Pydantic y endpoints de la API
│   └── requirements.txt    # Dependencias de Python (FastAPI, Uvicorn, Passlib, etc.)
├── frontend/
│   ├── src/
│   │   ├── api/client.ts   # Fachada cliente HTTP con interceptor para Bearer Tokens
│   │   ├── assets/         # Recursos gráficos estáticos
│   │   ├── components/
│   │   │   ├── dashboard/  # Componentes visuales del panel docente
│   │   │   ├── layout/     # Estructuras base (AppLayout, AdminLayout, Sidebar, Navbar)
│   │   │   ├── students/   # Modales e historiales de estudiantes
│   │   │   └── ui/         # Sistema de diseño local basado en componentes shadcn/ui
│   │   ├── contexts/       # Contextos globales de React (AuthContext, SidebarContext)
│   │   ├── hooks/          # Hooks personalizados (useUserRole, use-mobile, use-toast)
│   │   ├── lib/            # Utilidades de estilo y configuración (cn)
│   │   ├── pages/          # Vistas modulares por dominio funcional
│   │   │   └── admin/      # Vistas exclusivas para el rol Administrador
│   │   ├── test/           # Configuración de entornos de pruebas con Vitest
│   │   ├── types/index.ts  # Definiciones de tipos e interfaces de TypeScript
│   │   ├── App.tsx         # Configuración de enrutador y componentes Guards
│   │   └── main.tsx        # Punto de entrada de la aplicación React
│   └── package.json
└── docs/                   # Documentación técnica del proyecto
```

---

### 3. Frontend

- **Stack técnico:** React 18, TypeScript, compilado mediante Vite con SWC.
- **Enrutamiento:** `react-router-dom` v6 estructurado en tres árboles principales:
  - *Público:* `/`, `/auth`, `/reset-password`, `/invitacion`.
  - *Administrador:* `/admin/*`.
  - *Docente:* `/app/*`.
- **Estilos y componentes:** Tailwind CSS, `tailwindcss-animate`, primitivas de Radix UI y ~35 componentes locales de **shadcn/ui** en `src/components/ui/`.
- **Visualización de datos:** Librería Recharts (`BarChart`, `LineChart`, `PieChart`) para tableros analíticos.
- **Notificaciones:** Integración de la librería `sonner` para mensajes emergentes (`toast`).
- **Pruebas:** Vitest y React Testing Library configurados.

#### A. Autenticación y sesión en el cliente
`AuthContext` gestiona la persistencia de la sesión en el navegador mediante `localStorage` bajo las llaves `classkids_token` y `classkids_user`. El rol del usuario es derivado con el hook `useUserRole`.

#### B. Protección de rutas (Route Guards)

| Componente Guard | Condición de acceso | Redirección en fallo |
| :--- | :--- | :--- |
| **`ProtectedRoute`** | Exige usuario autenticado (`user != null`) | `/auth` |
| **`AdminRoute`** | Exige usuario autenticado y rol `admin` | `/auth` (sin sesión) / `/app` (si no es admin) |
| **`AuthRoute`** | Bloquea acceso a login a usuarios autenticados | `/app` |

---

### 4. Backend

- **Stack técnico:** FastAPI 0.110+ con servidor ASGI Uvicorn.
- **Estrategia de datos:** SQLAlchemy 2.x operando como ejecutor de SQL parametrizado (`sqlalchemy.text()`), sin modelos ORM declarativos.
- **Validación de esquemas:** Modelos Pydantic v2 para validación de Payloads de entrada/salida (`GrupoSchema`, `EstudianteSchema`, etc.).
- **Documentación autogenerada:** OpenAPI expuesto en `/docs` (Swagger UI) y `/redoc`.
- **Servicio de correo:** Integración con `smtplib`. Si `SMTP_HOST` no se encuentra parametrizado, las URLs de invitación se devuelven en el cuerpo de la respuesta HTTP para uso manual.

---

### 5. Base de datos

- **Motor:** PostgreSQL 15 en contenedor Docker (`postgres:15-alpine`).
- **Inicialización:** Despliegue automático de tablas y datos semilla mediante el archivo `init.sql` montado en `/docker-entrypoint-initdb.d/`.
- **Persistencia:** Gestionada por el volumen de Docker `postgres_data`.

---

### 6. Flujo de ejecución de una petición (Ejemplo: Registro de calificación)

```text
[Docente]
   │
   ▼ Completa formulario en Calificaciones.tsx
[Frontend]
   │
   ▼ api.post("/calificaciones", payload)
   │ Header: Authorization: Bearer <token>
[FastAPI]
   │
   ▼ Valida Payload con CalificacionSchema
   │ Ejecuta INSERT INTO calificaciones ... RETURNING *
   │ vía SQLAlchemy Session con SQL Parametrizado
[PostgreSQL]
   │
   ▼ Evalúa restricción CHECK (nota >= 0 AND nota <= 5)
[FastAPI]
   │
   ▼ Recalcula promedio del estudiante
   │ Genera alerta de tipo 'low_grade' si promedio < 3.0
   │ Efectúa db.commit() y retorna objeto creado
[Frontend]
   │
   ▼ Notifica mediante Sonner (Toast) y actualiza lista de calificaciones
```

---

### 7. Comandos de ejecución local

| Servicio | Entorno / Comando | Puerto asignado |
| :--- | :--- | :--- |
| **Base de Datos** | `cd backend && docker-compose up -d` | `5432` |
| **Backend API** | `cd backend && py -m uvicorn main:app --reload` | `8000` |
| **Frontend SPA** | `cd frontend && pnpm run dev` | `8080` |

#### Variables de entorno principales (ver `backend/.env.example`):
- `DATABASE_URL`: `postgresql+psycopg://postgres:postgrespassword@localhost:5432/classkids`
- `VITE_API_URL`: `http://127.0.0.1:8000`
- `CORS_ORIGINS`: `http://localhost:8080,http://127.0.0.1:8080,http://localhost:5173,http://127.0.0.1:5173`
- `JWT_SECRET`, `ENVIRONMENT`, `FRONTEND_URL`
- Configuración SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
