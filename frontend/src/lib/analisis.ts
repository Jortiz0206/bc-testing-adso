// Cálculos de la página de Análisis (antes vivían dentro del useEffect de la página).
import {
  nivelRendimiento,
  notaAPorcentaje,
  promedio,
  tendenciaPorPeriodo,
  type NotaRegistrada,
  type Tendencia,
} from "./rendimiento";

type Id = number | string;

export interface GrupoApi { id: Id; nombre?: string }
export interface EstudianteApi { id: Id; nombre?: string; apellido?: string; grupo_id?: Id | null }
export interface CalificacionApi extends NotaRegistrada {
  estudiante_id: Id;
  actividad_id?: Id | null;
  periodo?: number | null;
  fecha_registro?: string | null;
  created_at?: string | null;
  fecha?: string | null;
}
export interface ActividadApi { id: Id; tipo?: string | null }

export interface GrupoRendimiento { grupo: string; promedio: number; estudiantes: number }
export interface TendenciaItem { mes: string; promedio: number }
export interface Distribucion { excelente: number; bueno: number; regular: number; enRiesgo: number }
export interface EstudianteRiesgo { nombre: string; apellido: string; grupo: string; promedio: number; tendencia: Tendencia }
export interface TipoRendimiento { tipo: string; promedio: number }

export interface ResultadoAnalisis {
  totalEstudiantes: number;
  promedioGeneral: number;
  rendimientoPorGrupo: GrupoRendimiento[];
  distribucion: Distribucion;
  estudiantesEnRiesgo: EstudianteRiesgo[];
  tendenciaMensual: TendenciaItem[];
  mejoraMensual: number;
  rendimientoPorTipo: TipoRendimiento[];
}

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const redondear = (valor: number) => Math.round(valor);

/** Etiqueta "Mes AA" de un año y mes (0-11). */
export function etiquetaMes(anio: number, mes: number): string {
  return `${MESES[mes]} ${String(anio).slice(2)}`;
}

export function calcularAnalisis(datos: {
  grupos: GrupoApi[];
  estudiantes: EstudianteApi[];
  calificaciones: CalificacionApi[];
  actividades: ActividadApi[];
}): ResultadoAnalisis {
  const { grupos, estudiantes, calificaciones, actividades } = datos;

  const grupoDeEstudiante = new Map(estudiantes.map((e) => [String(e.id), String(e.grupo_id)]));
  const nombreDeGrupo = new Map(grupos.map((g) => [String(g.id), String(g.nombre)]));
  const tipoDeActividad = new Map(actividades.map((a) => [String(a.id), String(a.tipo || "tarea")]));

  // --- Rendimiento por grupo ---
  const notasPorGrupo = new Map<string, number[]>();
  const estudiantesPorGrupo = new Map<string, number>();
  estudiantes.forEach((e) => {
    const gId = String(e.grupo_id);
    estudiantesPorGrupo.set(gId, (estudiantesPorGrupo.get(gId) || 0) + 1);
  });
  calificaciones.forEach((c) => {
    const gId = grupoDeEstudiante.get(String(c.estudiante_id));
    if (!gId) return;
    if (!notasPorGrupo.has(gId)) notasPorGrupo.set(gId, []);
    notasPorGrupo.get(gId)!.push(notaAPorcentaje(c));
  });
  const rendimientoPorGrupo = grupos
    .map((g) => ({
      grupo: String(g.nombre || ""),
      promedio: redondear(promedio(notasPorGrupo.get(String(g.id)) || []) ?? 0),
      estudiantes: estudiantesPorGrupo.get(String(g.id)) || 0,
    }))
    .sort((a, b) => a.grupo.localeCompare(b.grupo));

  // --- Promedio general (un decimal) ---
  const todas = calificaciones.map(notaAPorcentaje);
  const promedioGeneral = Math.round((promedio(todas) ?? 0) * 10) / 10;

  // --- Por estudiante: distribución, riesgo y tendencia ---
  const notasPorEstudiante = new Map<string, { valor: number; periodo: number }[]>();
  calificaciones.forEach((c) => {
    const id = String(c.estudiante_id);
    if (!notasPorEstudiante.has(id)) notasPorEstudiante.set(id, []);
    notasPorEstudiante.get(id)!.push({ valor: notaAPorcentaje(c), periodo: Number(c.periodo || 1) });
  });

  const distribucion: Distribucion = { excelente: 0, bueno: 0, regular: 0, enRiesgo: 0 };
  const estudiantesEnRiesgo: EstudianteRiesgo[] = [];
  estudiantes.forEach((e) => {
    const notas = notasPorEstudiante.get(String(e.id)) || [];
    const prom = promedio(notas.map((n) => n.valor));
    if (prom === null) return; // sin notas: no se clasifica
    const nivel = nivelRendimiento(prom);
    if (nivel === "excelente") distribucion.excelente++;
    else if (nivel === "bueno") distribucion.bueno++;
    else if (nivel === "regular") distribucion.regular++;
    else distribucion.enRiesgo++;

    const promRedondeado = redondear(prom);
    if (promRedondeado < 70) {
      estudiantesEnRiesgo.push({
        nombre: String(e.nombre || ""),
        apellido: String(e.apellido || ""),
        grupo: nombreDeGrupo.get(String(e.grupo_id)) || "",
        promedio: promRedondeado,
        tendencia: tendenciaPorPeriodo(notas),
      });
    }
  });
  estudiantesEnRiesgo.sort((a, b) => a.promedio - b.promedio);

  // --- Tendencia mensual ---
  // La clave guarda año y mes (0-11) de la fecha local del registro. La etiqueta
  // se arma con esos mismos números: antes se reconstruía con new Date("AAAA-MM-01"),
  // que se interpreta en UTC y en Colombia (UTC-5) mostraba el mes anterior.
  const notasPorMes = new Map<string, { anio: number; mes: number; valores: number[] }>();
  calificaciones.forEach((c) => {
    const valorFecha = c.fecha_registro || c.created_at || c.fecha;
    if (!valorFecha) return;
    const fecha = new Date(valorFecha);
    if (Number.isNaN(fecha.getTime())) return;
    const anio = fecha.getFullYear();
    const mes = fecha.getMonth();
    const clave = `${anio}-${String(mes).padStart(2, "0")}`;
    if (!notasPorMes.has(clave)) notasPorMes.set(clave, { anio, mes, valores: [] });
    notasPorMes.get(clave)!.valores.push(notaAPorcentaje(c));
  });
  const tendenciaMensual = Array.from(notasPorMes.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, { anio, mes, valores }]) => ({
      mes: etiquetaMes(anio, mes),
      promedio: redondear(promedio(valores) as number),
    }));

  let mejoraMensual = 0;
  if (tendenciaMensual.length >= 2) {
    const ultimo = tendenciaMensual[tendenciaMensual.length - 1].promedio;
    const anterior = tendenciaMensual[tendenciaMensual.length - 2].promedio;
    mejoraMensual = Math.round((ultimo - anterior) * 10) / 10;
  }

  // --- Rendimiento por tipo de actividad ---
  const notasPorTipo = new Map<string, number[]>();
  calificaciones.forEach((c) => {
    const tipo = tipoDeActividad.get(String(c.actividad_id));
    if (!tipo) return;
    if (!notasPorTipo.has(tipo)) notasPorTipo.set(tipo, []);
    notasPorTipo.get(tipo)!.push(notaAPorcentaje(c));
  });
  const rendimientoPorTipo = Array.from(notasPorTipo.entries())
    .map(([tipo, valores]) => ({
      tipo: tipo.charAt(0).toUpperCase() + tipo.slice(1),
      promedio: redondear(promedio(valores) as number),
    }))
    .sort((a, b) => b.promedio - a.promedio);

  return {
    totalEstudiantes: estudiantes.length,
    promedioGeneral,
    rendimientoPorGrupo,
    distribucion,
    estudiantesEnRiesgo,
    tendenciaMensual,
    mejoraMensual,
    rendimientoPorTipo,
  };
}
