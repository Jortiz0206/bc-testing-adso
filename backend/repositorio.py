"""Adaptador de base de datos de ClassKids: todo el SQL vive aquí.

Los endpoints de main.py reciben un `Repositorio` por inyección de dependencias
(`get_repo`). En los tests de API se reemplaza por un repositorio falso en
memoria (tests/fakes.py), así los tests no necesitan PostgreSQL.
Este módulo se prueba contra la BD real con los tests de integración (semana 6).

Ningún método hace commit por su cuenta: el endpoint llama `confirmar()` al
final, para que una operación con varios pasos (registrar una nota y su alerta)
quede en una sola transacción.
"""
from datetime import datetime
from typing import Any, Optional

from fastapi import Depends
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db


class RegistroRelacionado(Exception):
    """El registro no se puede borrar porque otros registros dependen de él."""


class DatoDuplicado(Exception):
    """Se viola una restricción UNIQUE (por ejemplo, el documento de un estudiante)."""


class ReferenciaInexistente(Exception):
    """Una llave foránea apunta a un registro que no existe (grupo, estudiante, materia…)."""


# Códigos SQLSTATE de PostgreSQL
_UNIQUE_VIOLATION = "23505"
_FOREIGN_KEY_VIOLATION = "23503"


def _filas(resultado) -> list[dict[str, Any]]:
    return [dict(fila._mapping) for fila in resultado]


def _fila(resultado) -> Optional[dict[str, Any]]:
    fila = resultado.fetchone()
    return dict(fila._mapping) if fila else None


# Consultas de conteo fijadas de antemano (sin interpolar texto de entrada en el SQL).
_CONTEOS = {
    "docentes": "SELECT COUNT(*) FROM usuarios u JOIN user_roles r ON r.id = u.rol_id WHERE u.activo = TRUE AND lower(r.nombre) = 'docente'",
    "administradores": "SELECT COUNT(*) FROM usuarios u JOIN user_roles r ON r.id = u.rol_id WHERE u.activo = TRUE AND lower(r.nombre) = 'administrador'",
    "grupos": "SELECT COUNT(*) FROM grupos",
    "estudiantes_activos": "SELECT COUNT(*) FROM estudiantes WHERE activo = TRUE",
    "actividades": "SELECT COUNT(*) FROM actividades",
    "alertas_activas": "SELECT COUNT(*) FROM alertas WHERE estado = 'active'",
}


class Repositorio:
    def __init__(self, db: Session):
        self.db = db

    def confirmar(self) -> None:
        self.db.commit()

    def _escribir(self, sql: str, parametros: dict) -> Optional[dict]:
        """INSERT/UPDATE ... RETURNING que traduce las violaciones de restricciones
        a errores del dominio, para que el API responda 409/422 y no 500."""
        try:
            return _fila(self.db.execute(text(sql), parametros))
        except IntegrityError as error:
            self.db.rollback()
            codigo = getattr(error.orig, "sqlstate", None)
            if codigo == _UNIQUE_VIOLATION:
                raise DatoDuplicado() from error
            if codigo == _FOREIGN_KEY_VIOLATION:
                raise ReferenciaInexistente() from error
            raise

    def _borrar_protegido(self, sql: str, id: int) -> None:
        try:
            self.db.execute(text(sql), {"id": id})
            self.db.commit()
        except IntegrityError as error:
            self.db.rollback()
            raise RegistroRelacionado() from error

    # ---------------------------------------------------------------- usuarios
    def buscar_usuario_por_email(self, email: str) -> Optional[dict]:
        return _fila(self.db.execute(text("""
            SELECT u.id, u.email, u.nombre, u.apellido, u.password_hash, u.activo, r.nombre AS rol
            FROM usuarios u LEFT JOIN user_roles r ON r.id = u.rol_id
            WHERE lower(u.email) = lower(:email)
        """), {"email": email}))

    def registrar_inicio_sesion(self, usuario_id: int) -> None:
        self.db.execute(text("UPDATE usuarios SET last_sign_in_at = CURRENT_TIMESTAMP WHERE id = :id"), {"id": usuario_id})

    def existe_usuario_activo(self, email: str) -> bool:
        return self.db.execute(
            text("SELECT 1 FROM usuarios WHERE lower(email) = lower(:email) AND activo = TRUE"), {"email": email}
        ).first() is not None

    def listar_usuarios(self) -> list[dict]:
        return _filas(self.db.execute(text("""
            SELECT u.id::text AS user_id, u.email, u.nombre, u.apellido,
                   CASE WHEN lower(r.nombre) = 'administrador' THEN 'admin' ELSE 'docente' END AS role,
                   u.created_at, u.last_sign_in_at
            FROM usuarios u LEFT JOIN user_roles r ON r.id = u.rol_id
            WHERE u.activo = TRUE ORDER BY u.created_at DESC
        """)))

    def listar_docentes(self) -> list[dict]:
        return _filas(self.db.execute(text("""
            SELECT u.id, u.nombre, u.apellido, u.email
            FROM usuarios u JOIN user_roles r ON r.id = u.rol_id
            WHERE u.activo = TRUE AND lower(r.nombre) = 'docente'
            ORDER BY u.nombre ASC
        """)))

    def id_de_rol(self, nombre: str) -> Optional[int]:
        fila = self.db.execute(text("SELECT id FROM user_roles WHERE nombre = :nombre"), {"nombre": nombre}).first()
        return fila.id if fila else None

    def actualizar_rol_usuario(self, usuario_id: int, rol_id: int) -> bool:
        return self.db.execute(
            text("UPDATE usuarios SET rol_id = :rol_id WHERE id = :id AND activo = TRUE RETURNING id"),
            {"rol_id": rol_id, "id": usuario_id},
        ).first() is not None

    def desactivar_usuario(self, usuario_id: int) -> bool:
        return self.db.execute(
            text("UPDATE usuarios SET activo = FALSE WHERE id = :id AND activo = TRUE RETURNING id"), {"id": usuario_id}
        ).first() is not None

    def contar(self, clave: str) -> int:
        return self.db.execute(text(_CONTEOS[clave])).scalar_one()

    def listar_roles(self) -> list[dict]:
        return _filas(self.db.execute(text("SELECT * FROM user_roles ORDER BY id ASC")))

    # ----------------------------------------------- recuperación de contraseña
    def guardar_token_recuperacion(self, email: str, token: str, vence: datetime) -> None:
        self.db.execute(text("""
            INSERT INTO password_reset_tokens (email, token, expires_at) VALUES (:email, :token, :vence)
        """), {"email": email, "token": token, "vence": vence})

    def buscar_token_recuperacion_vigente(self, token: str) -> Optional[dict]:
        return _fila(self.db.execute(text("""
            SELECT id, email FROM password_reset_tokens
            WHERE token = :token AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP
        """), {"token": token}))

    def cambiar_password_con_token(self, token_id: int, email: str, password_hash: str) -> None:
        self.db.execute(text("UPDATE usuarios SET password_hash = :hash WHERE lower(email) = lower(:email)"),
                        {"hash": password_hash, "email": email})
        self.db.execute(text("UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = :id"), {"id": token_id})

    # ------------------------------------------------------------ invitaciones
    def crear_invitacion(self, email: str, rol_id: int, token: str, vence: datetime) -> None:
        self.db.execute(text("""
            INSERT INTO invitaciones (email, rol_id, token, expires_at) VALUES (:email, :rol_id, :token, :vence)
        """), {"email": email, "rol_id": rol_id, "token": token, "vence": vence})

    def buscar_invitacion_vigente(self, token: str) -> Optional[dict]:
        return _fila(self.db.execute(text("""
            SELECT i.email, i.rol_id, r.nombre AS rol FROM invitaciones i JOIN user_roles r ON r.id = i.rol_id
            WHERE i.token = :token AND i.accepted_at IS NULL AND i.expires_at > CURRENT_TIMESTAMP
        """), {"token": token}))

    def aceptar_invitacion(self, token: str, email: str, nombre: str, apellido: Optional[str], password_hash: str, rol_id: int) -> None:
        self.db.execute(text("""
            INSERT INTO usuarios (email, nombre, apellido, password_hash, rol_id)
            VALUES (:email, :nombre, :apellido, :hash, :rol_id)
            ON CONFLICT (email) DO UPDATE SET nombre = EXCLUDED.nombre, apellido = EXCLUDED.apellido,
                password_hash = EXCLUDED.password_hash, rol_id = EXCLUDED.rol_id, activo = TRUE
        """), {"email": email, "nombre": nombre, "apellido": apellido, "hash": password_hash, "rol_id": rol_id})
        self.db.execute(text("UPDATE invitaciones SET accepted_at = CURRENT_TIMESTAMP WHERE token = :token"), {"token": token})

    # ------------------------------------------------------------------ grupos
    def listar_grupos(self) -> list[dict]:
        return _filas(self.db.execute(text("SELECT * FROM grupos ORDER BY id ASC")))

    def crear_grupo(self, d: dict) -> dict:
        return _fila(self.db.execute(text("""
            INSERT INTO grupos (nombre, grado, turno, ano_lectivo) VALUES (:nombre, :grado, :turno, :ano_lectivo) RETURNING *
        """), d))

    def actualizar_grupo(self, id: int, d: dict) -> Optional[dict]:
        return _fila(self.db.execute(text("""
            UPDATE grupos SET nombre = :nombre, grado = :grado, turno = :turno, ano_lectivo = :ano_lectivo
            WHERE id = :id RETURNING *
        """), {**d, "id": id}))

    def eliminar_grupo(self, id: int) -> None:
        self._borrar_protegido("DELETE FROM grupos WHERE id = :id", id)

    # ------------------------------------------------------------- estudiantes
    def listar_estudiantes(self, grupo_id: Optional[int] = None) -> list[dict]:
        sql = "SELECT e.*, g.nombre AS nombre_grupo FROM estudiantes e LEFT JOIN grupos g ON e.grupo_id = g.id"
        parametros = {}
        if grupo_id is not None:
            sql += " WHERE e.grupo_id = :grupo_id"
            parametros["grupo_id"] = grupo_id
        return _filas(self.db.execute(text(sql + " ORDER BY e.id ASC"), parametros))

    def crear_estudiante(self, d: dict) -> dict:
        return self._escribir("""
            INSERT INTO estudiantes (documento, nombre, apellido, grupo_id, activo)
            VALUES (:documento, :nombre, :apellido, :grupo_id, :activo) RETURNING *
        """, d)

    def actualizar_estudiante(self, id: int, d: dict) -> Optional[dict]:
        return self._escribir("""
            UPDATE estudiantes SET documento = :documento, nombre = :nombre, apellido = :apellido,
                grupo_id = :grupo_id, activo = :activo
            WHERE id = :id RETURNING *
        """, {**d, "id": id})

    def eliminar_estudiante(self, id: int) -> bool:
        return self.db.execute(text("DELETE FROM estudiantes WHERE id = :id RETURNING id"), {"id": id}).first() is not None

    # ---------------------------------------------------------------- materias
    def listar_materias(self) -> list[dict]:
        return _filas(self.db.execute(text("SELECT * FROM materias ORDER BY id ASC")))

    def crear_materia(self, d: dict) -> dict:
        return _fila(self.db.execute(text("INSERT INTO materias (nombre, codigo) VALUES (:nombre, :codigo) RETURNING *"), d))

    def actualizar_materia(self, id: int, d: dict) -> Optional[dict]:
        return _fila(self.db.execute(text("UPDATE materias SET nombre = :nombre, codigo = :codigo WHERE id = :id RETURNING *"),
                                     {**d, "id": id}))

    def eliminar_materia(self, id: int) -> None:
        self._borrar_protegido("DELETE FROM materias WHERE id = :id", id)

    # ------------------------------------------------------------- actividades
    def listar_actividades(self, grupo_id: Optional[int] = None) -> list[dict]:
        sql = """
            SELECT act.*, m.nombre AS materia_nombre, g.nombre AS grupo_nombre,
                   CASE WHEN act.fecha_entrega < CURRENT_DATE THEN 'vencida' ELSE 'pendiente' END AS estado
            FROM actividades act
            JOIN materias m ON act.materia_id = m.id
            JOIN grupos g ON act.grupo_id = g.id
        """
        parametros = {}
        if grupo_id is not None:
            sql += " WHERE act.grupo_id = :grupo_id"
            parametros["grupo_id"] = grupo_id
        return _filas(self.db.execute(text(sql + " ORDER BY act.fecha_entrega ASC"), parametros))

    def crear_actividad(self, d: dict) -> dict:
        return self._escribir("""
            INSERT INTO actividades (materia_id, grupo_id, titulo, tipo, descripcion, fecha_entrega)
            VALUES (:materia_id, :grupo_id, :titulo, :tipo, :descripcion, :fecha_entrega) RETURNING *
        """, d)

    def actualizar_actividad(self, id: int, d: dict) -> Optional[dict]:
        return self._escribir("""
            UPDATE actividades SET materia_id = :materia_id, grupo_id = :grupo_id, titulo = :titulo, tipo = :tipo,
                descripcion = :descripcion, fecha_entrega = :fecha_entrega
            WHERE id = :id RETURNING *
        """, {**d, "id": id})

    def eliminar_actividad(self, id: int) -> bool:
        return self.db.execute(text("DELETE FROM actividades WHERE id = :id RETURNING id"), {"id": id}).first() is not None

    # ---------------------------------------------------------- calificaciones
    def listar_calificaciones(self, actividad_id: Optional[int] = None) -> list[dict]:
        sql = """
            SELECT c.*, e.nombre AS estudiante_nombre, e.apellido AS estudiante_apellido, m.nombre AS materia_nombre
            FROM calificaciones c
            JOIN estudiantes e ON c.estudiante_id = e.id
            JOIN materias m ON c.materia_id = m.id
        """
        parametros = {}
        if actividad_id is not None:
            sql += " WHERE c.actividad_id = :actividad_id"
            parametros["actividad_id"] = actividad_id
        return _filas(self.db.execute(text(sql + " ORDER BY c.fecha_registro DESC"), parametros))

    def crear_calificacion(self, d: dict) -> dict:
        return self._escribir("""
            INSERT INTO calificaciones (estudiante_id, materia_id, actividad_id, nota, periodo, observacion)
            VALUES (:estudiante_id, :materia_id, :actividad_id, :nota, :periodo, :observacion) RETURNING *
        """, d)

    def actualizar_calificacion(self, id: int, d: dict) -> Optional[dict]:
        return self._escribir("""
            UPDATE calificaciones SET estudiante_id = :estudiante_id, materia_id = :materia_id,
                actividad_id = :actividad_id, nota = :nota, periodo = :periodo, observacion = :observacion
            WHERE id = :id RETURNING *
        """, {**d, "id": id})

    def eliminar_calificacion(self, id: int) -> bool:
        return self.db.execute(text("DELETE FROM calificaciones WHERE id = :id RETURNING id"), {"id": id}).first() is not None

    def promedio_de_estudiante(self, estudiante_id: int) -> Optional[float]:
        valor = self.db.execute(text("SELECT AVG(nota) FROM calificaciones WHERE estudiante_id = :id"),
                                {"id": estudiante_id}).scalar()
        return float(valor) if valor is not None else None

    def tiene_alerta_bajo_promedio_activa(self, estudiante_id: int) -> bool:
        return self.db.execute(text("""
            SELECT 1 FROM alertas WHERE estudiante_id = :id AND tipo = 'low_grade' AND estado IN ('active', 'Pendiente')
        """), {"id": estudiante_id}).first() is not None

    # ----------------------------------------------------------- observaciones
    def listar_observaciones(self) -> list[dict]:
        return _filas(self.db.execute(text("""
            SELECT o.*, e.nombre AS estudiante_nombre, e.apellido AS estudiante_apellido
            FROM observaciones o JOIN estudiantes e ON o.estudiante_id = e.id ORDER BY o.fecha DESC
        """)))

    def crear_observacion(self, d: dict) -> dict:
        return self._escribir("""
            INSERT INTO observaciones (estudiante_id, tipo, descripcion) VALUES (:estudiante_id, :tipo, :descripcion) RETURNING *
        """, d)

    def eliminar_observacion(self, id: int) -> bool:
        return self.db.execute(text("DELETE FROM observaciones WHERE id = :id RETURNING id"), {"id": id}).first() is not None

    # ----------------------------------------------------------------- alertas
    def listar_alertas(self) -> list[dict]:
        return _filas(self.db.execute(text("""
            SELECT a.*, e.nombre AS estudiante_nombre, e.apellido AS estudiante_apellido
            FROM alertas a JOIN estudiantes e ON a.estudiante_id = e.id ORDER BY a.fecha_creacion DESC
        """)))

    def crear_alerta(self, d: dict) -> dict:
        return self._escribir("""
            INSERT INTO alertas (estudiante_id, tipo, mensaje, estado) VALUES (:estudiante_id, :tipo, :mensaje, :estado) RETURNING *
        """, d)

    def actualizar_estado_alerta(self, id: int, estado: str) -> Optional[dict]:
        return _fila(self.db.execute(text("UPDATE alertas SET estado = :estado WHERE id = :id RETURNING *"),
                                     {"estado": estado, "id": id}))

    def eliminar_alerta(self, id: int) -> bool:
        return self.db.execute(text("DELETE FROM alertas WHERE id = :id RETURNING id"), {"id": id}).first() is not None

    # ------------------------------------------------------------ asignaciones
    def listar_asignaciones(self) -> list[dict]:
        return _filas(self.db.execute(text("""
            SELECT a.id, a.docente_id, a.materia_id, a.grupo_id,
                   TRIM(u.nombre || ' ' || COALESCE(u.apellido, '')) AS docente, m.nombre AS materia_nombre, g.nombre AS grupo_nombre
            FROM asignaciones a
            JOIN usuarios u ON a.docente_id = u.id
            JOIN materias m ON a.materia_id = m.id
            JOIN grupos g ON a.grupo_id = g.id
            ORDER BY g.nombre, m.nombre, u.nombre
        """)))

    def es_docente_activo(self, usuario_id: int) -> bool:
        return self.db.execute(text("""
            SELECT 1 FROM usuarios u JOIN user_roles r ON r.id = u.rol_id
            WHERE u.id = :id AND u.activo = TRUE AND lower(r.nombre) = 'docente'
        """), {"id": usuario_id}).first() is not None

    def existe_asignacion(self, materia_id: int, grupo_id: int) -> bool:
        return self.db.execute(text("SELECT 1 FROM asignaciones WHERE materia_id = :m AND grupo_id = :g"),
                               {"m": materia_id, "g": grupo_id}).first() is not None

    def crear_asignacion(self, d: dict) -> dict:
        return self._escribir("""
            INSERT INTO asignaciones (docente_id, materia_id, grupo_id) VALUES (:docente_id, :materia_id, :grupo_id)
            RETURNING id, docente_id, materia_id, grupo_id
        """, d)

    def eliminar_asignacion(self, id: int) -> bool:
        return self.db.execute(text("DELETE FROM asignaciones WHERE id = :id RETURNING id"), {"id": id}).first() is not None


def get_repo(db: Session = Depends(get_db)) -> Repositorio:
    return Repositorio(db)
