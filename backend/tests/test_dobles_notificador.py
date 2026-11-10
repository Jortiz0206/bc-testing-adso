"""Rol Backend (Johanna Ortiz, S5): el envío de correos como dependencia externa.

Se reemplaza la interfaz propia `Notificador` (notificador.py), nunca smtplib.
"""
from unittest.mock import Mock

import pytest

from main import app
from notificador import NotificadorDesactivado, get_notificador


class NotificadorEspia:
    """Spy: un notificador que funciona y además recuerda cada correo enviado."""

    def __init__(self):
        self.enviados: list[dict] = []

    def enviar(self, destinatario: str, asunto: str, cuerpo: str) -> bool:
        self.enviados.append({"destinatario": destinatario, "asunto": asunto, "cuerpo": cuerpo})
        return True


class NotificadorCaido:
    """Stub: simula un servidor SMTP que no responde."""

    def enviar(self, destinatario: str, asunto: str, cuerpo: str) -> bool:
        raise TimeoutError("SMTP no responde")


@pytest.fixture
def usar_notificador(client):
    def _usar(doble):
        app.dependency_overrides[get_notificador] = lambda: doble
        return doble
    return _usar


def test_invitation_should_be_sent_to_normalized_email_with_activation_link(client, usar_notificador, auth_admin):
    espia = usar_notificador(NotificadorEspia())  # spy: verifica comportamiento (con qué se llamó)

    response = client.post("/usuarios/invitar", json={"email": " Nuevo@ClassKids.local "}, headers=auth_admin)

    [correo] = espia.enviados
    assert correo["destinatario"] == "nuevo@classkids.local"
    assert correo["asunto"] == "Invitación a ClassKids"
    assert response.json()["invitation_url"] in correo["cuerpo"]
    assert response.json()["email_sent"] is True


def test_invitation_should_survive_a_failing_smtp_server(client, repo, usar_notificador, auth_admin):
    usar_notificador(NotificadorCaido())  # stub: provoca el fallo que no podemos provocar con el SMTP real

    response = client.post("/usuarios/invitar", json={"email": "nuevo@classkids.local"}, headers=auth_admin)

    # Verifica estado: la invitación quedó guardada y el admin recibe el enlace.
    assert response.status_code == 200
    assert response.json()["email_sent"] is False
    assert len(repo.invitaciones) == 1


def test_should_not_send_invitation_when_user_already_exists(client, repo, usar_notificador, auth_admin, hash_password):
    notificador = usar_notificador(Mock())  # mock: solo interesa que NO se llame
    repo.agregar_usuario("laura@classkids.local", hash_password("x"))

    client.post("/usuarios/invitar", json={"email": "laura@classkids.local"}, headers=auth_admin)

    notificador.enviar.assert_not_called()


def test_recovery_link_should_point_to_allowed_redirect_and_carry_the_saved_token(client, repo, usar_notificador, hash_password):
    espia = usar_notificador(NotificadorEspia())
    repo.agregar_usuario("laura@classkids.local", hash_password("x"))

    client.post("/auth/forgot-password", json={"email": "laura@classkids.local", "redirect_to": "http://localhost:8080/reset-password"})

    [correo] = espia.enviados
    token = repo.tokens_recuperacion[0]["token"]
    assert f"http://localhost:8080/reset-password?token={token}" in correo["cuerpo"]
    assert "30 minutos" in correo["cuerpo"]


def test_recovery_should_not_send_email_for_unknown_or_disabled_accounts(client, repo, usar_notificador, hash_password):
    notificador = usar_notificador(Mock())
    repo.agregar_usuario("baja@classkids.local", hash_password("x"), activo=False)

    client.post("/auth/forgot-password", json={"email": "nadie@classkids.local"})
    client.post("/auth/forgot-password", json={"email": "baja@classkids.local"})

    notificador.enviar.assert_not_called()


def test_recovery_should_answer_generically_when_smtp_fails(client, repo, usar_notificador, hash_password):
    usar_notificador(NotificadorCaido())
    repo.agregar_usuario("laura@classkids.local", hash_password("x"))

    response = client.post("/auth/forgot-password", json={"email": "laura@classkids.local"})

    assert response.status_code == 200
    assert response.json()["email_sent"] is False
    assert "SMTP" not in response.text


def test_without_smtp_host_the_disabled_notifier_is_used(monkeypatch):
    monkeypatch.delenv("SMTP_HOST", raising=False)

    notificador = get_notificador()

    assert isinstance(notificador, NotificadorDesactivado)
    assert notificador.enviar("a@b.co", "asunto", "cuerpo") is False
