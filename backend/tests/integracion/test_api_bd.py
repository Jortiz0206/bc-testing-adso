"""Rol Backend (Jan Janos, S6): endpoints completos contra PostgreSQL real.

El caso feliz se verifica EN LA BD, no solo en la respuesta. Cada restricción de la
tabla se viola a propósito: todo lo que antes respondía 500 quedó como hallazgo corregido.
"""
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from main import app, create_access_token
from repositorio import Repositorio, get_repo

AUTH = {"Authorization": f"Bearer {create_access_token(1, 'docente')}"}


@pytest.fixture
def client_bd(sesion):
    app.dependency_overrides[get_repo] = lambda: Repositorio(sesion)
    with TestClient(app, raise_server_exceptions=False) as cliente:
        yield cliente
    app.dependency_overrides.clear()


def estudiante(**cambios):
    return {"documento": "API-" + uuid4().hex[:12], "nombre": "Ana", "apellido": "Ruiz", **cambios}


def test_post_estudiante_queda_guardado_en_la_bd(client_bd, sesion):
    datos = estudiante()

    response = client_bd.post("/estudiantes", json=datos, headers=AUTH)

    assert response.status_code == 201
    fila = sesion.execute(text("SELECT nombre, apellido, activo FROM estudiantes WHERE documento = :d"),
                          {"d": datos["documento"]}).one()
    assert tuple(fila) == ("Ana", "Ruiz", True)


def test_documento_repetido_responde_409_y_no_500(client_bd):
    datos = estudiante()
    client_bd.post("/estudiantes", json=datos, headers=AUTH)

    response = client_bd.post("/estudiantes", json={**datos, "nombre": "Otra"}, headers=AUTH)

    assert response.status_code == 409


def test_grupo_inexistente_responde_422_y_no_500(client_bd):
    response = client_bd.post("/estudiantes", json=estudiante(grupo_id=-1), headers=AUTH)

    assert response.status_code == 422


def test_documento_mas_largo_que_la_columna_responde_422(client_bd):
    response = client_bd.post("/estudiantes", json=estudiante(documento="9" * 51), headers=AUTH)

    assert response.status_code == 422


def test_calificacion_de_estudiante_inexistente_responde_422_y_no_500(client_bd, sesion):
    materia_id = sesion.execute(text("INSERT INTO materias (nombre) VALUES ('Materia API') RETURNING id")).scalar_one()

    response = client_bd.post("/calificaciones", json={"estudiante_id": -1, "materia_id": materia_id, "nota": 4}, headers=AUTH)

    assert response.status_code == 422


def test_nota_baja_crea_la_alerta_en_la_bd(client_bd, sesion):
    est = client_bd.post("/estudiantes", json=estudiante(), headers=AUTH).json()
    materia_id = sesion.execute(text("INSERT INTO materias (nombre) VALUES ('Materia API') RETURNING id")).scalar_one()

    client_bd.post("/calificaciones", json={"estudiante_id": est["id"], "materia_id": materia_id, "nota": 1.5}, headers=AUTH)

    alertas = sesion.execute(text("SELECT tipo, estado FROM alertas WHERE estudiante_id = :id"), {"id": est["id"]}).all()
    assert [tuple(a) for a in alertas] == [("low_grade", "active")]
