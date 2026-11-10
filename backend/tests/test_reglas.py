"""Tests unitarios de las reglas de negocio del backend (rol Backend, Johanna Ortiz, S2)."""
import pytest
from fastapi import HTTPException

from reglas import (
    destino_de_recuperacion,
    nombre_rol_bd,
    normalize_alert_status,
    password_es_valida,
    requiere_alerta_por_promedio,
    rol_de_sesion,
)

ORIGENES = ["http://localhost:8080", "http://127.0.0.1:8080"]
POR_DEFECTO = "http://127.0.0.1:8080"


@pytest.mark.parametrize(
    ("estado", "esperado"),
    [
        ("Pendiente", "active"),
        ("Activa", "active"),
        ("active", "active"),
        ("En revisión", "reviewed"),
        ("Revisada", "reviewed"),
        ("reviewed", "reviewed"),
        ("Resuelta", "resolved"),
        ("resolved", "resolved"),
    ],
)
def test_should_translate_alert_status_from_interface_to_db(estado, esperado):
    assert normalize_alert_status(estado) == esperado


@pytest.mark.parametrize("estado", ["", "cerrada", "RESOLVED", "pendiente"])
def test_should_reject_unknown_alert_status_with_422(estado):
    with pytest.raises(HTTPException) as error:
        normalize_alert_status(estado)

    assert error.value.status_code == 422
    assert error.value.detail == "Estado de alerta inválido"


@pytest.mark.parametrize(
    ("rol_bd", "esperado"),
    [
        ("Administrador", "admin"),
        ("administrador", "admin"),
        (" ADMINISTRADOR ", "admin"),
        ("Docente", "docente"),
        ("Acudiente", "docente"),
        (None, "docente"),
    ],
)
def test_should_only_give_admin_session_to_administrator_role(rol_bd, esperado):
    assert rol_de_sesion(rol_bd) == esperado


@pytest.mark.parametrize(("solicitado", "esperado"), [("admin", "Administrador"), ("docente", "Docente"), ("otro", "Docente")])
def test_should_map_requested_role_to_db_role_name(solicitado, esperado):
    assert nombre_rol_bd(solicitado) == esperado


@pytest.mark.parametrize(("password", "valida"), [("", False), ("12345", False), ("123456", True), ("una-clave-larga", True)])
def test_should_require_at_least_six_characters_in_password(password, valida):
    assert password_es_valida(password) is valida


def test_should_use_redirect_when_its_origin_is_allowed():
    destino = destino_de_recuperacion("http://localhost:8080/reset-password", ORIGENES, POR_DEFECTO)

    assert destino == "http://localhost:8080/reset-password"


@pytest.mark.parametrize(
    "redirect_to",
    [
        None,
        "",
        "https://atacante.com/reset-password",
        "http://localhost:8080.atacante.com/reset-password",  # empieza igual que un origen permitido
        "http://localhost:9999/reset-password",  # otro puerto
        "https://localhost:8080/reset-password",  # otro esquema
    ],
)
def test_should_fall_back_to_frontend_url_when_redirect_is_not_allowed(redirect_to):
    assert destino_de_recuperacion(redirect_to, ORIGENES, POR_DEFECTO) == POR_DEFECTO


@pytest.mark.parametrize(
    ("promedio", "requiere"),
    [(None, False), (0, True), (2.99, True), (3.0, False), (3.01, False), (5, False)],
)
def test_should_require_low_grade_alert_only_below_three(promedio, requiere):
    assert requiere_alerta_por_promedio(promedio) is requiere
