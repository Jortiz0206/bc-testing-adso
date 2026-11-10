"""Fixtures de integración contra PostgreSQL real.

- La conexión llega SOLO por DATABASE_URL (nunca credenciales en el código).
- Si DATABASE_URL no está definida, todos estos tests se SALTAN (el CI sin BD sigue en verde).
- Por seguridad, se niegan a correr si el nombre de la BD no termina en "_test".
- Limpieza: cada test corre dentro de una transacción que se deshace al final
  (rollback). Los commit() del repositorio solo cierran un SAVEPOINT interno,
  así que nada de lo que inserta un test sobrevive al siguiente.
"""
import os

import pytest
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from repositorio import Repositorio

DATABASE_URL = os.getenv("DATABASE_URL")

pytestmark = pytest.mark.skipif(not DATABASE_URL, reason="DATABASE_URL no definida: se omiten los tests de integración")

@pytest.fixture(scope="session")
def engine():
    if not DATABASE_URL:
        pytest.skip("DATABASE_URL no definida")
    nombre = make_url(DATABASE_URL).database or ""
    if not nombre.endswith("_test"):
        pytest.exit(f"La BD '{nombre}' no termina en _test: los tests de integración no corren contra BD de desarrollo.")
    motor = create_engine(DATABASE_URL)
    yield motor
    motor.dispose()

@pytest.fixture
def sesion(engine):
    conexion = engine.connect()
    transaccion = conexion.begin()
    s = Session(bind=conexion, join_transaction_mode="create_savepoint")
    yield s
    s.close()
    transaccion.rollback()
    conexion.close()

@pytest.fixture
def repo_bd(sesion):
    return Repositorio(sesion)
