"""Modelos de entrada del API (Pydantic).

Las restricciones replican las de las tablas de backend/init.sql (NOT NULL,
longitudes VARCHAR y el CHECK de la nota). Validando aquí, un dato que la BD
rechazaría responde 422 con un mensaje claro, en vez de un 500 de la BD.
"""
from typing import Optional

from pydantic import BaseModel, Field

# Texto obligatorio: al menos un carácter que no sea espacio.
NO_VACIO = r"\S"


class GrupoSchema(BaseModel):
    nombre: str = Field(min_length=1, max_length=120, pattern=NO_VACIO)
    grado: Optional[str] = Field("1°", max_length=30)
    turno: Optional[str] = Field("Matutino", max_length=30)
    año_lectivo: Optional[int] = 2026


class EstudianteSchema(BaseModel):
    documento: str = Field(min_length=1, max_length=50, pattern=NO_VACIO)
    nombre: str = Field(min_length=1, max_length=120, pattern=NO_VACIO)
    apellido: str = Field(min_length=1, max_length=120, pattern=NO_VACIO)
    grupo_id: Optional[int] = None
    activo: bool = True


class MateriaSchema(BaseModel):
    nombre: str = Field(min_length=1, max_length=120, pattern=NO_VACIO)
    codigo: Optional[str] = Field(None, max_length=30)


class ActividadSchema(BaseModel):
    materia_id: int
    grupo_id: int
    titulo: str = Field(min_length=1, max_length=200, pattern=NO_VACIO)
    tipo: str = Field("tarea", min_length=1, max_length=30)
    descripcion: Optional[str] = None
    fecha_entrega: Optional[str] = None


class CalificacionSchema(BaseModel):
    estudiante_id: int
    materia_id: int
    actividad_id: Optional[int] = None
    # NUMERIC(3,1) con CHECK (nota >= 0 AND nota <= 5)
    nota: float = Field(ge=0, le=5)
    # periodo es NOT NULL en la BD: enviar null antes producía un 500.
    periodo: int = Field(1, ge=1)
    observacion: Optional[str] = None


class ObservacionSchema(BaseModel):
    estudiante_id: int
    tipo: Optional[str] = Field("Convivencial", max_length=50)
    descripcion: str = Field(min_length=1, pattern=NO_VACIO)


class AlertaSchema(BaseModel):
    estudiante_id: int
    tipo: str = Field(min_length=1, max_length=80, pattern=NO_VACIO)
    mensaje: str = Field(min_length=1, pattern=NO_VACIO)
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
