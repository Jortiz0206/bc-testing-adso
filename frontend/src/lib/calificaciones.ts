// Reglas de la página de Calificaciones.
import { aprobo, notaAPorcentaje, porcentajeANota, promedio, type NotaRegistrada } from "./rendimiento";

type Id = number | string;

export interface CalificacionRow {
  estudiante_id: string;
  nombre: string;
  apellido: string;
  calificacion: number;
  entregado: boolean;
  id?: string;
}

/**
 * Una fila por estudiante del grupo, ordenada por apellido, con la nota que ya
 * tenga para la actividad seleccionada.
 * Se filtra por `actividad_id` (no por materia): una materia puede tener varias
 * actividades en el mismo grupo y mezclar sus notas reasignaba la nota equivocada.
 */
export function construirFilas(datos: {
  estudiantes: { id: Id; nombre?: string; apellido?: string; grupo_id?: Id | null }[];
  calificaciones: (NotaRegistrada & { id: Id; estudiante_id: Id; actividad_id?: Id | null })[];
  grupoId: string;
  actividadId: string;
}): CalificacionRow[] {
  const delGrupo = datos.estudiantes
    .filter((e) => String(e.grupo_id) === String(datos.grupoId))
    .sort((a, b) => String(a.apellido).localeCompare(String(b.apellido)));

  const notaPorEstudiante = new Map(
    datos.calificaciones
      .filter((c) => String(c.actividad_id) === String(datos.actividadId))
      .map((c) => [String(c.estudiante_id), c]),
  );

  return delGrupo.map((e) => {
    const existente = notaPorEstudiante.get(String(e.id));
    return {
      estudiante_id: String(e.id),
      nombre: String(e.nombre || ""),
      apellido: String(e.apellido || ""),
      calificacion: existente ? notaAPorcentaje(existente) : 0,
      entregado: Boolean(existente),
      id: existente ? String(existente.id) : undefined,
    };
  });
}

export function resumenCalificaciones(filas: CalificacionRow[]) {
  return {
    promedio: Math.round(promedio(filas.map((f) => f.calificacion)) ?? 0),
    entregados: filas.filter((f) => f.entregado).length,
    aprobados: filas.filter((f) => aprobo(f.calificacion)).length,
  };
}

/** Cuerpo que espera `POST/PUT /calificaciones` (nota de 0.0 a 5.0). */
export function payloadCalificacion(fila: CalificacionRow, materiaId: number, actividadId: number) {
  return {
    estudiante_id: fila.estudiante_id,
    materia_id: materiaId,
    actividad_id: actividadId,
    nota: porcentajeANota(fila.calificacion),
    observacion: fila.entregado ? "Actividad entregada" : null,
  };
}
