"""Rol Backend (Johanna Ortiz, S8): ramas sin cubrir que señaló el reporte de cobertura del CI."""
import runpy
from pathlib import Path

import pytest

MAIN = str(Path(__file__).resolve().parent.parent / "main.py")


def test_should_refuse_to_start_in_production_without_jwt_secret(monkeypatch):
    # Rama de main.py: sin JWT_SECRET en producción, la app no arranca (evita
    # firmar sesiones con un secreto aleatorio o conocido).
    monkeypatch.delenv("JWT_SECRET", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "production")

    with pytest.raises(RuntimeError, match="JWT_SECRET no está definido"):
        runpy.run_path(MAIN)


def test_should_answer_401_when_stored_password_hash_is_corrupt(client, repo):
    # Rama del login: un hash dañado en la BD no debe tumbar el endpoint (500)
    # ni dejar entrar: se trata como contraseña incorrecta.
    repo.agregar_usuario("dañado@classkids.local", "no-es-un-hash-pbkdf2")

    response = client.post("/auth/login", json={"email": "dañado@classkids.local", "password": "cualquiera"})

    assert response.status_code == 401
    assert response.json() == {"detail": "Correo o contraseña incorrectos"}
