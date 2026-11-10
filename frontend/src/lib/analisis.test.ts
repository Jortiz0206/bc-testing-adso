import { describe, it, expect } from "vitest";
import { calcularAnalisis, etiquetaMes } from "./analisis";

const grupos = [
  { id: 2, nombre: "Segundo A" },
  { id: 1, nombre: "Primero A" },
];
const estudiantes = [
  { id: 10, nombre: "Ana", apellido: "Ruiz", grupo_id: 1 },
  { id: 11, nombre: "Beto", apellido: "Gil", grupo_id: 1 },
  { id: 12, nombre: "Caro", apellido: "Díaz", grupo_id: 2 },
  { id: 13, nombre: "Dani", apellido: "Paz", grupo_id: 2 }, // sin notas
];
const actividades = [
  { id: 100, tipo: "examen" },
  { id: 101, tipo: null },
];

describe("calcularAnalisis", () => {
  it("devuelve todo en cero cuando no hay datos", () => {
    const r = calcularAnalisis({ grupos: [], estudiantes: [], calificaciones: [], actividades: [] });

    expect(r).toEqual({
      totalEstudiantes: 0,
      promedioGeneral: 0,
      rendimientoPorGrupo: [],
      distribucion: { excelente: 0, bueno: 0, regular: 0, enRiesgo: 0 },
      estudiantesEnRiesgo: [],
      tendenciaMensual: [],
      mejoraMensual: 0,
      rendimientoPorTipo: [],
    });
  });

  it("promedia por grupo en porcentaje y ordena los grupos por nombre", () => {
    const calificaciones = [
      { estudiante_id: 10, nota: 5 }, // 100
      { estudiante_id: 11, nota: 4 }, // 80
      { estudiante_id: 12, nota: 3 }, // 60
    ];

    const r = calcularAnalisis({ grupos, estudiantes, calificaciones, actividades });

    expect(r.rendimientoPorGrupo).toEqual([
      { grupo: "Primero A", promedio: 90, estudiantes: 2 },
      { grupo: "Segundo A", promedio: 60, estudiantes: 2 },
    ]);
    expect(r.promedioGeneral).toBe(80);
  });

  it("clasifica a cada estudiante con notas en un nivel y no cuenta a quien no tiene notas", () => {
    const calificaciones = [
      { estudiante_id: 10, nota: 4.5 }, // 90 excelente (límite)
      { estudiante_id: 11, nota: 3.5 }, // 70 regular (límite)
      { estudiante_id: 12, nota: 3.4 }, // 68 en riesgo
    ];

    const r = calcularAnalisis({ grupos, estudiantes, calificaciones, actividades });

    expect(r.distribucion).toEqual({ excelente: 1, bueno: 0, regular: 1, enRiesgo: 1 });
    expect(r.totalEstudiantes).toBe(4);
  });

  it("lista en riesgo a quien tiene promedio menor a 70, del más bajo al más alto, con su grupo y tendencia", () => {
    const calificaciones = [
      { estudiante_id: 10, nota: 3, periodo: 1 }, // 60
      { estudiante_id: 10, nota: 3.6, periodo: 2 }, // 72 → promedio 66, sube
      { estudiante_id: 12, nota: 2, periodo: 1 }, // 40
      { estudiante_id: 11, nota: 3.5 }, // 70 → no está en riesgo
    ];

    const r = calcularAnalisis({ grupos, estudiantes, calificaciones, actividades });

    expect(r.estudiantesEnRiesgo).toEqual([
      { nombre: "Caro", apellido: "Díaz", grupo: "Segundo A", promedio: 40, tendencia: "estable" },
      { nombre: "Ana", apellido: "Ruiz", grupo: "Primero A", promedio: 66, tendencia: "up" },
    ]);
  });

  it("agrupa por mes en orden cronológico y calcula la mejora del último mes", () => {
    const calificaciones = [
      { estudiante_id: 10, nota: 4, fecha_registro: "2026-03-10T12:00:00" }, // 80
      { estudiante_id: 11, nota: 3, fecha_registro: "2026-02-15T12:00:00" }, // 60
      { estudiante_id: 12, nota: 5, fecha_registro: "2026-03-20T12:00:00" }, // 100
      { estudiante_id: 12, nota: 5, fecha_registro: "fecha-invalida" },
      { estudiante_id: 12, nota: 5 },
    ];

    const r = calcularAnalisis({ grupos, estudiantes, calificaciones, actividades });

    expect(r.tendenciaMensual).toEqual([
      { mes: "Feb 26", promedio: 60 },
      { mes: "Mar 26", promedio: 90 },
    ]);
    expect(r.mejoraMensual).toBe(30);
  });

  it("promedia por tipo de actividad, usa 'tarea' si no tiene tipo e ignora notas sin actividad", () => {
    const calificaciones = [
      { estudiante_id: 10, nota: 2, actividad_id: 100 }, // examen 40
      { estudiante_id: 11, nota: 5, actividad_id: 101 }, // tarea 100
      { estudiante_id: 12, nota: 1 }, // sin actividad
    ];

    const r = calcularAnalisis({ grupos, estudiantes, calificaciones, actividades });

    expect(r.rendimientoPorTipo).toEqual([
      { tipo: "Tarea", promedio: 100 },
      { tipo: "Examen", promedio: 40 },
    ]);
  });
});

describe("etiquetaMes", () => {
  it.each([
    [2026, 0, "Ene 26"],
    [2026, 11, "Dic 26"],
  ])("el mes %i-%i se muestra como %s", (anio, mes, etiqueta) => {
    expect(etiquetaMes(anio, mes)).toBe(etiqueta);
  });
});
