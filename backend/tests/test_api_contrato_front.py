"""Rol Front (Johanna Ortiz, S4): el contrato del API que consume el frontend.

Cada test fija exactamente los campos del JSON que lee la interfaz
(Auth.tsx, AdminUsuarios.tsx, AlertsPanel.tsx, Materias.tsx) y el formato de
error que muestra api/client.ts: {"detail": "<texto>"}.
"""


def test_login_should_return_token_and_user_fields_used_by_auth_page(client, repo, hash_password):
    repo.agregar_usuario("laura@classkids.local", hash_password("secreta1"), rol="Docente", nombre="Laura", apellido="Jiménez")

    response = client.post("/auth/login", json={"email": " LAURA@classkids.local ", "password": "secreta1"})

    assert response.status_code == 200
    cuerpo = response.json()
    assert set(cuerpo) == {"access_token", "token_type", "user"}
    assert cuerpo["token_type"] == "bearer"
    assert cuerpo["user"] == {"id": 1, "email": "laura@classkids.local", "nombre": "Laura", "apellido": "Jiménez", "rol": "docente"}


def test_login_error_should_be_a_detail_string_shown_by_the_toast(client):
    response = client.post("/auth/login", json={"email": "nadie@classkids.local", "password": "x"})

    assert response.status_code == 401
    assert response.json() == {"detail": "Correo o contraseña incorrectos"}


def test_users_list_should_send_user_id_as_text_and_role_as_admin_or_docente(client, repo, auth_admin, hash_password):
    repo.agregar_usuario("admin@classkids.local", hash_password("x"), rol="Administrador")
    repo.agregar_usuario("baja@classkids.local", hash_password("x"), activo=False)

    response = client.get("/usuarios", headers=auth_admin)

    assert response.status_code == 200
    [usuario] = response.json()
    assert usuario["user_id"] == "1"  # AdminUsuarios compara este id como texto
    assert usuario["role"] == "admin"
    assert set(usuario) == {"user_id", "email", "nombre", "apellido", "role", "created_at", "last_sign_in_at"}


def test_validation_error_should_have_readable_detail_string_not_a_list(client, auth_docente):
    response = client.post("/calificaciones", json={"estudiante_id": 1, "materia_id": 1, "nota": 7}, headers=auth_docente)

    assert response.status_code == 422
    assert isinstance(response.json()["detail"], str)
    assert response.json()["detail"].startswith("Datos inválidos - nota:")


def test_low_grade_should_create_one_active_alert_with_fields_used_by_alerts_panel(client, repo, auth_docente):
    estudiante = repo.crear_estudiante({"documento": "1", "nombre": "Ana", "apellido": "Ruiz", "grupo_id": None, "activo": True})
    materia = repo.crear_materia({"nombre": "Matemáticas", "codigo": None})
    nota = {"estudiante_id": estudiante["id"], "materia_id": materia["id"], "nota": 2.5}

    client.post("/calificaciones", json=nota, headers=auth_docente)
    client.post("/calificaciones", json=nota, headers=auth_docente)
    alertas = client.get("/alertas", headers=auth_docente).json()

    assert len(alertas) == 1
    assert {k: alertas[0][k] for k in ("estudiante_id", "tipo", "estado", "mensaje")} == {
        "estudiante_id": estudiante["id"], "tipo": "low_grade", "estado": "active", "mensaje": "Promedio académico bajo: 2.50",
    }


def test_duplicate_assignment_should_answer_409_with_message_shown_in_materias(client, repo, auth_docente, hash_password):
    docente = repo.agregar_usuario("d@classkids.local", hash_password("x"), rol="Docente")
    asignacion = {"docente_id": docente["id"], "materia_id": 1, "grupo_id": 1}

    primera = client.post("/asignaciones", json=asignacion, headers=auth_docente)
    segunda = client.post("/asignaciones", json=asignacion, headers=auth_docente)

    assert primera.status_code == 201
    assert set(primera.json()) == {"id", "docente_id", "materia_id", "grupo_id"}
    assert segunda.status_code == 409
    assert segunda.json() == {"detail": "La asignación ya existe"}
