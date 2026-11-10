import { describe, it, expect } from "vitest";
import { construirFilas, payloadCalificacion, resumenCalificaciones, type CalificacionRow } from "./calificaciones";

describe("construirFilas", () => {
  const estudiantes = [
    { id: 1, nombre: "Ana", apellido: "Zapata", grupo_id: 5 },
    { id: 2, nombre: "Beto", apellido: "Arango", grupo_id: 5 },
    { id: 3, nombre: "Caro", apellido: "Mejía", grupo_id: 6 }, // otro grupo
  ];

  it("arma una fila por estudiante del grupo, ordenada por apellido", () => {
    const filas = construirFilas({ estudiantes, calificaciones: [], grupoId: "5", actividadId: "9" });

    expect(filas.map((f) => f.apellido)).toEqual(["Arango", "Zapata"]);
    expect(filas.every((f) => f.calificacion === 0 && !f.entregado && f.id === undefined)).toBe(true);
  });

  it("solo toma la nota de la actividad seleccionada, no la de otra actividad de la misma materia", () => {
    const calificaciones = [
      { id: 50, estudiante_id: 1, actividad_id: 8, nota: 1 }, // otra actividad
      { id: 51, estudiante_id: 1, actividad_id: 9, nota: 4 },
    ];

    const filas = construirFilas({ estudiantes, calificaciones, grupoId: "5", actividadId: "9" });
    const ana = filas.find((f) => f.nombre === "Ana")!;

    expect(ana).toMatchObject({ calificacion: 80, entregado: true, id: "51" });
  });
});

describe("resumenCalificaciones", () => {
  const fila = (calificacion: number, entregado: boolean): CalificacionRow => ({
    estudiante_id: "1", nombre: "", apellido: "", calificacion, entregado,
  });

  it("sin filas el resumen queda en cero", () => {
    expect(resumenCalificaciones([])).toEqual({ promedio: 0, entregados: 0, aprobados: 0 });
  });

  it("cuenta como aprobado desde 70 y redondea el promedio", () => {
    const r = resumenCalificaciones([fila(70, true), fila(69, true), fila(100, false)]);
    expect(r).toEqual({ promedio: 80, entregados: 2, aprobados: 2 });
  });
});

describe("payloadCalificacion", () => {
  it("convierte el porcentaje a nota y marca la observación solo si se entregó", () => {
    const fila: CalificacionRow = { estudiante_id: "7", nombre: "Ana", apellido: "Ruiz", calificacion: 61, entregado: true };

    expect(payloadCalificacion(fila, 3, 9)).toEqual({
      estudiante_id: "7",
      materia_id: 3,
      actividad_id: 9,
      nota: 3.1,
      observacion: "Actividad entregada",
    });
    expect(payloadCalificacion({ ...fila, entregado: false }, 3, 9).observacion).toBeNull();
  });
});
