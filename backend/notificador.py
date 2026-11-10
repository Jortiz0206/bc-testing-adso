"""Envío de correos de ClassKids detrás de una interfaz propia.

Los endpoints no usan smtplib directamente: reciben un `Notificador` por
inyección de dependencias (`get_notificador`). En los tests se reemplaza esa
interfaz por dobles (spy, stub, mock), nunca la librería smtplib.
"""
import os
import smtplib
from email.message import EmailMessage
from typing import Protocol


class Notificador(Protocol):
    def enviar(self, destinatario: str, asunto: str, cuerpo: str) -> bool:
        """Envía el correo. Devuelve True si salió; puede lanzar si el servidor falla."""
        ...


class NotificadorDesactivado:
    """Sin SMTP_HOST configurado no se envía nada (modo de desarrollo)."""

    def enviar(self, destinatario: str, asunto: str, cuerpo: str) -> bool:
        return False


class NotificadorSMTP:  # pragma: no cover - adaptador de red; se reemplaza en los tests
    def __init__(self, host: str, puerto: int, usuario: str, password: str, remitente: str):
        self.host, self.puerto, self.usuario, self.password, self.remitente = host, puerto, usuario, password, remitente

    def enviar(self, destinatario: str, asunto: str, cuerpo: str) -> bool:
        mensaje = EmailMessage()
        mensaje["Subject"] = asunto
        mensaje["From"] = self.remitente
        mensaje["To"] = destinatario
        mensaje.set_content(cuerpo)
        with smtplib.SMTP(self.host, self.puerto, timeout=10) as smtp:
            smtp.starttls()
            smtp.login(self.usuario, self.password)
            smtp.send_message(mensaje)
        return True


def get_notificador() -> Notificador:
    host = os.getenv("SMTP_HOST")
    if not host:
        return NotificadorDesactivado()
    return NotificadorSMTP(  # pragma: no cover - requiere un servidor SMTP real
        host,
        int(os.getenv("SMTP_PORT", "587")),
        os.getenv("SMTP_USER", ""),
        os.getenv("SMTP_PASSWORD", ""),
        os.getenv("SMTP_FROM", "no-reply@classkids.local"),
    )
