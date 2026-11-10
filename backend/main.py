from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from secrets import token_urlsafe
from datetime import datetime, timedelta
import logging
import os
from jose import JWTError, jwt
from passlib.context import CryptContext
from dotenv import load_dotenv

from esquemas import (
    AcceptInvitationSchema, ActividadSchema, AlertaSchema, AlertStatusSchema, AsignacionSchema,
    CalificacionSchema, EstudianteSchema, ForgotPasswordSchema, GrupoSchema, InvitationSchema,
    LoginSchema, MateriaSchema, ObservacionSchema, ResetPasswordSchema, RoleUpdateSchema,
)
from reglas import (
    destino_de_recuperacion, nombre_rol_bd, normalize_alert_status, password_es_valida,
    ahora_utc, requiere_alerta_por_promedio, rol_de_sesion,
)
from notificador import Notificador, get_notificador
from repositorio import DatoDuplicado, ReferenciaInexistente, RegistroRelacionado, Repositorio, get_repo

load_dotenv()
logger = logging.getLogger("classkids")

app = FastAPI(
    title="ClassKids API - Control Académico",
    description="Backend desacoplado con CRUDs completos en PostgreSQL local",
    version="2.1.0"
)

# El frontend (Vite) corre por defecto en el puerto 8080 (ver frontend/vite.config.ts).
# Se incluye también 5173 (puerto por defecto de Vite) por si se ejecuta sin ese config.
# Esta misma lista se reutiliza para validar `redirect_to` en /auth/forgot-password
# (evita que alguien use ese campo para apuntar el enlace de recuperación a un dominio externo).
ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv(
    "CORS_ORIGINS",
    "http://localhost:8080,http://127.0.0.1:8080,http://localhost:5173,http://127.0.0.1:5173",
).split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =================================================================
# CONTRATO DE ERRORES
# Todas las respuestas de error son JSON con "detail" de tipo texto, que es lo
# que muestra el frontend (api/client.ts). Nunca se envían trazas ni SQL.
# =================================================================

@app.exception_handler(RequestValidationError)
async def error_de_validacion(request: Request, exc: RequestValidationError):
    errores = []
    for error in exc.errors():
        if error["type"] == "json_invalid":
            errores.append({"campo": "cuerpo", "mensaje": "El cuerpo no es un JSON válido"})
            continue
        campo = ".".join(str(parte) for parte in error["loc"] if parte != "body") or "cuerpo"
        errores.append({"campo": campo, "mensaje": error["msg"]})
    detalle = "; ".join(f"{e['campo']}: {e['mensaje']}" for e in errores)
    return JSONResponse({"detail": f"Datos inválidos - {detalle}", "errores": errores}, status_code=422)


@app.exception_handler(DatoDuplicado)
async def dato_duplicado(request: Request, exc: DatoDuplicado):
    # Restricción UNIQUE de la BD (ej. estudiantes.documento): antes respondía 500.
    return JSONResponse({"detail": "Ya existe un registro con esos datos (por ejemplo, el mismo documento)"}, status_code=409)


@app.exception_handler(ReferenciaInexistente)
async def referencia_inexistente(request: Request, exc: ReferenciaInexistente):
    # Llave foránea a un grupo, estudiante o materia que no existe: antes respondía 500.
    return JSONResponse({"detail": "Datos inválidos - se hace referencia a un registro que no existe"}, status_code=422)


@app.exception_handler(Exception)
async def error_inesperado(request: Request, exc: Exception):
    logger.exception("Error no controlado en %s %s", request.method, request.url.path)
    return JSONResponse({"detail": "Error interno del servidor"}, status_code=500)


pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    # Nunca usar un secreto público y conocido como "change-this-secret-in-production":
    # cualquiera podría forjar tokens (incluido rol admin) leyendo el código fuente.
    # En dev generamos uno aleatorio por proceso; en producción, definir JWT_SECRET es obligatorio.
    if os.getenv("ENVIRONMENT", "development").lower() == "production":
        raise RuntimeError("JWT_SECRET no está definido. Configúralo como variable de entorno antes de arrancar en producción.")
    JWT_SECRET = token_urlsafe(48)
    # Sin emoji: en Windows, cuando stdout no usa UTF-8 (consola con code page
    # cp1252, o salida redirigida a archivo/pipe), imprimir un emoji aquí
    # provoca un UnicodeEncodeError que tumba el backend al arrancar.
    print("[AVISO] JWT_SECRET no definido: se genero uno aleatorio solo para esta sesion de desarrollo. "
          "Los tokens emitidos no seran validos tras reiniciar el servidor. Define JWT_SECRET en tu .env para produccion.")

JWT_ALGORITHM = "HS256"
PRIVATE_PREFIXES = ("/usuarios", "/catalogo", "/grupos", "/estudiantes", "/materias", "/actividades", "/calificaciones", "/observaciones", "/alertas", "/roles", "/asignaciones", "/docentes", "/admins")
ADMIN_PREFIXES = ("/usuarios", "/docentes", "/admins")


def create_access_token(user_id: int, role: str) -> str:
    expires = ahora_utc() + timedelta(hours=8)
    return jwt.encode({"sub": str(user_id), "role": role, "exp": expires}, JWT_SECRET, algorithm=JWT_ALGORITHM)


@app.middleware("http")
async def require_authentication(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)
    if request.url.path.startswith(PRIVATE_PREFIXES):
        authorization = request.headers.get("Authorization", "")
        if not authorization.startswith("Bearer "):
            return JSONResponse({"detail": "Autenticación requerida"}, status_code=401)
        try:
            claims = jwt.decode(authorization[7:], JWT_SECRET, algorithms=[JWT_ALGORITHM])
            if request.url.path.startswith(ADMIN_PREFIXES) and claims.get("role") != "admin":
                return JSONResponse({"detail": "Permisos insuficientes"}, status_code=403)
        except (JWTError, ValueError):
            return JSONResponse({"detail": "Token inválido o expirado"}, status_code=401)
    return await call_next(request)

RESET_TOKEN_TTL_MINUTES = 30


def _o_404(registro: Optional[dict], mensaje: str) -> dict:
    if registro is None:
        raise HTTPException(status_code=404, detail=mensaje)
    return registro


# =================================================================
# 🏠 INICIO
# =================================================================

@app.get("/", tags=["Inicio"])
def inicio():
    return {"proyecto": "ClassKids", "estado": "Operativo - PostgreSQL Docker", "autor": "Johanna Ortiz"}


# =================================================================
# AUTENTICACIÓN
# =================================================================

@app.post("/auth/login", tags=["Autenticación"])
def iniciar_sesion(credentials: LoginSchema, repo: Repositorio = Depends(get_repo)):
    user = repo.buscar_usuario_por_email(credentials.email.strip())
    try:
        password_valid = user is not None and pwd_context.verify(credentials.password, user["password_hash"])
    except Exception:
        password_valid = False

    # Primero la contraseña y después si la cuenta está activa: así una contraseña
    # errada nunca revela si el correo existe o está deshabilitado.
    if not password_valid:
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    if not user["activo"]:
        raise HTTPException(status_code=403, detail="Esta cuenta se encuentra deshabilitada. Contacte al administrador.")

    repo.registrar_inicio_sesion(user["id"])
    repo.confirmar()

    role = rol_de_sesion(user["rol"])
    return {
        "access_token": create_access_token(user["id"], role),
        "token_type": "bearer",
        "user": {"id": user["id"], "email": user["email"], "nombre": user["nombre"], "apellido": user["apellido"], "rol": role},
    }



@app.post("/auth/forgot-password", tags=["Autenticación"])
def solicitar_recuperacion(data: ForgotPasswordSchema, repo: Repositorio = Depends(get_repo),
                           notificador: Notificador = Depends(get_notificador)):
    email = data.email.strip().lower()

    email_sent = False
    if repo.existe_usuario_activo(email):
        reset_token = token_urlsafe(24)
        repo.guardar_token_recuperacion(email, reset_token, ahora_utc() + timedelta(minutes=RESET_TOKEN_TTL_MINUTES))
        repo.confirmar()
        # `redirect_to` lo envía el cliente: ver reglas.destino_de_recuperacion.
        frontend_base = destino_de_recuperacion(
            data.redirect_to, ALLOWED_ORIGINS, os.getenv('FRONTEND_URL', 'http://127.0.0.1:8080')
        )
        reset_url = f"{frontend_base.rstrip('/')}?token={reset_token}"
        try:
            email_sent = notificador.enviar(
                email,
                "Recuperación de contraseña - ClassKids",
                f"Solicitaste restablecer tu contraseña. Usa este enlace (vence en {RESET_TOKEN_TTL_MINUTES} minutos): {reset_url}",
            )
        except Exception:
            # No exponemos detalles del error SMTP al cliente; el token ya quedó
            # registrado y puede reintentarse o revisarse por soporte/logs.
            email_sent = False

    # Respuesta siempre genérica: nunca confirmamos si el correo existe,
    # y NUNCA devolvemos el token en la respuesta HTTP (solo viaja por correo).
    return {"mensaje": "Si el correo existe, se ha enviado un enlace de recuperación", "email_sent": email_sent}

@app.post("/auth/reset-password", tags=["Autenticación"])
def restablecer_password(data: ResetPasswordSchema, repo: Repositorio = Depends(get_repo)):
    if not password_es_valida(data.password):
        raise HTTPException(status_code=422, detail="La contraseña debe tener al menos 6 caracteres")
    if not data.token:
        raise HTTPException(status_code=400, detail="Enlace de recuperación inválido o expirado")

    row = repo.buscar_token_recuperacion_vigente(data.token)
    if not row:
        raise HTTPException(status_code=400, detail="Enlace de recuperación inválido o expirado")

    repo.cambiar_password_con_token(row["id"], row["email"], pwd_context.hash(data.password))
    repo.confirmar()
    return {"mensaje": "Contraseña actualizada correctamente"}




# =================================================================
# USUARIOS
# =================================================================

@app.get("/usuarios", tags=["Usuarios"])
def obtener_usuarios(repo: Repositorio = Depends(get_repo)):
    return repo.listar_usuarios()

@app.get("/catalogo/docentes", tags=["Usuarios"])
def obtener_catalogo_docentes(repo: Repositorio = Depends(get_repo)):
    return repo.listar_docentes()


@app.post("/usuarios/invitar", tags=["Usuarios"])
def invitar_usuario(data: InvitationSchema, repo: Repositorio = Depends(get_repo),
                    notificador: Notificador = Depends(get_notificador)):
    email = data.email.strip().lower()
    if repo.existe_usuario_activo(email):
        raise HTTPException(status_code=409, detail="El usuario ya existe")
    rol_id = repo.id_de_rol(nombre_rol_bd(data.role))
    if rol_id is None:
        raise HTTPException(status_code=500, detail="Rol no configurado")
    token = token_urlsafe(48)
    repo.crear_invitacion(email, rol_id, token, ahora_utc() + timedelta(days=2))
    repo.confirmar()
    invitation_url = f"{os.getenv('FRONTEND_URL', 'http://127.0.0.1:8080')}/invitacion?token={token}"
    try:
        email_sent = notificador.enviar(
            email, "Invitación a ClassKids", f"Has sido invitado a ClassKids. Activa tu cuenta aquí: {invitation_url}"
        )
    except Exception:
        # La invitación ya quedó guardada: si el correo falla, el admin todavía
        # puede compartir el enlace que devuelve la respuesta.
        logger.exception("No se pudo enviar la invitación a %s", email)
        email_sent = False
    return {"mensaje": "Invitación creada", "email_sent": email_sent, "invitation_url": invitation_url}

@app.put("/usuarios/{user_id}/rol", tags=["Usuarios"])
def actualizar_rol_usuario(user_id: int, data: RoleUpdateSchema, repo: Repositorio = Depends(get_repo)):
    rol_id = repo.id_de_rol(nombre_rol_bd(data.role))
    if rol_id is None:
        raise HTTPException(status_code=500, detail="Rol no configurado")
    if not repo.actualizar_rol_usuario(user_id, rol_id):
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    repo.confirmar()
    return {"mensaje": "Rol actualizado"}

@app.delete("/usuarios/{user_id}", tags=["Usuarios"])
def desactivar_usuario(user_id: int, repo: Repositorio = Depends(get_repo)):
    if not repo.desactivar_usuario(user_id):
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    repo.confirmar()
    return {"mensaje": "Usuario desactivado"}


@app.get("/docentes/count", tags=["Usuarios"])
def contar_docentes(repo: Repositorio = Depends(get_repo)):
    return {"count": repo.contar("docentes")}

@app.get("/admins/count", tags=["Usuarios"])
def contar_administradores(repo: Repositorio = Depends(get_repo)):
    return {"count": repo.contar("administradores")}

@app.get("/grupos/count", tags=["Grupos"])
def contar_grupos(repo: Repositorio = Depends(get_repo)):
    return {"count": repo.contar("grupos")}

@app.get("/estudiantes/count", tags=["Estudiantes"])
def contar_estudiantes(repo: Repositorio = Depends(get_repo)):
    return {"count": repo.contar("estudiantes_activos")}

@app.get("/actividades/count", tags=["Actividades"])
def contar_actividades(repo: Repositorio = Depends(get_repo)):
    return {"count": repo.contar("actividades")}

@app.get("/alertas/activas/count", tags=["Alertas"])
def contar_alertas_activas(repo: Repositorio = Depends(get_repo)):
    return {"count": repo.contar("alertas_activas")}


@app.get("/invitaciones/{token}", tags=["Usuarios"])
def consultar_invitacion(token: str, repo: Repositorio = Depends(get_repo)):
    invitation = _o_404(repo.buscar_invitacion_vigente(token), "Invitación inválida o expirada")
    return {"email": invitation["email"], "rol": invitation["rol"]}


@app.post("/invitaciones/{token}/aceptar", tags=["Usuarios"])
def aceptar_invitacion(token: str, data: AcceptInvitationSchema, repo: Repositorio = Depends(get_repo)):
    if not password_es_valida(data.password):
        raise HTTPException(status_code=422, detail="La contraseña debe tener al menos 6 caracteres")
    invitation = repo.buscar_invitacion_vigente(token)
    if not invitation:
        raise HTTPException(status_code=400, detail="Invitación inválida o expirada")
    repo.aceptar_invitacion(
        token, invitation["email"], data.nombre.strip(), (data.apellido or "").strip() or None,
        pwd_context.hash(data.password), invitation["rol_id"],
    )
    repo.confirmar()
    return {"mensaje": "Cuenta activada correctamente"}


# =================================================================
# 🏢 1. GRUPOS (Full CRUD)
# =================================================================

def _datos_grupo(g: GrupoSchema) -> dict:
    return {"nombre": g.nombre, "grado": g.grado, "turno": g.turno, "ano_lectivo": g.año_lectivo}

@app.get("/grupos", tags=["Grupos"])
def obtener_grupos(repo: Repositorio = Depends(get_repo)):
    return repo.listar_grupos()

@app.post("/grupos", tags=["Grupos"], status_code=status.HTTP_201_CREATED)
def crear_grupo(g: GrupoSchema, repo: Repositorio = Depends(get_repo)):
    grupo = repo.crear_grupo(_datos_grupo(g))
    repo.confirmar()
    return grupo

@app.put("/grupos/{id}", tags=["Grupos"])
def actualizar_grupo(id: int, g: GrupoSchema, repo: Repositorio = Depends(get_repo)):
    grupo = _o_404(repo.actualizar_grupo(id, _datos_grupo(g)), "Grupo no encontrado")
    repo.confirmar()
    return grupo

@app.delete("/grupos/{id}", tags=["Grupos"])
def eliminar_grupo(id: int, repo: Repositorio = Depends(get_repo)):
    try:
        repo.eliminar_grupo(id)
    except RegistroRelacionado:
        raise HTTPException(status_code=409, detail="No se puede eliminar el grupo: tiene actividades u otros registros asociados")
    return {"mensaje": f"Grupo {id} eliminado"}


# =================================================================
# 👨‍🎓 2. ESTUDIANTES (Full CRUD)
# =================================================================

@app.get("/estudiantes", tags=["Estudiantes"])
def obtener_estudiantes(grupo_id: Optional[int] = None, repo: Repositorio = Depends(get_repo)):
    return repo.listar_estudiantes(grupo_id)

@app.post("/estudiantes", tags=["Estudiantes"], status_code=status.HTTP_201_CREATED)
def crear_estudiante(e: EstudianteSchema, repo: Repositorio = Depends(get_repo)):
    estudiante = repo.crear_estudiante(e.model_dump())
    repo.confirmar()
    return estudiante

@app.put("/estudiantes/{id}", tags=["Estudiantes"])
def actualizar_estudiante(id: int, e: EstudianteSchema, repo: Repositorio = Depends(get_repo)):
    estudiante = _o_404(repo.actualizar_estudiante(id, e.model_dump()), "Estudiante no encontrado")
    repo.confirmar()
    return estudiante

@app.delete("/estudiantes/{id}", tags=["Estudiantes"])
def eliminar_estudiante(id: int, repo: Repositorio = Depends(get_repo)):
    if not repo.eliminar_estudiante(id):
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    repo.confirmar()
    return {"mensaje": "Estudiante eliminado"}


# =================================================================
# 📚 3. MATERIAS (Full CRUD)
# =================================================================

@app.get("/materias", tags=["Materias"])
def obtener_materias(repo: Repositorio = Depends(get_repo)):
    return repo.listar_materias()

@app.post("/materias", tags=["Materias"], status_code=status.HTTP_201_CREATED)
def crear_materia(m: MateriaSchema, repo: Repositorio = Depends(get_repo)):
    materia = repo.crear_materia(m.model_dump())
    repo.confirmar()
    return materia

@app.put("/materias/{id}", tags=["Materias"])
def actualizar_materia(id: int, m: MateriaSchema, repo: Repositorio = Depends(get_repo)):
    materia = _o_404(repo.actualizar_materia(id, m.model_dump()), "Materia no encontrada")
    repo.confirmar()
    return materia

@app.delete("/materias/{id}", tags=["Materias"])
def eliminar_materia(id: int, repo: Repositorio = Depends(get_repo)):
    try:
        repo.eliminar_materia(id)
    except RegistroRelacionado:
        raise HTTPException(status_code=409, detail="No se puede eliminar la materia: tiene actividades, calificaciones u otros registros asociados")
    return {"mensaje": "Materia eliminada"}


# =================================================================
# 📝 4. ACTIVIDADES (Full CRUD)
# =================================================================

@app.get("/actividades", tags=["Actividades"])
def obtener_actividades(grupo_id: Optional[int] = None, repo: Repositorio = Depends(get_repo)):
    return repo.listar_actividades(grupo_id)

@app.post("/actividades", tags=["Actividades"], status_code=status.HTTP_201_CREATED)
def crear_actividad(act: ActividadSchema, repo: Repositorio = Depends(get_repo)):
    actividad = repo.crear_actividad(act.model_dump())
    repo.confirmar()
    return actividad

@app.put("/actividades/{id}", tags=["Actividades"])
def actualizar_actividad(id: int, act: ActividadSchema, repo: Repositorio = Depends(get_repo)):
    actividad = _o_404(repo.actualizar_actividad(id, act.model_dump()), "Actividad no encontrada")
    repo.confirmar()
    return actividad

@app.delete("/actividades/{id}", tags=["Actividades"])
def eliminar_actividad(id: int, repo: Repositorio = Depends(get_repo)):
    if not repo.eliminar_actividad(id):
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    repo.confirmar()
    return {"mensaje": "Actividad eliminada"}


# =================================================================
# 📊 5. CALIFICACIONES (Full CRUD)
# =================================================================

@app.get("/calificaciones", tags=["Calificaciones"])
def obtener_calificaciones(actividad_id: Optional[int] = None, repo: Repositorio = Depends(get_repo)):
    return repo.listar_calificaciones(actividad_id)

@app.post("/calificaciones", tags=["Calificaciones"], status_code=status.HTTP_201_CREATED)
def registrar_calificacion(c: CalificacionSchema, repo: Repositorio = Depends(get_repo)):
    calificacion = repo.crear_calificacion(c.model_dump())
    promedio = repo.promedio_de_estudiante(c.estudiante_id)
    if requiere_alerta_por_promedio(promedio) and not repo.tiene_alerta_bajo_promedio_activa(c.estudiante_id):
        repo.crear_alerta({
            "estudiante_id": c.estudiante_id,
            "tipo": "low_grade",
            "mensaje": f"Promedio académico bajo: {promedio:.2f}",
            "estado": "active",
        })
    repo.confirmar()
    return calificacion

@app.put("/calificaciones/{id}", tags=["Calificaciones"])
def actualizar_calificacion(id: int, c: CalificacionSchema, repo: Repositorio = Depends(get_repo)):
    calificacion = _o_404(repo.actualizar_calificacion(id, c.model_dump()), "Calificación no encontrada")
    repo.confirmar()
    return calificacion

@app.delete("/calificaciones/{id}", tags=["Calificaciones"])
def eliminar_calificacion(id: int, repo: Repositorio = Depends(get_repo)):
    if not repo.eliminar_calificacion(id):
        raise HTTPException(status_code=404, detail="Calificación no encontrada")
    repo.confirmar()
    return {"mensaje": "Calificación eliminada"}


# =================================================================
# 💬 6. OBSERVACIONES (Full CRUD)
# =================================================================

@app.get("/observaciones", tags=["Observaciones"])
def obtener_observaciones(repo: Repositorio = Depends(get_repo)):
    return repo.listar_observaciones()

@app.post("/observaciones", tags=["Observaciones"], status_code=status.HTTP_201_CREATED)
def crear_observacion(o: ObservacionSchema, repo: Repositorio = Depends(get_repo)):
    observacion = repo.crear_observacion(o.model_dump())
    repo.confirmar()
    return observacion

@app.delete("/observaciones/{id}", tags=["Observaciones"])
def eliminar_observacion(id: int, repo: Repositorio = Depends(get_repo)):
    if not repo.eliminar_observacion(id):
        raise HTTPException(status_code=404, detail="Observación no encontrada")
    repo.confirmar()
    return {"mensaje": "Observación eliminada"}


# =================================================================
# 🚨 7. ALERTAS (Full CRUD)
# =================================================================

@app.get("/alertas", tags=["Alertas"])
def obtener_alertas(repo: Repositorio = Depends(get_repo)):
    return repo.listar_alertas()

@app.post("/alertas", tags=["Alertas"], status_code=status.HTTP_201_CREATED)
def crear_alerta(al: AlertaSchema, repo: Repositorio = Depends(get_repo)):
    datos = {**al.model_dump(), "estado": normalize_alert_status(al.estado or "active")}
    alerta = repo.crear_alerta(datos)
    repo.confirmar()
    return alerta

@app.put("/alertas/{id}", tags=["Alertas"])
def cambiar_estado_alerta(id: int, estado: str, repo: Repositorio = Depends(get_repo)):
    alerta = _o_404(repo.actualizar_estado_alerta(id, normalize_alert_status(estado)), "Alerta no encontrada")
    repo.confirmar()
    return alerta

@app.put("/alertas/{id}/estado", tags=["Alertas"])
def actualizar_estado_alerta(id: int, data: AlertStatusSchema, repo: Repositorio = Depends(get_repo)):
    return cambiar_estado_alerta(id, data.estado, repo)

@app.delete("/alertas/{id}", tags=["Alertas"])
def eliminar_alerta(id: int, repo: Repositorio = Depends(get_repo)):
    if not repo.eliminar_alerta(id):
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    repo.confirmar()
    return {"mensaje": "Alerta eliminada"}


# =================================================================
# 👥 8. ROLES Y ASIGNACIONES
# =================================================================

@app.get("/roles", tags=["Soporte"])
def obtener_roles(repo: Repositorio = Depends(get_repo)):
    return repo.listar_roles()

@app.get("/asignaciones", tags=["Soporte"])
def obtener_asignaciones(repo: Repositorio = Depends(get_repo)):
    return repo.listar_asignaciones()

@app.post("/asignaciones", tags=["Soporte"], status_code=status.HTTP_201_CREATED)
def crear_asignacion(data: AsignacionSchema, repo: Repositorio = Depends(get_repo)):
    if not repo.es_docente_activo(data.docente_id):
        raise HTTPException(status_code=404, detail="Docente no encontrado")
    if repo.existe_asignacion(data.materia_id, data.grupo_id):
        raise HTTPException(status_code=409, detail="La asignación ya existe")
    asignacion = repo.crear_asignacion(data.model_dump())
    repo.confirmar()
    return asignacion

@app.delete("/asignaciones/{id}", tags=["Soporte"])
def eliminar_asignacion(id: int, repo: Repositorio = Depends(get_repo)):
    if not repo.eliminar_asignacion(id):
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    repo.confirmar()
    return {"mensaje": "Asignación eliminada"}
