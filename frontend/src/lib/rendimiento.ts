// Reglas de rendimiento académico de ClassKids.
//
// En la BD las notas van de 0.0 a 5.0 (columna `calificaciones.nota`), pero la
// interfaz trabaja en porcentaje (0 a 100): 1 punto de nota = 20 %.
// Estas funciones eran cálculos repetidos dentro de las páginas (Análisis,
// Estudiantes y Calificaciones); se extrajeron aquí para probarlas sin interfaz.

export const PUNTOS_POR_NOTA = 20;
export const PORCENTAJE_APROBATORIO = 70;
/** Diferencia mínima (en puntos porcentuales) entre periodos para hablar de tendencia. */
export const MARGEN_TENDENCIA = 2;

export interface NotaRegistrada {
  calificacion?: number | string | null;
  nota?: number | string | null;
}

export type NivelRendimiento = "excelente" | "bueno" | "regular" | "en riesgo";
export type Tendencia = "up" | "down" | "estable";
export type EstadoEstudiante = "activo" | "en riesgo" | "crítico";

/** Convierte una calificación del API a porcentaje. Si ya viene en porcentaje (`calificacion`), se respeta. */
export function notaAPorcentaje(registro: NotaRegistrada): number {
  if (registro.calificacion !== undefined && registro.calificacion !== null) {
    return Number(registro.calificacion);
  }
  return Number(registro.nota || 0) * PUNTOS_POR_NOTA;
}

/**
 * Convierte un porcentaje de la interfaz a la nota de 0.0 a 5.0 que guarda la BD
 * (un decimal, redondeo hacia arriba en el medio: 61 % → 3.05 → 3.1).
 * Antes se usaba `(p / 20).toFixed(1)`, que por la representación binaria de los
 * decimales redondeaba 59 % (2.95) hacia arriba a 3.0 pero 61 % (3.05) hacia
 * abajo a 3.0: el mismo caso de borde daba resultados distintos.
 */
export function porcentajeANota(porcentaje: number): number {
  return Math.round((porcentaje * 10) / PUNTOS_POR_NOTA) / 10;
}

/** Mantiene un porcentaje digitado dentro del rango válido 0..100. */
export function limitarPorcentaje(valor: number): number {
  if (Number.isNaN(valor)) return 0;
  return Math.min(100, Math.max(0, valor));
}

/** Promedio aritmético; `null` si no hay valores (no es lo mismo que promedio 0). */
export function promedio(valores: number[]): number | null {
  if (valores.length === 0) return null;
  return valores.reduce((suma, v) => suma + v, 0) / valores.length;
}

/** Nivel de rendimiento de un promedio en porcentaje. */
export function nivelRendimiento(porcentaje: number): NivelRendimiento {
  if (porcentaje >= 90) return "excelente";
  if (porcentaje >= 80) return "bueno";
  if (porcentaje >= PORCENTAJE_APROBATORIO) return "regular";
  return "en riesgo";
}

export function aprobo(porcentaje: number): boolean {
  return porcentaje >= PORCENTAJE_APROBATORIO;
}

/**
 * Compara el promedio del primer y del último periodo con notas.
 * Con un solo periodo no hay tendencia.
 */
export function tendenciaPorPeriodo(
  notas: { valor: number; periodo: number }[],
  margen: number = MARGEN_TENDENCIA,
): Tendencia {
  const periodos = Array.from(new Set(notas.map((n) => n.periodo))).sort((a, b) => a - b);
  if (periodos.length < 2) return "estable";
  const promedioDe = (p: number) => promedio(notas.filter((n) => n.periodo === p).map((n) => n.valor)) as number;
  const primero = promedioDe(periodos[0]);
  const ultimo = promedioDe(periodos[periodos.length - 1]);
  if (ultimo > primero + margen) return "up";
  if (ultimo < primero - margen) return "down";
  return "estable";
}

/** Una alerta deja de contar cuando se resuelve (el API usa "resolved"; datos viejos, "Resuelta"). */
export function esAlertaActiva(alerta: { estado?: string | null }): boolean {
  const estado = String(alerta.estado || "");
  return estado.toLowerCase() !== "resolved" && estado !== "Resuelta";
}

/**
 * Estado de seguimiento de un estudiante:
 * crítico si tiene alertas activas y promedio < 60; en riesgo si tiene alertas
 * o promedio < 70; activo en otro caso.
 */
export function estadoEstudiante(promedioPorcentaje: number, alertasActivas: number): EstadoEstudiante {
  if (alertasActivas > 0 && promedioPorcentaje < 60) return "crítico";
  if (alertasActivas > 0 || promedioPorcentaje < PORCENTAJE_APROBATORIO) return "en riesgo";
  return "activo";
}
