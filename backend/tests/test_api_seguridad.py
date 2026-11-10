"""Rol Backend (Alejandra Guio, S4): transversal — seguridad y contrato de errores de todo el API."""
from datetime import datetime, timedelta

import pytest
from jose import jwt

import main


def token_con(claims: dict, secreto: str = None) -> dict:
    return {"Authorization": "Bearer " + jwt.encode(claims, secreto or main.JWT_SECRET, algorithm="HS256")}


# --- 401 / 403 / autorizado -------------------------------------------------

@pytest.mark.parametrize("ruta", ["/estudiantes", "/grupos", "/calificaciones", "/alertas", "/usuarios", "/catalogo/docentes"])
def test_should_answer_401_json_without_token(client, ruta):
    response = client.get(ruta)

    assert response.status_code == 401
    assert response.json() == {"detail": "Autenticación requerida"}


@pytest.mark.parametrize(
    "encabezado",
    [
        {"Authorization": "Bearer no-es-un-jwt"},
        {"Authorization": "Basic YWRtaW46YWRtaW4="},
        # Firmado con otro secreto: alguien que se fabrica un token de admin
        token_con({"sub": "1", "role": "admin", "exp": datetime.utcnow() + timedelta(hours=1)}, secreto="otro-secreto"),
        # Vencido
        token_con({"sub": "1", "role": "admin", "exp": datetime.utcnow() - timedelta(minutes=1)}),
    ],
)
def test_should_reject_invalid_forged_or_expired_tokens(client, encabezado):
    response = client.get("/usuarios", headers=encabezado)

    assert response.status_code == 401
    assert "detail" in response.json()


def test_should_answer_403_when_docente_calls_admin_endpoints(client, auth_docente):
    for metodo, ruta in [("get", "/usuarios"), ("post", "/usuarios/invitar"), ("delete", "/usuarios/1"), ("get", "/docentes/count")]:
        response = getattr(client, metodo)(ruta, headers=auth_docente)
        assert response.status_code == 403, ruta
        assert response.json() == {"detail": "Permisos insuficientes"}


def test_should_let_admin_into_admin_endpoints(client, auth_admin):
    assert client.get("/usuarios", headers=auth_admin).status_code == 200
    assert client.get("/admins/count", headers=auth_admin).json() == {"count": 0}


def test_preflight_options_should_not_require_token(client):
    response = client.options("/estudiantes", headers={
        "Origin": "http://127.0.0.1:8080", "Access-Control-Request-Method": "GET",
    })

    assert response.status_code == 200


# --- Contrato de errores ------------------------------------------------------

def test_should_answer_422_json_when_body_is_malformed_json(client, auth_docente):
    response = client.post("/estudiantes", content=b'{"documento": ', headers={**auth_docente, "Content-Type": "application/json"})

    assert response.status_code == 422
    assert response.headers["content-type"] == "application/json"
    assert response.json()["detail"] == "Datos inválidos - cuerpo: El cuerpo no es un JSON válido"


def test_should_answer_422_when_path_or_query_have_wrong_types(client, auth_docente):
    assert client.get("/estudiantes?grupo_id=abc", headers=auth_docente).status_code == 422
    assert client.delete("/grupos/uno", headers=auth_docente).status_code == 422


def test_unexpected_error_should_answer_generic_json_without_internals(client, repo, auth_docente):
    def falla(*_):
        raise RuntimeError('psycopg.errors.UndefinedTable: relation "grupos" does not exist\nSELECT * FROM grupos')
    repo.listar_grupos = falla

    response = client.get("/grupos", headers=auth_docente)

    assert response.status_code == 500
    assert response.json() == {"detail": "Error interno del servidor"}
    assert "SELECT" not in response.text and "Traceback" not in response.text


# --- Autenticación --------------------------------------------------------------

def test_wrong_password_should_not_reveal_that_account_is_disabled(client, repo, hash_password):
    repo.agregar_usuario("baja@classkids.local", hash_password("secreta1"), activo=False)

    errada = client.post("/auth/login", json={"email": "baja@classkids.local", "password": "otra"})
    correcta = client.post("/auth/login", json={"email": "baja@classkids.local", "password": "secreta1"})

    assert errada.status_code == 401
    assert errada.json() == {"detail": "Correo o contraseña incorrectos"}
    assert correcta.status_code == 403


def test_login_token_should_carry_session_role(client, repo, hash_password):
    repo.agregar_usuario("admin@classkids.local", hash_password("secreta1"), rol="Administrador")

    token = client.post("/auth/login", json={"email": "admin@classkids.local", "password": "secreta1"}).json()["access_token"]

    assert jwt.decode(token, main.JWT_SECRET, algorithms=["HS256"])["role"] == "admin"


def test_forgot_password_should_answer_the_same_whether_email_exists_or_not(client, repo, hash_password):
    repo.agregar_usuario("laura@classkids.local", hash_password("x"))

    existe = client.post("/auth/forgot-password", json={"email": "laura@classkids.local"})
    no_existe = client.post("/auth/forgot-password", json={"email": "nadie@classkids.local"})

    assert existe.json() == no_existe.json()
    assert "token" not in existe.text
    assert len(repo.tokens_recuperacion) == 1
