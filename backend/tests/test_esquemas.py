"""Tests unitarios de la validación de datos de entrada (rol BD, Alejandra Guio, S2).

Cada regla replica una restricción de las tablas en init.sql; el valor límite
de cada una queda documentado con un caso que pasa y otro que no.
"""
import pytest
from pydantic import ValidationError

from esquemas import ActividadSchema, AlertaSchema, CalificacionSchema, EstudianteSchema, GrupoSchema, MateriaSchema

CALIFICACION = {"estudiante_id": 1, "materia_id": 1}
ESTUDIANTE = {"documento": "1001", "nombre": "Ana", "apellido": "Ruiz"}


@pytest.mark.parametrize("nota", [0, 0.1, 3, 4.9, 5])
def test_should_accept_grade_inside_zero_to_five(nota):
    assert CalificacionSchema(**CALIFICACION, nota=nota).nota == nota


@pytest.mark.parametrize("nota", [-0.1, 5.1, 50])
def test_should_reject_grade_outside_zero_to_five(nota):
    with pytest.raises(ValidationError):
        CalificacionSchema(**CALIFICACION, nota=nota)


def test_should_default_period_to_one_and_reject_null_period():
    assert CalificacionSchema(**CALIFICACION, nota=4).periodo == 1

    with pytest.raises(ValidationError):
        CalificacionSchema(**CALIFICACION, nota=4, periodo=None)


@pytest.mark.parametrize("periodo", [0, -1])
def test_should_reject_period_below_one(periodo):
    with pytest.raises(ValidationError):
        CalificacionSchema(**CALIFICACION, nota=4, periodo=periodo)


@pytest.mark.parametrize("campo", ["documento", "nombre", "apellido"])
@pytest.mark.parametrize("valor", ["", "   "])
def test_should_reject_student_with_empty_required_field(campo, valor):
    with pytest.raises(ValidationError):
        EstudianteSchema(**{**ESTUDIANTE, campo: valor})


@pytest.mark.parametrize(("campo", "maximo"), [("documento", 50), ("nombre", 120), ("apellido", 120)])
def test_should_respect_student_column_lengths(campo, maximo):
    assert EstudianteSchema(**{**ESTUDIANTE, campo: "x" * maximo})

    with pytest.raises(ValidationError):
        EstudianteSchema(**{**ESTUDIANTE, campo: "x" * (maximo + 1)})


def test_should_keep_student_active_by_default_and_reject_null_active():
    assert EstudianteSchema(**ESTUDIANTE).activo is True

    with pytest.raises(ValidationError):
        EstudianteSchema(**ESTUDIANTE, activo=None)


@pytest.mark.parametrize(
    ("modelo", "datos", "campo", "maximo"),
    [
        (GrupoSchema, {}, "nombre", 120),
        (MateriaSchema, {}, "nombre", 120),
        (MateriaSchema, {"nombre": "Matemáticas"}, "codigo", 30),
        (ActividadSchema, {"materia_id": 1, "grupo_id": 1}, "titulo", 200),
        (AlertaSchema, {"estudiante_id": 1, "mensaje": "Revisar"}, "tipo", 80),
    ],
)
def test_should_respect_varchar_length_of_each_table(modelo, datos, campo, maximo):
    assert modelo(**datos, **{campo: "x" * maximo})

    with pytest.raises(ValidationError):
        modelo(**datos, **{campo: "x" * (maximo + 1)})
