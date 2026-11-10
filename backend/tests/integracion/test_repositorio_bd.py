"""Rol BD (Johanna Ortiz, S6): el repositorio contra PostgreSQL real.

Cada test crea sus propios datos (documentos únicos) y no usa ids que no haya insertado.
"""
from uuid import uuid4

import pytest
from sqlalchemy.exc import DataError, IntegrityError

from repositorio import DatoDuplicado, ReferenciaInexistente, RegistroRelacionado


def doc() -> str:
    return "IT-" + uuid4().hex[:12]


@pytest.fixture
def grupo(repo_bd):
    return repo_bd.crear_grupo({"nombre": "Grupo IT " + uuid4().hex[:6], "grado": "1°", "turno": "Matutino", "ano_lectivo": 2026})


def nuevo_estudiante(repo_bd, grupo_id=None, **cambios):
    return repo_bd.crear_estudiante({"documento": doc(), "nombre": "Ana", "apellido": "Ruiz", "grupo_id": grupo_id, "activo": True, **cambios})


def test_crear_y_leer_estudiante_con_el_nombre_del_grupo(repo_bd, grupo):
    creado = nuevo_estudiante(repo_bd, grupo["id"])

    [leido] = repo_bd.listar_estudiantes(grupo["id"])

    assert leido["id"] == creado["id"]
    assert leido["nombre_grupo"] == grupo["nombre"]  # JOIN con grupos
    assert leido["activo"] is True


def test_listar_estudiantes_de_un_grupo_ordenados_por_id(repo_bd, grupo):
    ids = [nuevo_estudiante(repo_bd, grupo["id"])["id"] for _ in range(3)]
    nuevo_estudiante(repo_bd, None)  # sin grupo: no debe aparecer

    assert [e["id"] for e in repo_bd.listar_estudiantes(grupo["id"])] == ids


def test_actualizar_y_eliminar_estudiante(repo_bd):
    creado = nuevo_estudiante(repo_bd)

    actualizado = repo_bd.actualizar_estudiante(creado["id"], {**creado, "apellido": "Mesa", "activo": False})

    assert actualizado["apellido"] == "Mesa" and actualizado["activo"] is False
    assert repo_bd.actualizar_estudiante(-1, {**creado}) is None
    assert repo_bd.eliminar_estudiante(creado["id"]) is True
    assert repo_bd.eliminar_estudiante(creado["id"]) is False


# --- Restricciones de la tabla estudiantes, una por test ----------------------------

def test_documento_unique(repo_bd):
    creado = nuevo_estudiante(repo_bd)

    with pytest.raises(DatoDuplicado):
        nuevo_estudiante(repo_bd, documento=creado["documento"])


def test_grupo_id_debe_existir(repo_bd):
    with pytest.raises(ReferenciaInexistente):
        nuevo_estudiante(repo_bd, grupo_id=-1)


def test_documento_varchar_50(repo_bd):
    assert nuevo_estudiante(repo_bd, documento="D" + uuid4().hex + "x" * 17)  # 50 caracteres
    with pytest.raises(DataError):
        nuevo_estudiante(repo_bd, documento="D" + uuid4().hex + "x" * 18)  # 51


def test_nombre_not_null(repo_bd):
    with pytest.raises(IntegrityError):
        nuevo_estudiante(repo_bd, nombre=None)


def test_borrar_grupo_deja_al_estudiante_sin_grupo(repo_bd, grupo):
    # estudiantes.grupo_id ON DELETE SET NULL
    est = nuevo_estudiante(repo_bd, grupo["id"])

    repo_bd.eliminar_grupo(grupo["id"])

    [leido] = [e for e in repo_bd.listar_estudiantes() if e["id"] == est["id"]]
    assert leido["grupo_id"] is None


def test_no_se_borra_un_grupo_con_actividades(repo_bd, grupo):
    materia = repo_bd.crear_materia({"nombre": "Materia IT", "codigo": None})
    repo_bd.crear_actividad({"materia_id": materia["id"], "grupo_id": grupo["id"], "titulo": "Taller", "tipo": "tarea",
                             "descripcion": None, "fecha_entrega": None})

    with pytest.raises(RegistroRelacionado):
        repo_bd.eliminar_grupo(grupo["id"])


# --- Calificaciones: CHECK, promedio y diferencias con MySQL ----------------------------

def test_nota_check_entre_0_y_5_y_numeric_3_1(repo_bd):
    est = nuevo_estudiante(repo_bd)
    materia = repo_bd.crear_materia({"nombre": "Materia IT", "codigo": None})
    base = {"estudiante_id": est["id"], "materia_id": materia["id"], "actividad_id": None, "periodo": 1, "observacion": None}

    guardada = repo_bd.crear_calificacion({**base, "nota": 3.45})

    # NUMERIC(3,1) redondea a un decimal (MySQL en modo estricto haría lo mismo con DECIMAL(3,1))
    assert float(guardada["nota"]) == 3.5
    with pytest.raises(IntegrityError):
        repo_bd.crear_calificacion({**base, "nota": 5.5})


def test_promedio_y_alerta_de_bajo_rendimiento(repo_bd):
    est = nuevo_estudiante(repo_bd)
    materia = repo_bd.crear_materia({"nombre": "Materia IT", "codigo": None})
    for nota in (2, 3):
        repo_bd.crear_calificacion({"estudiante_id": est["id"], "materia_id": materia["id"], "actividad_id": None,
                                    "nota": nota, "periodo": 1, "observacion": None})

    assert repo_bd.promedio_de_estudiante(est["id"]) == 2.5
    assert repo_bd.tiene_alerta_bajo_promedio_activa(est["id"]) is False
    repo_bd.crear_alerta({"estudiante_id": est["id"], "tipo": "low_grade", "mensaje": "bajo", "estado": "active"})
    assert repo_bd.tiene_alerta_bajo_promedio_activa(est["id"]) is True


def test_actividades_ordenadas_por_fecha_con_nulos_al_final(repo_bd, grupo):
    # En PostgreSQL los NULL van al FINAL en ORDER BY ASC; en MySQL irían al principio.
    materia = repo_bd.crear_materia({"nombre": "Materia IT", "codigo": None})
    base = {"materia_id": materia["id"], "grupo_id": grupo["id"], "tipo": "tarea", "descripcion": None}
    for titulo, fecha in [("sin fecha", None), ("marzo", "2026-03-01"), ("enero", "2026-01-01")]:
        repo_bd.crear_actividad({**base, "titulo": titulo, "fecha_entrega": fecha})

    assert [a["titulo"] for a in repo_bd.listar_actividades(grupo["id"])] == ["enero", "marzo", "sin fecha"]
