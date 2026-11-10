"""Fixtures compartidas de los tests del backend.

`client` es un TestClient que usa el repositorio falso en lugar de PostgreSQL
(`app.dependency_overrides[get_repo]`). Los tokens se firman con el mismo
secreto de la app, como lo haría /auth/login.
"""
import pytest
from fastapi.testclient import TestClient

from main import app, create_access_token, pwd_context
from repositorio import get_repo
from tests.fakes import FakeRepositorio


@pytest.fixture
def repo():
    return FakeRepositorio()


@pytest.fixture
def client(repo):
    app.dependency_overrides[get_repo] = lambda: repo
    # raise_server_exceptions=False: un error no controlado se ve como lo vería el
    # frontend (respuesta 500), no como una excepción dentro del test.
    with TestClient(app, raise_server_exceptions=False) as cliente:
        yield cliente
    app.dependency_overrides.clear()


@pytest.fixture
def auth_admin():
    return {"Authorization": f"Bearer {create_access_token(1, 'admin')}"}


@pytest.fixture
def auth_docente():
    return {"Authorization": f"Bearer {create_access_token(2, 'docente')}"}


@pytest.fixture
def hash_password():
    return pwd_context.hash
