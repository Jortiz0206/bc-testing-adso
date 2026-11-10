"""Repositorio falso en memoria (un *fake*): cumple el mismo contrato que
repositorio.Repositorio pero guarda los datos en listas de Python.

Lo usan los tests de API para no depender de PostgreSQL. Imita las reglas de la
BD que el API necesita conocer (ids autoincrementales, borrado protegido por
llaves foráneas, filtros y uniones de las consultas). Lo que solo la BD real
puede garantizar se prueba en los tests de integración (semana 6).
"""
from datetime import datetime
from itertools import count
from typing import Optional

from repositorio import DatoDuplicado, ReferenciaInexistente, RegistroRelacionado


class FakeRepositorio:
    def __init__(self):
        self._ids = count(1)
        self.confirmaciones = 0
        self.roles = [
            {"id": 1, "nombre": "Administrador", "descripcion": None},
            {"id": 2, "nombre": "Docente", "descripcion": None},
        ]
        self.usuarios: list[dict] = []
        self.tokens_recuperacion: list[dict] = []
        self.invitaciones: list[dict] = []
        self.grupos: list[dict] = []
        self.estudiantes: list[dict] = []
        self.materias: list[dict] = []
        self.actividades: list[dict] = []
        self.calificaciones: list[dict] = []
        self.observaciones: list[dict] = []
        self.alertas: list[dict] = []
        self.asignaciones: list[dict] = []

    # ---------------------------------------------------------------- utilidades
    def _nuevo(self, tabla: list[dict], datos: dict) -> dict:
        registro = {"id": next(self._ids), **datos}
        tabla.append(registro)
        return dict(registro)

    @staticmethod
    def _buscar(tabla: list[dict], id: int) -> Optional[dict]:
        return next((r for r in tabla if r["id"] == id), None)

    def _actualizar(self, tabla: list[dict], id: int, datos: dict) -> Optional[dict]:
        registro = self._buscar(tabla, id)
        if registro is None:
            return None
        registro.update(datos)
        return dict(registro)

    @staticmethod
    def _eliminar(tabla: list[dict], id: int) -> bool:
        antes = len(tabla)
        tabla[:] = [r for r in tabla if r["id"] != id]
        return len(tabla) < antes

    def _nombre_rol(self, rol_id: Optional[int]) -> Optional[str]:
        rol = self._buscar(self.roles, rol_id) if rol_id else None
        return rol["nombre"] if rol else None

    def confirmar(self) -> None:
        self.confirmaciones += 1

    # ------------------------------------------------------- datos de arranque
    def agregar_usuario(self, email: str, password_hash: str, rol: str = "Docente", activo: bool = True,
                        nombre: str = "Usuario", apellido: Optional[str] = None) -> dict:
        rol_id = next(r["id"] for r in self.roles if r["nombre"] == rol)
        return self._nuevo(self.usuarios, {
            "email": email, "nombre": nombre, "apellido": apellido, "password_hash": password_hash,
            "rol_id": rol_id, "activo": activo, "created_at": datetime(2026, 1, 1), "last_sign_in_at": None,
        })

    # ---------------------------------------------------------------- usuarios
    def buscar_usuario_por_email(self, email: str) -> Optional[dict]:
        u = next((u for u in self.usuarios if u["email"].lower() == email.lower()), None)
        if u is None:
            return None
        return {**{k: u[k] for k in ("id", "email", "nombre", "apellido", "password_hash", "activo")},
                "rol": self._nombre_rol(u["rol_id"])}

    def registrar_inicio_sesion(self, usuario_id: int) -> None:
        self._buscar(self.usuarios, usuario_id)["last_sign_in_at"] = datetime(2026, 1, 2)

    def existe_usuario_activo(self, email: str) -> bool:
        return any(u["email"].lower() == email.lower() and u["activo"] for u in self.usuarios)

    def listar_usuarios(self) -> list[dict]:
        return [{
            "user_id": str(u["id"]), "email": u["email"], "nombre": u["nombre"], "apellido": u["apellido"],
            "role": "admin" if (self._nombre_rol(u["rol_id"]) or "").lower() == "administrador" else "docente",
            "created_at": u["created_at"], "last_sign_in_at": u["last_sign_in_at"],
        } for u in self.usuarios if u["activo"]]

    def listar_docentes(self) -> list[dict]:
        return sorted([
            {"id": u["id"], "nombre": u["nombre"], "apellido": u["apellido"], "email": u["email"]}
            for u in self.usuarios if u["activo"] and self._nombre_rol(u["rol_id"]) == "Docente"
        ], key=lambda d: d["nombre"])

    def id_de_rol(self, nombre: str) -> Optional[int]:
        return next((r["id"] for r in self.roles if r["nombre"] == nombre), None)

    def actualizar_rol_usuario(self, usuario_id: int, rol_id: int) -> bool:
        u = self._buscar(self.usuarios, usuario_id)
        if u is None or not u["activo"]:
            return False
        u["rol_id"] = rol_id
        return True

    def desactivar_usuario(self, usuario_id: int) -> bool:
        u = self._buscar(self.usuarios, usuario_id)
        if u is None or not u["activo"]:
            return False
        u["activo"] = False
        return True

    def contar(self, clave: str) -> int:
        conteos = {
            "docentes": lambda: len([u for u in self.usuarios if u["activo"] and self._nombre_rol(u["rol_id"]) == "Docente"]),
            "administradores": lambda: len([u for u in self.usuarios if u["activo"] and self._nombre_rol(u["rol_id"]) == "Administrador"]),
            "grupos": lambda: len(self.grupos),
            "estudiantes_activos": lambda: len([e for e in self.estudiantes if e["activo"]]),
            "actividades": lambda: len(self.actividades),
            "alertas_activas": lambda: len([a for a in self.alertas if a["estado"] == "active"]),
        }
        return conteos[clave]()

    def listar_roles(self) -> list[dict]:
        return [dict(r) for r in self.roles]

    # ----------------------------------------------- recuperación de contraseña
    def guardar_token_recuperacion(self, email: str, token: str, vence: datetime) -> None:
        self._nuevo(self.tokens_recuperacion, {"email": email, "token": token, "expires_at": vence, "used_at": None})

    def buscar_token_recuperacion_vigente(self, token: str) -> Optional[dict]:
        t = next((t for t in self.tokens_recuperacion if t["token"] == token and t["used_at"] is None
                  and t["expires_at"] > datetime.utcnow()), None)
        return {"id": t["id"], "email": t["email"]} if t else None

    def cambiar_password_con_token(self, token_id: int, email: str, password_hash: str) -> None:
        for u in self.usuarios:
            if u["email"].lower() == email.lower():
                u["password_hash"] = password_hash
        self._buscar(self.tokens_recuperacion, token_id)["used_at"] = datetime.utcnow()

    # ------------------------------------------------------------ invitaciones
    def crear_invitacion(self, email: str, rol_id: int, token: str, vence: datetime) -> None:
        self._nuevo(self.invitaciones, {"email": email, "rol_id": rol_id, "token": token, "expires_at": vence, "accepted_at": None})

    def buscar_invitacion_vigente(self, token: str) -> Optional[dict]:
        i = next((i for i in self.invitaciones if i["token"] == token and i["accepted_at"] is None
                  and i["expires_at"] > datetime.utcnow()), None)
        return {"email": i["email"], "rol_id": i["rol_id"], "rol": self._nombre_rol(i["rol_id"])} if i else None

    def aceptar_invitacion(self, token, email, nombre, apellido, password_hash, rol_id) -> None:
        existente = next((u for u in self.usuarios if u["email"] == email), None)
        datos = {"nombre": nombre, "apellido": apellido, "password_hash": password_hash, "rol_id": rol_id, "activo": True}
        if existente:
            existente.update(datos)
        else:
            self._nuevo(self.usuarios, {"email": email, "created_at": datetime(2026, 1, 1), "last_sign_in_at": None, **datos})
        next(i for i in self.invitaciones if i["token"] == token)["accepted_at"] = datetime.utcnow()

    # ------------------------------------------------------------------ grupos
    def listar_grupos(self) -> list[dict]:
        return [dict(g) for g in self.grupos]

    def crear_grupo(self, d: dict) -> dict:
        return self._nuevo(self.grupos, d)

    def actualizar_grupo(self, id: int, d: dict) -> Optional[dict]:
        return self._actualizar(self.grupos, id, d)

    def eliminar_grupo(self, id: int) -> None:
        # actividades.grupo_id y asignaciones.grupo_id son FK sin ON DELETE.
        if any(a["grupo_id"] == id for a in self.actividades + self.asignaciones):
            raise RegistroRelacionado()
        self._eliminar(self.grupos, id)
        for e in self.estudiantes:  # estudiantes.grupo_id ON DELETE SET NULL
            if e["grupo_id"] == id:
                e["grupo_id"] = None

    # ------------------------------------------------------------- estudiantes
    def listar_estudiantes(self, grupo_id: Optional[int] = None) -> list[dict]:
        nombres = {g["id"]: g["nombre"] for g in self.grupos}
        return [{**e, "nombre_grupo": nombres.get(e["grupo_id"])} for e in self.estudiantes
                if grupo_id is None or e["grupo_id"] == grupo_id]

    def _validar_estudiante(self, d: dict, id: Optional[int] = None) -> None:
        # Imita las restricciones de la tabla: documento UNIQUE y grupo_id FK.
        if any(e["documento"] == d["documento"] and e["id"] != id for e in self.estudiantes):
            raise DatoDuplicado()
        if d.get("grupo_id") is not None and self._buscar(self.grupos, d["grupo_id"]) is None:
            raise ReferenciaInexistente()

    def crear_estudiante(self, d: dict) -> dict:
        self._validar_estudiante(d)
        return self._nuevo(self.estudiantes, d)

    def actualizar_estudiante(self, id: int, d: dict) -> Optional[dict]:
        if self._buscar(self.estudiantes, id) is None:
            return None
        self._validar_estudiante(d, id)
        return self._actualizar(self.estudiantes, id, d)

    def eliminar_estudiante(self, id: int) -> bool:
        return self._eliminar(self.estudiantes, id)

    # ---------------------------------------------------------------- materias
    def listar_materias(self) -> list[dict]:
        return [dict(m) for m in self.materias]

    def crear_materia(self, d: dict) -> dict:
        return self._nuevo(self.materias, d)

    def actualizar_materia(self, id: int, d: dict) -> Optional[dict]:
        return self._actualizar(self.materias, id, d)

    def eliminar_materia(self, id: int) -> None:
        if any(r["materia_id"] == id for r in self.actividades + self.calificaciones + self.asignaciones):
            raise RegistroRelacionado()
        self._eliminar(self.materias, id)

    # ------------------------------------------------------------- actividades
    def listar_actividades(self, grupo_id: Optional[int] = None) -> list[dict]:
        materias = {m["id"]: m["nombre"] for m in self.materias}
        grupos = {g["id"]: g["nombre"] for g in self.grupos}
        hoy = datetime.utcnow().date().isoformat()
        filas = [{
            **a, "materia_nombre": materias.get(a["materia_id"]), "grupo_nombre": grupos.get(a["grupo_id"]),
            "estado": "vencida" if a.get("fecha_entrega") and a["fecha_entrega"] < hoy else "pendiente",
        } for a in self.actividades if grupo_id is None or a["grupo_id"] == grupo_id]
        return sorted(filas, key=lambda a: a.get("fecha_entrega") or "")

    def crear_actividad(self, d: dict) -> dict:
        return self._nuevo(self.actividades, d)

    def actualizar_actividad(self, id: int, d: dict) -> Optional[dict]:
        return self._actualizar(self.actividades, id, d)

    def eliminar_actividad(self, id: int) -> bool:
        return self._eliminar(self.actividades, id)

    # ---------------------------------------------------------- calificaciones
    def listar_calificaciones(self, actividad_id: Optional[int] = None) -> list[dict]:
        estudiantes = {e["id"]: e for e in self.estudiantes}
        materias = {m["id"]: m["nombre"] for m in self.materias}
        return [{
            **c,
            "estudiante_nombre": estudiantes.get(c["estudiante_id"], {}).get("nombre"),
            "estudiante_apellido": estudiantes.get(c["estudiante_id"], {}).get("apellido"),
            "materia_nombre": materias.get(c["materia_id"]),
        } for c in reversed(self.calificaciones) if actividad_id is None or c["actividad_id"] == actividad_id]

    def crear_calificacion(self, d: dict) -> dict:
        return self._nuevo(self.calificaciones, {**d, "fecha_registro": datetime(2026, 3, 1)})

    def actualizar_calificacion(self, id: int, d: dict) -> Optional[dict]:
        return self._actualizar(self.calificaciones, id, d)

    def eliminar_calificacion(self, id: int) -> bool:
        return self._eliminar(self.calificaciones, id)

    def promedio_de_estudiante(self, estudiante_id: int) -> Optional[float]:
        notas = [c["nota"] for c in self.calificaciones if c["estudiante_id"] == estudiante_id]
        return sum(notas) / len(notas) if notas else None

    def tiene_alerta_bajo_promedio_activa(self, estudiante_id: int) -> bool:
        return any(a["estudiante_id"] == estudiante_id and a["tipo"] == "low_grade"
                   and a["estado"] in ("active", "Pendiente") for a in self.alertas)

    # ----------------------------------------------------------- observaciones
    def listar_observaciones(self) -> list[dict]:
        return [dict(o) for o in self.observaciones]

    def crear_observacion(self, d: dict) -> dict:
        return self._nuevo(self.observaciones, d)

    def eliminar_observacion(self, id: int) -> bool:
        return self._eliminar(self.observaciones, id)

    # ----------------------------------------------------------------- alertas
    def listar_alertas(self) -> list[dict]:
        return [dict(a) for a in self.alertas]

    def crear_alerta(self, d: dict) -> dict:
        return self._nuevo(self.alertas, d)

    def actualizar_estado_alerta(self, id: int, estado: str) -> Optional[dict]:
        return self._actualizar(self.alertas, id, {"estado": estado})

    def eliminar_alerta(self, id: int) -> bool:
        return self._eliminar(self.alertas, id)

    # ------------------------------------------------------------ asignaciones
    def listar_asignaciones(self) -> list[dict]:
        return [dict(a) for a in self.asignaciones]

    def es_docente_activo(self, usuario_id: int) -> bool:
        u = self._buscar(self.usuarios, usuario_id)
        return u is not None and u["activo"] and self._nombre_rol(u["rol_id"]) == "Docente"

    def existe_asignacion(self, materia_id: int, grupo_id: int) -> bool:
        return any(a["materia_id"] == materia_id and a["grupo_id"] == grupo_id for a in self.asignaciones)

    def crear_asignacion(self, d: dict) -> dict:
        return self._nuevo(self.asignaciones, d)

    def eliminar_asignacion(self, id: int) -> bool:
        return self._eliminar(self.asignaciones, id)
