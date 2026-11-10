// Reglas de la página de Estudiantes: vista enriquecida, filtros y validación del formulario.
import {
  esAlertaActiva,
  estadoEstudiante,
  notaAPorcentaje,
  promedio,
  tendenciaPorPeriodo,
  type EstadoEstudiante,
  type NotaRegistrada,
  type Tendencia,
} from "./rendimiento";

type Id = number | string;

export interface EstudianteView {
  id: string;
  documento: string;
  nombre: string;
  apellido: string;
  grupo_id: string;
  grupo_nombre: string;
  tendencia: Tendencia;
  estado: EstadoEstudiante;
  promedio: number;
  alertas: number;
}

export function enriquecerEstudiantes(datos: {
  estudiantes: { id: Id; documento?: string; nombre?: string; apellido?: string; grupo_id?: Id | null }[];
  calificaciones: (NotaRegistrada & { estudiante_id: Id; periodo?: number | null })[];
  alertas: { estudiante_id: Id; estado?: string | null }[];
  grupos: { id: Id; nombre?: string }[];
}): EstudianteView[] {
  const nombreDeGrupo = new Map(datos.grupos.map((g) => [String(g.id), String(g.nombre ?? "")]));

  return datos.estudiantes.map((e) => {
    const notas = datos.calificaciones
      .filter((c) => String(c.estudiante_id) === String(e.id))
      .map((c) => ({ valor: notaAPorcentaje(c), periodo: Number(c.periodo || 1) }));
    // Sin notas el promedio se muestra como 0 (comportamiento original de la página).
    const prom = Math.round(promedio(notas.map((n) => n.valor)) ?? 0);
    const alertasActivas = datos.alertas.filter(
      (a) => String(a.estudiante_id) === String(e.id) && esAlertaActiva(a),
    ).length;

    return {
      id: String(e.id),
      documento: String(e.documento || ""),
      nombre: String(e.nombre || ""),
      apellido: String(e.apellido || ""),
      grupo_id: String(e.grupo_id || ""),
      grupo_nombre: nombreDeGrupo.get(String(e.grupo_id)) || "",
      tendencia: tendenciaPorPeriodo(notas),
      estado: estadoEstudiante(prom, alertasActivas),
      promedio: prom,
      alertas: alertasActivas,
    };
  });
}

export function filtrarEstudiantes(
  estudiantes: EstudianteView[],
  filtro: { busqueda: string; grupo: string; estado: string },
): EstudianteView[] {
  const texto = filtro.busqueda.trim().toLowerCase();
  return estudiantes.filter((e) => {
    const coincideTexto = `${e.nombre} ${e.apellido}`.toLowerCase().includes(texto);
    const coincideGrupo = filtro.grupo === "todos" || e.grupo_id === filtro.grupo;
    const coincideEstado = filtro.estado === "todos" || e.estado === filtro.estado;
    return coincideTexto && coincideGrupo && coincideEstado;
  });
}

/** Devuelve el mensaje de error del formulario, o `null` si se puede guardar. */
export function validarFormularioEstudiante(form: {
  documento: string;
  nombre: string;
  apellido: string;
  // El id del grupo llega como número desde el API (el Select guarda el valor tal cual).
  grupoId: string | number;
}): string | null {
  const campos = [form.documento, form.nombre, form.apellido, form.grupoId];
  if (campos.some((c) => String(c ?? "").trim() === "")) return "Completa todos los campos";
  return null;
}
