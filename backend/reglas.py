"""Reglas de negocio de ClassKids que no dependen de la BD ni de FastAPI.

Antes vivían mezcladas dentro de los endpoints de main.py; se extrajeron aquí
para poder probarlas con tests unitarios rápidos (sin BD ni servidor).
"""
from datetime import datetime, timezone
from urllib.parse import urlsplit

from fastapi import HTTPException

LONGITUD_MINIMA_PASSWORD = 6
# Promedio (escala 0.0 - 5.0) por debajo del cual se crea una alerta automática.
PROMEDIO_MINIMO_SIN_ALERTA = 3.0

_ESTADOS_ALERTA = {
    "Pendiente": "active",
    "Activa": "active",
    "active": "active",
    "En revisión": "reviewed",
    "Revisada": "reviewed",
    "reviewed": "reviewed",
    "Resuelta": "resolved",
    "resolved": "resolved",
}


def normalize_alert_status(value: str) -> str:
    """Traduce los estados que envía la interfaz (en español) a los que guarda la BD."""
    if value not in _ESTADOS_ALERTA:
        raise HTTPException(status_code=422, detail="Estado de alerta inválido")
    return _ESTADOS_ALERTA[value]


def rol_de_sesion(nombre_rol_bd: str | None) -> str:
    """Rol que viaja en el JWT: solo 'Administrador' es admin; cualquier otro (o ninguno) es docente."""
    return "admin" if (nombre_rol_bd or "").strip().lower() == "administrador" else "docente"


def nombre_rol_bd(rol_solicitado: str) -> str:
    """Nombre del rol en la tabla user_roles para el rol que pide la interfaz."""
    return "Administrador" if rol_solicitado == "admin" else "Docente"


def password_es_valida(password: str) -> bool:
    return len(password) >= LONGITUD_MINIMA_PASSWORD


def destino_de_recuperacion(redirect_to: str | None, origenes_permitidos: list[str], url_por_defecto: str) -> str:
    """Base del enlace de recuperación de contraseña.

    `redirect_to` lo envía el cliente: solo se acepta si su origen (esquema + host +
    puerto, comparado de forma exacta y no como prefijo) está permitido. Así el
    enlace nunca apunta a un dominio externo, incluido uno que empiece con el texto
    de un origen permitido (ej. "http://localhost:8080.atacante.com").
    """
    if redirect_to:
        candidato = urlsplit(redirect_to)
        origen = f"{candidato.scheme}://{candidato.netloc}"
        if origen in origenes_permitidos:
            return redirect_to
    return url_por_defecto


def requiere_alerta_por_promedio(promedio: float | None) -> bool:
    """Se alerta cuando el promedio acumulado del estudiante baja de 3.0."""
    return promedio is not None and float(promedio) < PROMEDIO_MINIMO_SIN_ALERTA


def ahora_utc() -> datetime:
    """Hora actual en UTC sin zona horaria, igual que CURRENT_TIMESTAMP en la BD.

    Reemplaza a datetime.utcnow(), obsoleto desde Python 3.12.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)
