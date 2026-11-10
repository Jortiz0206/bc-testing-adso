import { describe, it, expect } from "vitest";
import {
  aprobo,
  esAlertaActiva,
  estadoEstudiante,
  limitarPorcentaje,
  nivelRendimiento,
  notaAPorcentaje,
  porcentajeANota,
  promedio,
  tendenciaPorPeriodo,
} from "./rendimiento";

describe("notaAPorcentaje", () => {
  it.each([
    [{ nota: 0 }, 0],
    [{ nota: 3 }, 60],
    [{ nota: "4.5" }, 90],
    [{ nota: 5 }, 100],
    [{ nota: null }, 0],
  ])("convierte la nota %o a %i %%", (registro, esperado) => {
    expect(notaAPorcentaje(registro)).toBe(esperado);
  });

  it("respeta la calificación cuando el API ya la envía en porcentaje", () => {
    expect(notaAPorcentaje({ calificacion: 75, nota: 1 })).toBe(75);
  });
});

describe("porcentajeANota", () => {
  it.each([
    [0, 0],
    [59, 3],
    [61, 3.1],
    [70, 3.5],
    [100, 5],
  ])("convierte %i %% a la nota %d con un decimal", (porcentaje, nota) => {
    expect(porcentajeANota(porcentaje)).toBe(nota);
  });
});

describe("limitarPorcentaje", () => {
  it.each([
    [-1, 0],
    [0, 0],
    [55, 55],
    [100, 100],
    [101, 100],
    [Number.NaN, 0],
  ])("limita %d a %d", (valor, esperado) => {
    expect(limitarPorcentaje(valor)).toBe(esperado);
  });
});

describe("promedio", () => {
  it("devuelve null cuando no hay valores, para no confundirlo con un promedio de 0", () => {
    expect(promedio([])).toBeNull();
  });

  it("calcula el promedio aritmético", () => {
    expect(promedio([60, 70, 95])).toBe(75);
  });
});

describe("nivelRendimiento", () => {
  it.each([
    [100, "excelente"],
    [90, "excelente"],
    [89.9, "bueno"],
    [80, "bueno"],
    [79.9, "regular"],
    [70, "regular"],
    [69.9, "en riesgo"],
    [0, "en riesgo"],
  ])("clasifica %d %% como %s", (porcentaje, nivel) => {
    expect(nivelRendimiento(porcentaje)).toBe(nivel);
  });
});

describe("aprobo", () => {
  it.each([
    [70, true],
    [69.9, false],
  ])("con %d %% devuelve %s (el límite aprobatorio es 70)", (porcentaje, esperado) => {
    expect(aprobo(porcentaje)).toBe(esperado);
  });
});

describe("tendenciaPorPeriodo", () => {
  it("es estable con un solo periodo", () => {
    expect(tendenciaPorPeriodo([{ valor: 40, periodo: 1 }, { valor: 90, periodo: 1 }])).toBe("estable");
  });

  it.each([
    [62.1, "up"],
    [62, "estable"],
    [58, "estable"],
    [57.9, "down"],
  ])("del periodo 1 (60 %%) al último (%d %%) la tendencia es %s", (ultimo, tendencia) => {
    const notas = [
      { valor: 60, periodo: 1 },
      { valor: 10, periodo: 2 },
      { valor: ultimo, periodo: 3 },
    ];
    expect(tendenciaPorPeriodo(notas)).toBe(tendencia);
  });

  it("compara el primer y el último periodo aunque lleguen desordenados", () => {
    const notas = [
      { valor: 90, periodo: 3 },
      { valor: 50, periodo: 1 },
    ];
    expect(tendenciaPorPeriodo(notas)).toBe("up");
  });
});

describe("esAlertaActiva", () => {
  it.each([
    ["active", true],
    ["reviewed", true],
    ["Pendiente", true],
    [undefined, true],
    ["resolved", false],
    ["RESOLVED", false],
    ["Resuelta", false],
  ])("una alerta en estado %s cuenta como activa: %s", (estado, esperado) => {
    expect(esAlertaActiva({ estado })).toBe(esperado);
  });
});

describe("estadoEstudiante", () => {
  it.each([
    [59, 1, "crítico"],
    [60, 1, "en riesgo"],
    [95, 1, "en riesgo"],
    [69, 0, "en riesgo"],
    [70, 0, "activo"],
    [59, 0, "en riesgo"],
  ])("con promedio %i y %i alertas activas queda %s", (prom, alertas, estado) => {
    expect(estadoEstudiante(prom, alertas)).toBe(estado);
  });
});
