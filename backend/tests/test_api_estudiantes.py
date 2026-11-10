"""Rol Backend (Alejandra Guio, S4): el CRUD del recurso principal, /estudiantes.

La BD se aísla con el repositorio falso de tests/fakes.py (fixture `client`).
"""

ESTUDIANTE = {"documento": "1001", "nombre": "Ana", "apellido": "Ruiz"}


def test_should_create_student_and_answer_201_with_json_body(client, repo, auth_docente):
    grupo = repo.crear_grupo({"nombre": "Primero A", "grado": "1°", "turno": "Mañana", "ano_lectivo": 2026})

    response = client.post("/estudiantes", json={**ESTUDIANTE, "grupo_id": grupo["id"]}, headers=auth_docente)

    assert response.status_code == 201
    assert response.headers["content-type"] == "application/json"
    assert response.json() == {"id": response.json()["id"], **ESTUDIANTE, "grupo_id": grupo["id"], "activo": True}
    assert repo.confirmaciones == 1


def test_should_list_only_students_of_requested_group_with_group_name(client, repo, auth_docente):
    primero = repo.crear_grupo({"nombre": "Primero A", "grado": None, "turno": None, "ano_lectivo": 2026})
    segundo = repo.crear_grupo({"nombre": "Segundo B", "grado": None, "turno": None, "ano_lectivo": 2026})
    repo.crear_estudiante({**ESTUDIANTE, "grupo_id": primero["id"], "activo": True})
    repo.crear_estudiante({**ESTUDIANTE, "documento": "1002", "nombre": "Beto", "grupo_id": segundo["id"], "activo": True})

    response = client.get(f"/estudiantes?grupo_id={segundo['id']}", headers=auth_docente)

    assert response.status_code == 200
    assert [(e["nombre"], e["nombre_grupo"]) for e in response.json()] == [("Beto", "Segundo B")]


def test_should_reject_student_without_required_fields_with_422(client, repo, auth_docente):
    response = client.post("/estudiantes", json={"documento": "1001", "nombre": "   "}, headers=auth_docente)

    assert response.status_code == 422
    campos = {e["campo"] for e in response.json()["errores"]}
    assert campos == {"nombre", "apellido"}
    assert repo.estudiantes == []


def test_should_update_existing_student(client, repo, auth_docente):
    creado = repo.crear_estudiante({**ESTUDIANTE, "grupo_id": None, "activo": True})

    response = client.put(f"/estudiantes/{creado['id']}", json={**ESTUDIANTE, "apellido": "Ruiz Mesa", "activo": False},
                          headers=auth_docente)

    assert response.status_code == 200
    assert response.json()["apellido"] == "Ruiz Mesa"
    assert repo.estudiantes[0]["activo"] is False


def test_should_answer_404_when_updating_or_deleting_missing_student(client, auth_docente):
    actualizar = client.put("/estudiantes/999", json=ESTUDIANTE, headers=auth_docente)
    borrar = client.delete("/estudiantes/999", headers=auth_docente)

    assert actualizar.status_code == 404
    assert actualizar.json() == {"detail": "Estudiante no encontrado"}
    assert borrar.status_code == 404


def test_should_delete_existing_student(client, repo, auth_docente):
    creado = repo.crear_estudiante({**ESTUDIANTE, "grupo_id": None, "activo": True})

    response = client.delete(f"/estudiantes/{creado['id']}", headers=auth_docente)

    assert response.status_code == 200
    assert repo.estudiantes == []
