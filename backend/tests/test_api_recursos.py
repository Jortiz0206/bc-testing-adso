"""Rol Backend (Alejandra Guio, S4): resto de los recursos — caso feliz, validación e inexistente.

Complementa test_api_estudiantes.py para llevar el backend por encima del piso del 50 %.
"""
from datetime import datetime, timedelta

import pytest


# --- Grupos y materias: borrado protegido por relaciones ---------------------

def test_should_create_update_and_list_groups(client, repo, auth_docente):
    creado = client.post("/grupos", json={"nombre": "Primero A", "año_lectivo": 2027}, headers=auth_docente)
    actualizado = client.put(f"/grupos/{creado.json()['id']}", json={"nombre": "Primero B"}, headers=auth_docente)

    assert creado.status_code == 201
    assert creado.json()["ano_lectivo"] == 2027
    assert actualizado.json()["nombre"] == "Primero B"
    assert [g["nombre"] for g in client.get("/grupos", headers=auth_docente).json()] == ["Primero B"]


def test_should_answer_409_when_deleting_group_with_activities(client, repo, auth_docente):
    grupo = repo.crear_grupo({"nombre": "Primero A", "grado": None, "turno": None, "ano_lectivo": 2026})
    repo.crear_actividad({"materia_id": 1, "grupo_id": grupo["id"], "titulo": "Taller", "tipo": "tarea", "descripcion": None, "fecha_entrega": None})

    response = client.delete(f"/grupos/{grupo['id']}", headers=auth_docente)

    assert response.status_code == 409
    assert "tiene actividades" in response.json()["detail"]
    assert len(repo.grupos) == 1


def test_should_delete_group_without_relations(client, repo, auth_docente):
    grupo = repo.crear_grupo({"nombre": "Vacío", "grado": None, "turno": None, "ano_lectivo": 2026})

    assert client.delete(f"/grupos/{grupo['id']}", headers=auth_docente).status_code == 200
    assert repo.grupos == []


def test_should_manage_subjects_and_protect_the_ones_in_use(client, repo, auth_docente):
    creada = client.post("/materias", json={"nombre": "Ciencias", "codigo": "CIE"}, headers=auth_docente).json()
    client.put(f"/materias/{creada['id']}", json={"nombre": "Ciencias Naturales", "codigo": "CN"}, headers=auth_docente)
    repo.crear_calificacion({"estudiante_id": 1, "materia_id": creada["id"], "actividad_id": None, "nota": 4, "periodo": 1, "observacion": None})

    borrar = client.delete(f"/materias/{creada['id']}", headers=auth_docente)

    assert client.get("/materias", headers=auth_docente).json()[0]["nombre"] == "Ciencias Naturales"
    assert borrar.status_code == 409
    assert client.put("/materias/999", json={"nombre": "X"}, headers=auth_docente).status_code == 404


def test_should_delete_unused_subject(client, repo, auth_docente):
    materia = repo.crear_materia({"nombre": "Arte", "codigo": None})

    assert client.delete(f"/materias/{materia['id']}", headers=auth_docente).json() == {"mensaje": "Materia eliminada"}


# --- Actividades ----------------------------------------------------------------

def test_should_list_activities_of_a_group_with_names_and_due_state(client, repo, auth_docente):
    grupo = repo.crear_grupo({"nombre": "Primero A", "grado": None, "turno": None, "ano_lectivo": 2026})
    materia = repo.crear_materia({"nombre": "Matemáticas", "codigo": None})
    base = {"materia_id": materia["id"], "grupo_id": grupo["id"], "tipo": "tarea", "descripcion": None}
    client.post("/actividades", json={**base, "titulo": "Vencida", "fecha_entrega": "2000-01-01"}, headers=auth_docente)
    client.post("/actividades", json={**base, "titulo": "Futura", "fecha_entrega": "2999-01-01"}, headers=auth_docente)
    client.post("/actividades", json={**base, "grupo_id": 999, "titulo": "De otro grupo"}, headers=auth_docente)

    response = client.get(f"/actividades?grupo_id={grupo['id']}", headers=auth_docente)

    assert [(a["titulo"], a["estado"], a["materia_nombre"]) for a in response.json()] == [
        ("Vencida", "vencida", "Matemáticas"),
        ("Futura", "pendiente", "Matemáticas"),
    ]


def test_should_update_and_delete_activities_or_answer_404(client, repo, auth_docente):
    actividad = repo.crear_actividad({"materia_id": 1, "grupo_id": 1, "titulo": "Taller", "tipo": "tarea", "descripcion": None, "fecha_entrega": None})
    cambios = {"materia_id": 1, "grupo_id": 1, "titulo": "Examen final", "tipo": "examen"}

    assert client.put(f"/actividades/{actividad['id']}", json=cambios, headers=auth_docente).json()["tipo"] == "examen"
    assert client.put("/actividades/999", json=cambios, headers=auth_docente).status_code == 404
    assert client.delete(f"/actividades/{actividad['id']}", headers=auth_docente).status_code == 200
    assert client.delete(f"/actividades/{actividad['id']}", headers=auth_docente).status_code == 404


# --- Calificaciones -----------------------------------------------------------

def test_should_not_create_alert_when_average_is_three_or_more(client, repo, auth_docente):
    client.post("/calificaciones", json={"estudiante_id": 1, "materia_id": 1, "nota": 3.0}, headers=auth_docente)

    assert repo.alertas == []


def test_should_filter_update_and_delete_grades(client, repo, auth_docente):
    nota = repo.crear_calificacion({"estudiante_id": 1, "materia_id": 1, "actividad_id": 7, "nota": 4, "periodo": 1, "observacion": None})
    repo.crear_calificacion({"estudiante_id": 1, "materia_id": 1, "actividad_id": 8, "nota": 2, "periodo": 1, "observacion": None})

    filtradas = client.get("/calificaciones?actividad_id=7", headers=auth_docente).json()
    actualizada = client.put(f"/calificaciones/{nota['id']}", json={"estudiante_id": 1, "materia_id": 1, "nota": 5}, headers=auth_docente)

    assert [c["id"] for c in filtradas] == [nota["id"]]
    assert actualizada.json()["nota"] == 5
    assert client.put("/calificaciones/999", json={"estudiante_id": 1, "materia_id": 1, "nota": 5}, headers=auth_docente).status_code == 404
    assert client.delete(f"/calificaciones/{nota['id']}", headers=auth_docente).status_code == 200
    assert client.delete("/calificaciones/999", headers=auth_docente).status_code == 404


# --- Observaciones y alertas ------------------------------------------------------

def test_should_create_list_and_delete_observations(client, repo, auth_docente):
    creada = client.post("/observaciones", json={"estudiante_id": 1, "descripcion": "Participa en clase"}, headers=auth_docente)

    assert creada.status_code == 201
    assert creada.json()["tipo"] == "Convivencial"
    assert len(client.get("/observaciones", headers=auth_docente).json()) == 1
    assert client.delete(f"/observaciones/{creada.json()['id']}", headers=auth_docente).status_code == 200
    assert client.delete("/observaciones/999", headers=auth_docente).status_code == 404


def test_should_create_alert_translating_its_status(client, repo, auth_docente):
    response = client.post("/alertas", json={"estudiante_id": 1, "tipo": "Seguimiento", "mensaje": "Revisar", "estado": "Pendiente"},
                           headers=auth_docente)

    assert response.status_code == 201
    assert response.json()["estado"] == "active"


@pytest.mark.parametrize("ruta", ["/alertas/{id}?estado=Resuelta", "/alertas/{id}/estado"])
def test_should_change_alert_status_by_query_or_body(client, repo, auth_docente, ruta):
    alerta = repo.crear_alerta({"estudiante_id": 1, "tipo": "x", "mensaje": "y", "estado": "active"})

    response = client.put(ruta.format(id=alerta["id"]), json={"estado": "Resuelta"}, headers=auth_docente)

    assert response.json()["estado"] == "resolved"


def test_should_reject_unknown_alert_status_and_missing_alert(client, repo, auth_docente):
    alerta = repo.crear_alerta({"estudiante_id": 1, "tipo": "x", "mensaje": "y", "estado": "active"})

    assert client.put(f"/alertas/{alerta['id']}/estado", json={"estado": "cerrada"}, headers=auth_docente).status_code == 422
    assert client.put("/alertas/999/estado", json={"estado": "Resuelta"}, headers=auth_docente).status_code == 404
    assert client.delete(f"/alertas/{alerta['id']}", headers=auth_docente).status_code == 200
    assert client.delete(f"/alertas/{alerta['id']}", headers=auth_docente).status_code == 404


# --- Usuarios, invitaciones y recuperación ------------------------------------------

def test_admin_should_change_role_and_deactivate_users(client, repo, auth_admin, hash_password):
    usuario = repo.agregar_usuario("laura@classkids.local", hash_password("x"))

    assert client.put(f"/usuarios/{usuario['id']}/rol", json={"role": "admin"}, headers=auth_admin).status_code == 200
    assert client.get("/admins/count", headers=auth_admin).json() == {"count": 1}
    assert client.delete(f"/usuarios/{usuario['id']}", headers=auth_admin).status_code == 200
    assert client.delete(f"/usuarios/{usuario['id']}", headers=auth_admin).status_code == 404
    assert client.put(f"/usuarios/{usuario['id']}/rol", json={"role": "docente"}, headers=auth_admin).status_code == 404


def test_invitation_flow_should_activate_account_once(client, repo, auth_admin):
    invitacion = client.post("/usuarios/invitar", json={"email": " Nuevo@ClassKids.local ", "role": "docente"}, headers=auth_admin)
    token = invitacion.json()["invitation_url"].split("token=")[1]

    consulta = client.get(f"/invitaciones/{token}")
    corta = client.post(f"/invitaciones/{token}/aceptar", json={"nombre": "Nuevo", "password": "123"})
    aceptada = client.post(f"/invitaciones/{token}/aceptar", json={"nombre": " Nuevo ", "apellido": " ", "password": "secreta1"})
    repetida = client.post(f"/invitaciones/{token}/aceptar", json={"nombre": "Otro", "password": "secreta1"})

    assert invitacion.json()["email_sent"] is False
    assert consulta.json() == {"email": "nuevo@classkids.local", "rol": "Docente"}
    assert corta.status_code == 422
    assert aceptada.status_code == 200
    assert repetida.status_code == 400
    assert client.get(f"/invitaciones/{token}").status_code == 404
    assert repo.usuarios[0]["nombre"] == "Nuevo" and repo.usuarios[0]["apellido"] is None
    assert client.post("/auth/login", json={"email": "nuevo@classkids.local", "password": "secreta1"}).status_code == 200


def test_should_not_invite_an_existing_active_user(client, repo, auth_admin, hash_password):
    repo.agregar_usuario("laura@classkids.local", hash_password("x"))

    response = client.post("/usuarios/invitar", json={"email": "laura@classkids.local"}, headers=auth_admin)

    assert response.status_code == 409


def test_reset_password_should_work_once_with_a_valid_token(client, repo, hash_password):
    repo.agregar_usuario("laura@classkids.local", hash_password("vieja12"))
    repo.guardar_token_recuperacion("laura@classkids.local", "tok", datetime.utcnow() + timedelta(minutes=30))

    corta = client.post("/auth/reset-password", json={"token": "tok", "password": "123"})
    sin_token = client.post("/auth/reset-password", json={"password": "nueva123"})
    ok = client.post("/auth/reset-password", json={"token": "tok", "password": "nueva123"})
    reuso = client.post("/auth/reset-password", json={"token": "tok", "password": "otra123"})

    assert (corta.status_code, sin_token.status_code, ok.status_code, reuso.status_code) == (422, 400, 200, 400)
    assert client.post("/auth/login", json={"email": "laura@classkids.local", "password": "nueva123"}).status_code == 200


def test_expired_reset_token_should_be_rejected(client, repo, hash_password):
    repo.agregar_usuario("laura@classkids.local", hash_password("vieja12"))
    repo.guardar_token_recuperacion("laura@classkids.local", "vencido", datetime.utcnow() - timedelta(minutes=1))

    assert client.post("/auth/reset-password", json={"token": "vencido", "password": "nueva123"}).status_code == 400


# --- Catálogos y conteos -----------------------------------------------------------

def test_catalogs_and_counters(client, repo, auth_admin, auth_docente, hash_password):
    repo.agregar_usuario("d@classkids.local", hash_password("x"), nombre="Zoe")
    repo.crear_estudiante({"documento": "1", "nombre": "A", "apellido": "B", "grupo_id": None, "activo": True})

    assert [d["nombre"] for d in client.get("/catalogo/docentes", headers=auth_docente).json()] == ["Zoe"]
    assert [r["nombre"] for r in client.get("/roles", headers=auth_docente).json()] == ["Administrador", "Docente"]
    assert client.get("/asignaciones", headers=auth_docente).json() == []
    assert client.get("/docentes/count", headers=auth_admin).json() == {"count": 1}
    for ruta in ("/grupos/count", "/actividades/count", "/alertas/activas/count"):
        assert client.get(ruta, headers=auth_docente).json() == {"count": 0}
    assert client.get("/estudiantes/count", headers=auth_docente).json() == {"count": 1}


def test_assignment_needs_an_active_teacher_and_can_be_deleted(client, repo, auth_docente, hash_password):
    admin = repo.agregar_usuario("a@classkids.local", hash_password("x"), rol="Administrador")
    docente = repo.agregar_usuario("d@classkids.local", hash_password("x"))
    asignacion = repo.crear_asignacion({"docente_id": docente["id"], "materia_id": 1, "grupo_id": 1})

    assert client.post("/asignaciones", json={"docente_id": admin["id"], "materia_id": 2, "grupo_id": 2}, headers=auth_docente).status_code == 404
    assert client.delete(f"/asignaciones/{asignacion['id']}", headers=auth_docente).status_code == 200
    assert client.delete(f"/asignaciones/{asignacion['id']}", headers=auth_docente).status_code == 404
