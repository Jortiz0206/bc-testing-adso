from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from typing import Optional
from secrets import token_urlsafe
from datetime import datetime, timedelta
from urllib.parse import urlsplit
import os
import smtplib
from email.message import EmailMessage
from jose import JWTError, jwt
from passlib.context import CryptContext
from dotenv import load_dotenv

from database import get_db

load_dotenv()

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
# 📋 MODELOS PYDANTIC
# =================================================================

class GrupoSchema(BaseModel):
    nombre: str
    grado: Optional[str] = "1°"
    turno: Optional[str] = "Matutino"
    año_lectivo: Optional[int] = 2026

class EstudianteSchema(BaseModel):
    documento: str
    nombre: str
    apellido: str
    grupo_id: Optional[int] = None
    activo: Optional[bool] = True

class MateriaSchema(BaseModel):
    nombre: str
    codigo: Optional[str] = None

class ActividadSchema(BaseModel):
    materia_id: int
    grupo_id: int
    titulo: str
    tipo: str = "tarea"
    descripcion: Optional[str] = None
    fecha_entrega: Optional[str] = None

class CalificacionSchema(BaseModel):
    estudiante_id: int
    materia_id: int
    actividad_id: Optional[int] = None
    nota: float
    periodo: Optional[int] = 1
    observacion: Optional[str] = None

class ObservacionSchema(BaseModel):
    estudiante_id: int
    tipo: Optional[str] = "Convivencial"
    descripcion: str

class AlertaSchema(BaseModel):
    estudiante_id: int
    tipo: str
    mensaje: str
    estado: Optional[str] = "active"

class LoginSchema(BaseModel):
    email: str
    password: str

class ForgotPasswordSchema(BaseModel):
    email: str
    redirect_to: Optional[str] = None

class ResetPasswordSchema(BaseModel):
    password: str
    token: Optional[str] = None

class InvitationSchema(BaseModel):
    email: str
    role: str = "docente"

class AcceptInvitationSchema(BaseModel):
    password: str
    nombre: str
    apellido: Optional[str] = None

class RoleUpdateSchema(BaseModel):
    role: str

class AlertStatusSchema(BaseModel):
    estado: str

class AsignacionSchema(BaseModel):
    docente_id: int
    materia_id: int
    grupo_id: int


def normalize_alert_status(value: str) -> str:
    statuses = {
        "Pendiente": "active",
        "Activa": "active",
        "active": "active",
        "En revisión": "reviewed",
        "Revisada": "reviewed",
        "reviewed": "reviewed",
        "Resuelta": "resolved",
        "resolved": "resolved",
    }
    if value not in statuses:
        raise HTTPException(status_code=422, detail="Estado de alerta inválido")
    return statuses[value]


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
    expires = datetime.utcnow() + timedelta(hours=8)
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
def iniciar_sesion(credentials: LoginSchema, db: Session = Depends(get_db)):
    query = text("""
        SELECT u.id, u.email, u.nombre, u.apellido, u.password_hash, u.activo, r.nombre AS rol
        FROM usuarios u LEFT JOIN user_roles r ON r.id = u.rol_id
        WHERE lower(u.email) = lower(:email)
    """)
    user = db.execute(query, {"email": credentials.email.strip()}).fetchone()
    if not user:
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")

    if not user.activo:
        raise HTTPException(status_code=403, detail="Esta cuenta se encuentra deshabilitada. Contacte al administrador.")

    try:
        password_valid = pwd_context.verify(credentials.password, user.password_hash)
    except Exception:
        password_valid = False

    if not password_valid:
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")

    db.execute(text("UPDATE usuarios SET last_sign_in_at = CURRENT_TIMESTAMP WHERE id = :id"), {"id": user.id})
    db.commit()

    role_name = (user.rol or "Docente").lower()
    role = "admin" if role_name == "administrador" else "docente"
    return {
        "access_token": create_access_token(user.id, role),
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "nombre": user.nombre, "apellido": user.apellido, "rol": role},
    }

def enviar_reset_por_correo(email: str, reset_url: str) -> bool:
    host = os.getenv("SMTP_HOST")
    if not host:
        return False
    message = EmailMessage()
    message["Subject"] = "Recuperación de contraseña - ClassKids"
    message["From"] = os.getenv("SMTP_FROM", "no-reply@classkids.local")
    message["To"] = email
    message.set_content(f"Solicitaste restablecer tu contraseña. Usa este enlace (vence en {RESET_TOKEN_TTL_MINUTES} minutos): {reset_url}")
    with smtplib.SMTP(host, int(os.getenv("SMTP_PORT", "587")), timeout=10) as smtp:
        smtp.starttls()
        smtp.login(os.getenv("SMTP_USER", ""), os.getenv("SMTP_PASSWORD", ""))
        smtp.send_message(message)
    return True


@app.post("/auth/forgot-password", tags=["Autenticación"])
def solicitar_recuperacion(data: ForgotPasswordSchema, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    exists = db.execute(text("SELECT 1 FROM usuarios WHERE lower(email) = :email AND activo = TRUE"), {"email": email}).first()

    email_sent = False
    if exists:
        reset_token = token_urlsafe(24)
        expires_at = datetime.utcnow() + timedelta(minutes=RESET_TOKEN_TTL_MINUTES)
        db.execute(text("""
            INSERT INTO password_reset_tokens (email, token, expires_at)
            VALUES (:email, :token, :expires_at)
        """), {"email": email, "token": reset_token, "expires_at": expires_at})
        db.commit()
        # `redirect_to` lo envía el cliente: solo se acepta si su origen (esquema +
        # host + puerto, comparado de forma exacta, no como prefijo de texto) es uno
        # de ALLOWED_ORIGINS. Si no, se ignora y se usa FRONTEND_URL. Esto evita que
        # el enlace de recuperación termine apuntando a un dominio externo — incluido
        # un dominio que simplemente empiece con el texto de un origen permitido
        # (ej. "http://localhost:8080.atacante.com").
        frontend_base = os.getenv('FRONTEND_URL', 'http://127.0.0.1:8080')
        if data.redirect_to:
            candidate = urlsplit(data.redirect_to)
            candidate_origin = f"{candidate.scheme}://{candidate.netloc}"
            if candidate_origin in ALLOWED_ORIGINS:
                frontend_base = data.redirect_to
        reset_url = f"{frontend_base.rstrip('/')}?token={reset_token}"
        try:
            email_sent = enviar_reset_por_correo(email, reset_url)
        except Exception:
            # No exponemos detalles del error SMTP al cliente; el token ya quedó
            # registrado y puede reintentarse o revisarse por soporte/logs.
            email_sent = False

    # Respuesta siempre genérica: nunca confirmamos si el correo existe,
    # y NUNCA devolvemos el token en la respuesta HTTP (solo viaja por correo).
    return {"mensaje": "Si el correo existe, se ha enviado un enlace de recuperación", "email_sent": email_sent}

@app.post("/auth/reset-password", tags=["Autenticación"])
def restablecer_password(data: ResetPasswordSchema, db: Session = Depends(get_db)):
    if len(data.password) < 6:
        raise HTTPException(status_code=422, detail="La contraseña debe tener al menos 6 caracteres")
    if not data.token:
        raise HTTPException(status_code=400, detail="Enlace de recuperación inválido o expirado")

    row = db.execute(text("""
        SELECT id, email FROM password_reset_tokens
        WHERE token = :token AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP
    """), {"token": data.token}).first()
    if not row:
        raise HTTPException(status_code=400, detail="Enlace de recuperación inválido o expirado")

    db.execute(text("UPDATE usuarios SET password_hash = :password WHERE lower(email) = :email"), {"password": pwd_context.hash(data.password), "email": row.email})
    db.execute(text("UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = :id"), {"id": row.id})
    db.commit()
    return {"mensaje": "Contraseña actualizada correctamente"}


def enviar_invitacion_por_correo(email: str, invitation_url: str) -> bool:
    host = os.getenv("SMTP_HOST")
    if not host:
        return False
    message = EmailMessage()
    message["Subject"] = "Invitación a ClassKids"
    message["From"] = os.getenv("SMTP_FROM", "no-reply@classkids.local")
    message["To"] = email
    message.set_content(f"Has sido invitado a ClassKids. Activa tu cuenta aquí: {invitation_url}")
    with smtplib.SMTP(host, int(os.getenv("SMTP_PORT", "587")), timeout=10) as smtp:
        smtp.starttls()
        smtp.login(os.getenv("SMTP_USER", ""), os.getenv("SMTP_PASSWORD", ""))
        smtp.send_message(message)
    return True


@app.get("/usuarios", tags=["Usuarios"])
def obtener_usuarios(db: Session = Depends(get_db)):
    query = text("""
        SELECT u.id::text AS user_id, u.email, u.nombre, u.apellido, CASE WHEN lower(r.nombre) = 'administrador' THEN 'admin' ELSE 'docente' END AS role,
               u.created_at, u.last_sign_in_at
        FROM usuarios u LEFT JOIN user_roles r ON r.id = u.rol_id
        WHERE u.activo = TRUE ORDER BY u.created_at DESC
    """)
    return [dict(row._mapping) for row in db.execute(query)]

@app.get("/catalogo/docentes", tags=["Usuarios"])
def obtener_catalogo_docentes(db: Session = Depends(get_db)):
    query = text("""
        SELECT u.id, u.nombre, u.apellido, u.email
        FROM usuarios u JOIN user_roles r ON r.id = u.rol_id
        WHERE u.activo = TRUE AND lower(r.nombre) = 'docente'
        ORDER BY u.nombre ASC
    """)
    return [dict(row._mapping) for row in db.execute(query)]


@app.post("/usuarios/invitar", tags=["Usuarios"])
def invitar_usuario(data: InvitationSchema, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    role_name = "Administrador" if data.role == "admin" else "Docente"
    existing = db.execute(text("SELECT 1 FROM usuarios WHERE lower(email) = :email AND activo = TRUE"), {"email": email}).first()
    if existing:
        raise HTTPException(status_code=409, detail="El usuario ya existe")
    role = db.execute(text("SELECT id FROM user_roles WHERE nombre = :name"), {"name": role_name}).first()
    if not role:
        raise HTTPException(status_code=500, detail="Rol no configurado")
    token = token_urlsafe(48)
    db.execute(text("""
        INSERT INTO invitaciones (email, rol_id, token, expires_at)
        VALUES (:email, :role_id, :token, :expires_at)
    """), {"email": email, "role_id": role.id, "token": token, "expires_at": datetime.utcnow() + timedelta(days=2)})
    db.commit()
    invitation_url = f"{os.getenv('FRONTEND_URL', 'http://127.0.0.1:8080')}/invitacion?token={token}"
    email_sent = enviar_invitacion_por_correo(email, invitation_url)
    return {"mensaje": "Invitación creada", "email_sent": email_sent, "invitation_url": invitation_url}

@app.put("/usuarios/{user_id}/rol", tags=["Usuarios"])
def actualizar_rol_usuario(user_id: int, data: RoleUpdateSchema, db: Session = Depends(get_db)):
    role_name = "Administrador" if data.role == "admin" else "Docente"
    role = db.execute(text("SELECT id FROM user_roles WHERE nombre = :name"), {"name": role_name}).first()
    if not role:
        raise HTTPException(status_code=500, detail="Rol no configurado")
    result = db.execute(text("UPDATE usuarios SET rol_id = :role_id WHERE id = :id AND activo = TRUE RETURNING id"), {"role_id": role.id, "id": user_id}).first()
    if not result:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    db.commit()
    return {"mensaje": "Rol actualizado"}

@app.delete("/usuarios/{user_id}", tags=["Usuarios"])
def desactivar_usuario(user_id: int, db: Session = Depends(get_db)):
    result = db.execute(text("UPDATE usuarios SET activo = FALSE WHERE id = :id AND activo = TRUE RETURNING id"), {"id": user_id}).first()
    if not result:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    db.commit()
    return {"mensaje": "Usuario desactivado"}

# Consultas de conteo fijadas de antemano (sin interpolar texto de entrada en el
# SQL): cada clave mapea a una sentencia completa y conocida, así esta función
# nunca puede convertirse en una vía de inyección SQL aunque en el futuro alguien
# la reutilice con datos que no sean literales de código.
_COUNT_QUERIES = {
    "docentes": "SELECT COUNT(*) AS count FROM usuarios u JOIN user_roles r ON r.id = u.rol_id WHERE u.activo = TRUE AND lower(r.nombre) = 'docente'",
    "administradores": "SELECT COUNT(*) AS count FROM usuarios u JOIN user_roles r ON r.id = u.rol_id WHERE u.activo = TRUE AND lower(r.nombre) = 'administrador'",
    "grupos": "SELECT COUNT(*) AS count FROM grupos",
    "estudiantes_activos": "SELECT COUNT(*) AS count FROM estudiantes WHERE activo = TRUE",
    "actividades": "SELECT COUNT(*) AS count FROM actividades",
    "alertas_activas": "SELECT COUNT(*) AS count FROM alertas WHERE estado = 'active'",
}

def count_query(key: str):
    return text(_COUNT_QUERIES[key])

@app.get("/docentes/count", tags=["Usuarios"])
def contar_docentes(db: Session = Depends(get_db)):
    row = db.execute(count_query("docentes")).first()
    return {"count": row.count}

@app.get("/admins/count", tags=["Usuarios"])
def contar_administradores(db: Session = Depends(get_db)):
    row = db.execute(count_query("administradores")).first()
    return {"count": row.count}

@app.get("/grupos/count", tags=["Grupos"])
def contar_grupos(db: Session = Depends(get_db)):
    return {"count": db.execute(count_query("grupos")).scalar_one()}

@app.get("/estudiantes/count", tags=["Estudiantes"])
def contar_estudiantes(db: Session = Depends(get_db)):
    return {"count": db.execute(count_query("estudiantes_activos")).scalar_one()}

@app.get("/actividades/count", tags=["Actividades"])
def contar_actividades(db: Session = Depends(get_db)):
    return {"count": db.execute(count_query("actividades")).scalar_one()}

@app.get("/alertas/activas/count", tags=["Alertas"])
def contar_alertas_activas(db: Session = Depends(get_db)):
    return {"count": db.execute(count_query("alertas_activas")).scalar_one()}


@app.get("/invitaciones/{token}", tags=["Usuarios"])
def consultar_invitacion(token: str, db: Session = Depends(get_db)):
    invitation = db.execute(text("""
        SELECT i.email, r.nombre AS rol FROM invitaciones i JOIN user_roles r ON r.id = i.rol_id
        WHERE i.token = :token AND i.accepted_at IS NULL AND i.expires_at > CURRENT_TIMESTAMP
    """), {"token": token}).first()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitación inválida o expirada")
    return {"email": invitation.email, "rol": invitation.rol}


@app.post("/invitaciones/{token}/aceptar", tags=["Usuarios"])
def aceptar_invitacion(token: str, data: AcceptInvitationSchema, db: Session = Depends(get_db)):
    if len(data.password) < 6:
        raise HTTPException(status_code=422, detail="La contraseña debe tener al menos 6 caracteres")
    invitation = db.execute(text("""
        SELECT email, rol_id FROM invitaciones
        WHERE token = :token AND accepted_at IS NULL AND expires_at > CURRENT_TIMESTAMP
    """), {"token": token}).first()
    if not invitation:
        raise HTTPException(status_code=400, detail="Invitación inválida o expirada")
    db.execute(text("""
        INSERT INTO usuarios (email, nombre, apellido, password_hash, rol_id)
        VALUES (:email, :nombre, :apellido, :password, :rol_id)
        ON CONFLICT (email) DO UPDATE SET nombre = EXCLUDED.nombre, apellido = EXCLUDED.apellido, password_hash = EXCLUDED.password_hash, rol_id = EXCLUDED.rol_id, activo = TRUE
    """), {"email": invitation.email, "nombre": data.nombre.strip(), "apellido": (data.apellido or "").strip() or None, "password": pwd_context.hash(data.password), "rol_id": invitation.rol_id})
    db.execute(text("UPDATE invitaciones SET accepted_at = CURRENT_TIMESTAMP WHERE token = :token"), {"token": token})
    db.commit()
    return {"mensaje": "Cuenta activada correctamente"}


# =================================================================
# 🏢 1. GRUPOS (Full CRUD)
# =================================================================

@app.get("/grupos", tags=["Grupos"])
def obtener_grupos(db: Session = Depends(get_db)):
    return [dict(row._mapping) for row in db.execute(text("SELECT * FROM grupos ORDER BY id ASC"))]

@app.post("/grupos", tags=["Grupos"], status_code=status.HTTP_201_CREATED)
def crear_grupo(g: GrupoSchema, db: Session = Depends(get_db)):
    query = text("INSERT INTO grupos (nombre, grado, turno, ano_lectivo) VALUES (:n, :gr, :t, :a) RETURNING *")
    res = db.execute(query, {"n": g.nombre, "gr": g.grado, "t": g.turno, "a": g.año_lectivo}).fetchone()
    db.commit()
    return dict(res._mapping)

@app.put("/grupos/{id}", tags=["Grupos"])
def actualizar_grupo(id: int, g: GrupoSchema, db: Session = Depends(get_db)):
    query = text("UPDATE grupos SET nombre=:n, grado=:gr, turno=:t, ano_lectivo=:a WHERE id=:id RETURNING *")
    res = db.execute(query, {"n": g.nombre, "gr": g.grado, "t": g.turno, "a": g.año_lectivo, "id": id}).fetchone()
    if not res: raise HTTPException(status_code=404, detail="Grupo no encontrado")
    db.commit()
    return dict(res._mapping)

@app.delete("/grupos/{id}", tags=["Grupos"])
def eliminar_grupo(id: int, db: Session = Depends(get_db)):
    try:
        db.execute(text("DELETE FROM grupos WHERE id = :id"), {"id": id})
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="No se puede eliminar el grupo: tiene actividades u otros registros asociados")
    return {"mensaje": f"Grupo {id} eliminado"}


# =================================================================
# 👨‍🎓 2. ESTUDIANTES (Full CRUD)
# =================================================================

@app.get("/estudiantes", tags=["Estudiantes"])
def obtener_estudiantes(grupo_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = "SELECT e.*, g.nombre as nombre_grupo FROM estudiantes e LEFT JOIN grupos g ON e.grupo_id = g.id"
    params = {}
    if grupo_id is not None:
        query += " WHERE e.grupo_id = :grupo_id"
        params["grupo_id"] = grupo_id
    query += " ORDER BY e.id ASC"
    return [dict(row._mapping) for row in db.execute(text(query), params)]

@app.post("/estudiantes", tags=["Estudiantes"], status_code=status.HTTP_201_CREATED)
def crear_estudiante(e: EstudianteSchema, db: Session = Depends(get_db)):
    query = text("INSERT INTO estudiantes (documento, nombre, apellido, grupo_id, activo) VALUES (:doc, :nom, :ape, :grupo, :act) RETURNING *")
    res = db.execute(query, {"doc": e.documento, "nom": e.nombre, "ape": e.apellido, "grupo": e.grupo_id, "act": e.activo}).fetchone()
    db.commit()
    return dict(res._mapping)

@app.put("/estudiantes/{id}", tags=["Estudiantes"])
def actualizar_estudiante(id: int, e: EstudianteSchema, db: Session = Depends(get_db)):
    query = text("UPDATE estudiantes SET documento=:doc, nombre=:nom, apellido=:ape, grupo_id=:grupo, activo=:act WHERE id=:id RETURNING *")
    res = db.execute(query, {"doc": e.documento, "nom": e.nombre, "ape": e.apellido, "grupo": e.grupo_id, "act": e.activo, "id": id}).fetchone()
    if not res: raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    db.commit()
    return dict(res._mapping)

@app.delete("/estudiantes/{id}", tags=["Estudiantes"])
def eliminar_estudiante(id: int, db: Session = Depends(get_db)):
    db.execute(text("DELETE FROM estudiantes WHERE id = :id"), {"id": id})
    db.commit()
    return {"mensaje": "Estudiante eliminado"}


# =================================================================
# 📚 3. MATERIAS (Full CRUD)
# =================================================================

@app.get("/materias", tags=["Materias"])
def obtener_materias(db: Session = Depends(get_db)):
    return [dict(row._mapping) for row in db.execute(text("SELECT * FROM materias ORDER BY id ASC"))]

@app.post("/materias", tags=["Materias"], status_code=status.HTTP_201_CREATED)
def crear_materia(m: MateriaSchema, db: Session = Depends(get_db)):
    res = db.execute(text("INSERT INTO materias (nombre, codigo) VALUES (:n, :c) RETURNING *"), {"n": m.nombre, "c": m.codigo}).fetchone()
    db.commit()
    return dict(res._mapping)

@app.put("/materias/{id}", tags=["Materias"])
def actualizar_materia(id: int, m: MateriaSchema, db: Session = Depends(get_db)):
    res = db.execute(text("UPDATE materias SET nombre=:n, codigo=:c WHERE id=:id RETURNING *"), {"n": m.nombre, "c": m.codigo, "id": id}).fetchone()
    if not res: raise HTTPException(status_code=404, detail="Materia no encontrada")
    db.commit()
    return dict(res._mapping)

@app.delete("/materias/{id}", tags=["Materias"])
def eliminar_materia(id: int, db: Session = Depends(get_db)):
    try:
        db.execute(text("DELETE FROM materias WHERE id = :id"), {"id": id})
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="No se puede eliminar la materia: tiene actividades, calificaciones u otros registros asociados")
    return {"mensaje": "Materia eliminada"}


# =================================================================
# 📝 4. ACTIVIDADES (Full CRUD)
# =================================================================

@app.get("/actividades", tags=["Actividades"])
def obtener_actividades(grupo_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = """
         SELECT act.*, m.nombre as materia_nombre, g.nombre as grupo_nombre,
             CASE WHEN act.fecha_entrega < CURRENT_DATE THEN 'vencida' ELSE 'pendiente' END AS estado
        FROM actividades act
        JOIN materias m ON act.materia_id = m.id
        JOIN grupos g ON act.grupo_id = g.id
    """
    params = {}
    if grupo_id is not None:
        query += " WHERE act.grupo_id = :grupo_id"
        params["grupo_id"] = grupo_id
    query += " ORDER BY act.fecha_entrega ASC"
    return [dict(row._mapping) for row in db.execute(text(query), params)]

@app.post("/actividades", tags=["Actividades"], status_code=status.HTTP_201_CREATED)
def crear_actividad(act: ActividadSchema, db: Session = Depends(get_db)):
    query = text("INSERT INTO actividades (materia_id, grupo_id, titulo, tipo, descripcion, fecha_entrega) VALUES (:m_id, :g_id, :tit, :tipo, :desc, :f_ent) RETURNING *")
    res = db.execute(query, {"m_id": act.materia_id, "g_id": act.grupo_id, "tit": act.titulo, "tipo": act.tipo, "desc": act.descripcion, "f_ent": act.fecha_entrega}).fetchone()
    db.commit()
    return dict(res._mapping)

@app.put("/actividades/{id}", tags=["Actividades"])
def actualizar_actividad(id: int, act: ActividadSchema, db: Session = Depends(get_db)):
    query = text("UPDATE actividades SET materia_id=:m_id, grupo_id=:g_id, titulo=:tit, tipo=:tipo, descripcion=:desc, fecha_entrega=:f_ent WHERE id=:id RETURNING *")
    res = db.execute(query, {"m_id": act.materia_id, "g_id": act.grupo_id, "tit": act.titulo, "tipo": act.tipo, "desc": act.descripcion, "f_ent": act.fecha_entrega, "id": id}).fetchone()
    if not res: raise HTTPException(status_code=404, detail="Actividad no encontrada")
    db.commit()
    return dict(res._mapping)

@app.delete("/actividades/{id}", tags=["Actividades"])
def eliminar_actividad(id: int, db: Session = Depends(get_db)):
    db.execute(text("DELETE FROM actividades WHERE id = :id"), {"id": id})
    db.commit()
    return {"mensaje": "Actividad eliminada"}


# =================================================================
# 📊 5. CALIFICACIONES (Full CRUD)
# =================================================================

@app.get("/calificaciones", tags=["Calificaciones"])
def obtener_calificaciones(actividad_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = """
        SELECT c.*, e.nombre as estudiante_nombre, e.apellido as estudiante_apellido, m.nombre as materia_nombre
        FROM calificaciones c
        JOIN estudiantes e ON c.estudiante_id = e.id
        JOIN materias m ON c.materia_id = m.id
    """
    params = {}
    if actividad_id is not None:
        query += " WHERE c.actividad_id = :actividad_id"
        params["actividad_id"] = actividad_id
    query += " ORDER BY c.fecha_registro DESC"
    return [dict(row._mapping) for row in db.execute(text(query), params)]

@app.post("/calificaciones", tags=["Calificaciones"], status_code=status.HTTP_201_CREATED)
def registrar_calificacion(c: CalificacionSchema, db: Session = Depends(get_db)):
    query = text("INSERT INTO calificaciones (estudiante_id, materia_id, actividad_id, nota, periodo, observacion) VALUES (:e_id, :m_id, :a_id, :nota, :per, :obs) RETURNING *")
    res = db.execute(query, {"e_id": c.estudiante_id, "m_id": c.materia_id, "a_id": c.actividad_id, "nota": c.nota, "per": c.periodo, "obs": c.observacion}).fetchone()
    average = db.execute(text("SELECT AVG(nota) AS promedio FROM calificaciones WHERE estudiante_id = :id"), {"id": c.estudiante_id}).scalar()
    if average is not None and float(average) < 3:
        active_alert = db.execute(text("""
            SELECT 1 FROM alertas
            WHERE estudiante_id = :id AND tipo = 'low_grade' AND estado IN ('active', 'Pendiente')
        """), {"id": c.estudiante_id}).first()
        if not active_alert:
            db.execute(text("""
                INSERT INTO alertas (estudiante_id, tipo, mensaje, estado)
                VALUES (:id, 'low_grade', :mensaje, 'active')
            """), {"id": c.estudiante_id, "mensaje": f"Promedio académico bajo: {float(average):.2f}"})
    db.commit()
    return dict(res._mapping)

@app.put("/calificaciones/{id}", tags=["Calificaciones"])
def actualizar_calificacion(id: int, c: CalificacionSchema, db: Session = Depends(get_db)):
    query = text("UPDATE calificaciones SET estudiante_id=:e_id, materia_id=:m_id, actividad_id=:a_id, nota=:nota, periodo=:per, observacion=:obs WHERE id=:id RETURNING *")
    res = db.execute(query, {"e_id": c.estudiante_id, "m_id": c.materia_id, "a_id": c.actividad_id, "nota": c.nota, "per": c.periodo, "obs": c.observacion, "id": id}).fetchone()
    if not res: raise HTTPException(status_code=404, detail="Calificación no encontrada")
    db.commit()
    return dict(res._mapping)

@app.delete("/calificaciones/{id}", tags=["Calificaciones"])
def eliminar_calificacion(id: int, db: Session = Depends(get_db)):
    db.execute(text("DELETE FROM calificaciones WHERE id = :id"), {"id": id})
    db.commit()
    return {"mensaje": "Calificación eliminada"}


# =================================================================
# 💬 6. OBSERVACIONES (Full CRUD)
# =================================================================

@app.get("/observaciones", tags=["Observaciones"])
def obtener_observaciones(db: Session = Depends(get_db)):
    query = text("SELECT o.*, e.nombre as estudiante_nombre, e.apellido as estudiante_apellido FROM observaciones o JOIN estudiantes e ON o.estudiante_id = e.id ORDER BY o.fecha DESC")
    return [dict(row._mapping) for row in db.execute(query)]

@app.post("/observaciones", tags=["Observaciones"], status_code=status.HTTP_201_CREATED)
def crear_observacion(o: ObservacionSchema, db: Session = Depends(get_db)):
    query = text("INSERT INTO observaciones (estudiante_id, tipo, descripcion) VALUES (:e_id, :tipo, :desc) RETURNING *")
    res = db.execute(query, {"e_id": o.estudiante_id, "tipo": o.tipo, "desc": o.descripcion}).fetchone()
    db.commit()
    return dict(res._mapping)

@app.delete("/observaciones/{id}", tags=["Observaciones"])
def eliminar_observacion(id: int, db: Session = Depends(get_db)):
    db.execute(text("DELETE FROM observaciones WHERE id = :id"), {"id": id})
    db.commit()
    return {"mensaje": "Observación eliminada"}


# =================================================================
# 🚨 7. ALERTAS (Full CRUD)
# =================================================================

@app.get("/alertas", tags=["Alertas"])
def obtener_alertas(db: Session = Depends(get_db)):
    query = text("SELECT a.*, e.nombre as estudiante_nombre, e.apellido as estudiante_apellido FROM alertas a JOIN estudiantes e ON a.estudiante_id = e.id ORDER BY a.fecha_creacion DESC")
    return [dict(row._mapping) for row in db.execute(query)]

@app.post("/alertas", tags=["Alertas"], status_code=status.HTTP_201_CREATED)
def crear_alerta(al: AlertaSchema, db: Session = Depends(get_db)):
    estado = normalize_alert_status(al.estado or "active")
    query = text("INSERT INTO alertas (estudiante_id, tipo, mensaje, estado) VALUES (:e_id, :tipo, :msj, :est) RETURNING *")
    res = db.execute(query, {"e_id": al.estudiante_id, "tipo": al.tipo, "msj": al.mensaje, "est": estado}).fetchone()
    db.commit()
    return dict(res._mapping)

@app.put("/alertas/{id}", tags=["Alertas"])
def cambiar_estado_alerta(id: int, estado: str, db: Session = Depends(get_db)):
    res = db.execute(text("UPDATE alertas SET estado=:est WHERE id=:id RETURNING *"), {"est": normalize_alert_status(estado), "id": id}).fetchone()
    if not res: raise HTTPException(status_code=404, detail="Alerta no encontrada")
    db.commit()
    return dict(res._mapping)

@app.put("/alertas/{id}/estado", tags=["Alertas"])
def actualizar_estado_alerta(id: int, data: AlertStatusSchema, db: Session = Depends(get_db)):
    return cambiar_estado_alerta(id, data.estado, db)

@app.delete("/alertas/{id}", tags=["Alertas"])
def eliminar_alerta(id: int, db: Session = Depends(get_db)):
    db.execute(text("DELETE FROM alertas WHERE id = :id"), {"id": id})
    db.commit()
    return {"mensaje": "Alerta eliminada"}


# =================================================================
# 👥 8. ROLES Y ASIGNACIONES
# =================================================================

@app.get("/roles", tags=["Soporte"])
def obtener_roles(db: Session = Depends(get_db)):
    return [dict(row._mapping) for row in db.execute(text("SELECT * FROM user_roles ORDER BY id ASC"))]

@app.get("/asignaciones", tags=["Soporte"])
def obtener_asignaciones(db: Session = Depends(get_db)):
    query = text("""
        SELECT a.id, a.docente_id, a.materia_id, a.grupo_id,
               TRIM(u.nombre || ' ' || COALESCE(u.apellido, '')) as docente, m.nombre as materia_nombre, g.nombre as grupo_nombre
        FROM asignaciones a
        JOIN usuarios u ON a.docente_id = u.id
        JOIN materias m ON a.materia_id = m.id
        JOIN grupos g ON a.grupo_id = g.id
        ORDER BY g.nombre, m.nombre, u.nombre
    """)
    return [dict(row._mapping) for row in db.execute(query)]

@app.post("/asignaciones", tags=["Soporte"], status_code=status.HTTP_201_CREATED)
def crear_asignacion(data: AsignacionSchema, db: Session = Depends(get_db)):
    docente = db.execute(text("""
        SELECT u.id FROM usuarios u
        JOIN user_roles r ON r.id = u.rol_id
        WHERE u.id = :docente_id AND u.activo = TRUE AND lower(r.nombre) = 'docente'
    """), {"docente_id": data.docente_id}).first()
    if not docente:
        raise HTTPException(status_code=404, detail="Docente no encontrado")
    exists = db.execute(text("""
        SELECT 1 FROM asignaciones
        WHERE materia_id = :materia_id AND grupo_id = :grupo_id
    """), data.model_dump()).first()
    if exists:
        raise HTTPException(status_code=409, detail="La asignación ya existe")
    result = db.execute(text("""
        INSERT INTO asignaciones (docente_id, materia_id, grupo_id)
        VALUES (:docente_id, :materia_id, :grupo_id)
        RETURNING id, docente_id, materia_id, grupo_id
    """), data.model_dump()).first()
    db.commit()
    return dict(result._mapping)

@app.delete("/asignaciones/{id}", tags=["Soporte"])
def eliminar_asignacion(id: int, db: Session = Depends(get_db)):
    result = db.execute(text("DELETE FROM asignaciones WHERE id = :id RETURNING id"), {"id": id}).first()
    if not result:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    db.commit()
    return {"mensaje": "Asignación eliminada"}