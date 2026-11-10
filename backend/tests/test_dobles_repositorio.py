"""Rol BD (Alejandra Guio, S5): el repositorio visto como dependencia.

Se usa un mock con la misma firma que `Repositorio` (create_autospec): si el
endpoint llama un método que no existe o con argumentos equivocados, el test falla.
"""
from unittest.mock import create_autospec

import pytest

from main import app
from repositorio import Repositorio, get_repo


@pytest.fixture
def repo_mock(client):
    # Mock: verifica comportamiento (qué se guardó y qué no).
    mock = create_autospec(Repositorio, instance=True)
    app.dependency_overrides[get_repo] = lambda: mock
    return mock


def test_should_not_save_a_grade_out_of_range(client, repo_mock, auth_docente):
    response = client.post("/calificaciones", json={"estudiante_id": 1, "materia_id": 1, "nota": 5.1}, headers=auth_docente)

    assert response.status_code == 422
    repo_mock.crear_calificacion.assert_not_called()
    repo_mock.confirmar.assert_not_called()


def test_should_save_exactly_the_validated_grade_and_commit_once(client, repo_mock, auth_docente):
    repo_mock.crear_calificacion.return_value = {"id": 9}
    repo_mock.promedio_de_estudiante.return_value = 4.0

    client.post("/calificaciones", json={"estudiante_id": 1, "materia_id": 2, "nota": 4}, headers=auth_docente)

    repo_mock.crear_calificacion.assert_called_once_with({
        "estudiante_id": 1, "materia_id": 2, "actividad_id": None, "nota": 4.0, "periodo": 1, "observacion": None,
    })
    repo_mock.crear_alerta.assert_not_called()
    repo_mock.confirmar.assert_called_once()


def test_should_not_duplicate_low_grade_alert_when_one_is_active(client, repo_mock, auth_docente):
    repo_mock.crear_calificacion.return_value = {"id": 9}
    repo_mock.promedio_de_estudiante.return_value = 2.0
    repo_mock.tiene_alerta_bajo_promedio_activa.return_value = True

    client.post("/calificaciones", json={"estudiante_id": 1, "materia_id": 2, "nota": 2}, headers=auth_docente)

    repo_mock.tiene_alerta_bajo_promedio_activa.assert_called_once_with(1)
    repo_mock.crear_alerta.assert_not_called()


def test_should_not_save_duplicate_assignment(client, repo_mock, auth_docente):
    repo_mock.es_docente_activo.return_value = True
    repo_mock.existe_asignacion.return_value = True

    response = client.post("/asignaciones", json={"docente_id": 3, "materia_id": 1, "grupo_id": 2}, headers=auth_docente)

    assert response.status_code == 409
    repo_mock.existe_asignacion.assert_called_once_with(1, 2)
    repo_mock.crear_asignacion.assert_not_called()


def test_should_not_touch_the_database_when_role_does_not_exist(client, repo_mock, auth_admin):
    repo_mock.id_de_rol.return_value = None

    response = client.put("/usuarios/5/rol", json={"role": "admin"}, headers=auth_admin)

    assert response.status_code == 500
    repo_mock.id_de_rol.assert_called_once_with("Administrador")
    repo_mock.actualizar_rol_usuario.assert_not_called()


def test_should_not_create_invitation_when_role_is_missing(client, repo_mock, auth_admin):
    repo_mock.existe_usuario_activo.return_value = False
    repo_mock.id_de_rol.return_value = None

    response = client.post("/usuarios/invitar", json={"email": "x@classkids.local"}, headers=auth_admin)

    assert response.json() == {"detail": "Rol no configurado"}
    repo_mock.crear_invitacion.assert_not_called()
