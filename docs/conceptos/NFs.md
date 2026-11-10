# Requisitos no funcionales — ClassKids

Análisis técnico y evaluación de cumplimiento de los requisitos no funcionales (RNF) de la plataforma **ClassKids**, contrastados contra la implementación en código, la arquitectura de ejecución y el escenario de base de datos relacional PostgreSQL.

---

### Tabla de evaluación de Requisitos No Funcionales (RNF-01 a RNF-13)

| RNF | Categoría | Descripción (según diseño) | Actor impactado | Estado de desarrollo |
| :--- | :--- | :--- | :--- | :--- |
| **RNF-01** | Seguridad | La autenticación y el cierre de sesión deben ser seguros, garantizando el cifrado de contraseñas. | Docente, Administrador | ⚠️ **Parcial**<br>Las contraseñas se cifran con algoritmo PBKDF2 mediante `passlib` y el login valida exclusivamente la coincidencia de hash (ya no existe compatibilidad con texto plano). El cierre de sesión destruye el token en cliente pero no revoca el JWT activo en el backend. |
| **RNF-02** | Rendimiento | Tiempo de respuesta inferior a 3 segundos para el 95% de las peticiones, soportando hasta 50 usuarios concurrentes. | Todos los usuarios | ⚠️ **No verificado**<br>No existen suites de pruebas de carga o estrés en el repositorio. Aunque las consultas relacionales simples responden ágilmente con el volumen actual de datos de prueba, no hay evidencia empírica de comportamiento bajo carga concurrente real. |
| **RNF-03** | Persistencia | La información de grupos, estudiantes y evaluaciones debe almacenarse en un motor de base de datos relacional. | Docente, Administrador | ✅ **Cumplido**<br>Implementado sobre **PostgreSQL 15**, definiendo llaves primarias, llaves foráneas y reglas formales de integridad referencial entre todas las entidades del dominio. |
| **RNF-04** | Usabilidad | La interfaz debe ser intuitiva, ágil y consistente para el registro de actividades, notas y observaciones. | Docente | ✅ **Cumplido**<br>Diseño de formularios estructurado con validaciones en cliente, retroalimentación visual estandarizada mediante `sonner` y componentes de UI uniformes (`shadcn/ui`). |
| **RNF-05** | Usabilidad / Funcionalidad | Los informes y tableros analíticos de rendimiento deben ser exportables a formatos PDF y Excel. | Docente, Administrador | ❌ **No implementado**<br>No existen librerías de generación o endpoints dedicados a la exportación de documentos (PDF/Excel) ni en la capa de UI ni en el API. |
| **RNF-06** | Auditoría / Seguridad | El sistema debe auditorar anotaciones y alertas, registrando fecha, usuario responsable y modificaciones. | Docente, Administrador | ⚠️ **Parcial**<br>Se capturan las marcas de tiempo (`fecha`/`fecha_creacion`), pero omite la autoría explícita del usuario que ejecuta la acción (carece de `id_docente` en observaciones y no posee tablas dedicadas a logs de auditoría). |
| **RNF-07** | Portabilidad | Compatibilidad con navegadores modernos (Chrome, Edge, Firefox) y adaptación responsiva a dispositivos móviles. | Todos los usuarios | ✅ **Cumplido**<br>Arquitectura SPA en React/Vite sin dependencias propietarias de motor. Incorpora clases responsivas de Tailwind CSS y utilidades contextuales para pantallas móviles (`use-mobile`). |
| **RNF-08** | Rendimiento / Disponibilidad | Notificación e integración de alertas en tiempo real para docentes y administradores. | Docente, Administrador | ❌ **No implementado**<br>El sistema no integra WebSockets, Server-Sent Events ni mecanización por polling. La actualización de la bandeja de alertas requiere la recarga o navegación explícita del usuario. |
| **RNF-09** | Disponibilidad / Seguridad | Copias de respaldo automáticas diarias y mecanismos definidos de recuperación ante desastres. | Administrador | ❌ **No implementado**<br>La persistencia se limita al volumen persistente de contenedor Docker (`postgres_data`). No existen rutinas automatizadas de dump, copias fuera de sitio ni planes de contingencia documentados. |
| **RNF-10** | Usabilidad | Interfaz de usuario, mensajes de error y notificaciones presentados en idioma español con terminología clara. | Todos los usuarios | ✅ **Cumplido**<br>Toda la capa de presentación, componentes interactivos, modales y respuestas de notificación (`toast`) están localizados completamente al español. |
| **RNF-11** | Integridad de datos | Calificaciones delimitadas en la escala `0.0` a `5.0`. Las fechas límite de actividades no deben ser anteriores a su fecha de creación. | Docente | ⚠️ **Parcial**<br>El rango numérico de notas está protegido a nivel de esquema en base de datos (`CHECK (nota >= 0 AND nota <= 5)`). No obstante, la validación de fechas límite pasadas no está restringida ni en esquemas Pydantic ni en BD. |
| **RNF-12** | Seguridad / Rendimiento | Expiración e inactivación automática de la sesión del usuario tras 15 minutos de inactividad. | Docente, Administrador | ❌ **No implementado**<br>El token JWT se almacena indefinidamente en `localStorage` sin temporizadores de inactividad o destrucción automática en cliente, permaneciendo válido hasta el cierre manual. |
| **RNF-13** | Disponibilidad | Garantía de disponibilidad del 99% durante la jornada académica (7:00 a.m. – 3:00 p.m.). | Todos los usuarios | ⚠️ **No aplicable**<br>Actualmente la plataforma opera en ambiente de desarrollo local (`uvicorn --reload`, `docker-compose`), sin infraestructura productiva, balanceadores ni métricas de monitoreo de uptime. |

---

### Requisitos adicionales de arquitectura y calidad (RNF-14 a RNF-17)

| RNF | Categoría | Descripción técnica | Estado de desarrollo |
| :--- | :--- | :--- | :--- |
| **RNF-14** | Seguridad | Control de acceso y autorización a nivel de endpoints en la API. | ⚠️ **Parcial**<br>Validación de tokens JWT en rutas privadas y restricción por rol `admin` en `/usuarios` y métricas. Omite controles de autorización por propiedad de datos (un docente puede consultar asignaciones de otro). |
| **RNF-15** | Seguridad | Configuración e implementación de políticas CORS. | ✅ **Cumplido**<br>Parametrizable mediante la variable `CORS_ORIGINS`. En desarrollo restringe el acceso al puerto real del frontend Vite (`localhost:8080`, ver `frontend/vite.config.ts`; también se permite `5173` por compatibilidad). |
| **RNF-16** | Mantenibilidad | Cobertura de pruebas unitarias e integración automatizadas. | ❌ **No implementado**<br>Frontend cuenta con la librería Vitest sin suites de pruebas operativas (`example.test.ts`). El backend carece de framework de pruebas configurado (`pytest`). |
| **RNF-17** | Confiabilidad | Persistencia e integridad de tokens para la recuperación de claves. | ⚠️ **Parcial**<br>Los tokens de `/auth/forgot-password` se persisten en la tabla `password_reset_tokens` con expiración, así que sobreviven a un reinicio del servidor. La limitación real es operativa: sin `SMTP_HOST` configurado, el enlace nunca llega al usuario (el endpoint nunca lo devuelve en la respuesta HTTP), dejando el flujo de recuperación inutilizable en desarrollo local sin SMTP. |

---

## Cuadro de resumen de cumplimiento

| Estado | Cantidad | Porcentaje | Requisitos asociados |
| :--- | :---: | :---: | :--- |
| ✅ **Cumplidos** | **5** | **29.4%** | RNF-03, RNF-04, RNF-07, RNF-10, RNF-15 |
| ⚠️ **Parciales** | **5** | **29.4%** | RNF-01, RNF-06, RNF-11, RNF-14, RNF-17 |
| ❌ **No implementados** | **5** | **29.4%** | RNF-05, RNF-08, RNF-09, RNF-12, RNF-16 |
| 🔍 **No verificados / No aplicables** | **2** | **11.8%** | RNF-02, RNF-13 |
| **Total evaluados** | **17** | **100%** | RNF-01 al RNF-17 |

> *Nota de evolución:* Las acciones para mitigar los requisitos no cumplidos o parciales están documentadas en [`restricciones.md`](restricciones.md) y priorizadas en el [`../backlog.md`](../backlog.md).
