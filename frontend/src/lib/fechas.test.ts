import { describe, it, expect } from "vitest";
import { tiempoTranscurrido } from "./fechas";

// Doble del reloj: `ahora` fijo en vez de new Date() (dummy de fecha estable).
const AHORA = new Date("2026-03-10T12:00:00");

describe("tiempoTranscurrido", () => {
  it.each([
    ["2026-03-10T08:00:00", "Hoy"],
    ["2026-03-09T12:00:01", "Hoy"], // 23 h 59 min: todavía no es un día completo
    ["2026-03-09T12:00:00", "Ayer"],
    ["2026-03-04T12:00:00", "Hace 6 días"],
    ["2026-03-03T12:00:00", "Hace 1 semana(s)"],
    ["2026-02-10T12:00:00", "Hace 4 semana(s)"],
  ])("una alerta del %s se muestra como '%s'", (fecha, texto) => {
    expect(tiempoTranscurrido(fecha, AHORA)).toBe(texto);
  });

  it("una fecha unas horas en el futuro (BD en UTC, navegador en UTC-5) se muestra como 'Hoy', no 'Hace -1 días'", () => {
    expect(tiempoTranscurrido("2026-03-10T17:00:00", AHORA)).toBe("Hoy");
  });

  it.each([[""], [null], [undefined], ["no-es-fecha"]])("sin fecha válida (%s) muestra N/A", (fecha) => {
    expect(tiempoTranscurrido(fecha, AHORA)).toBe("N/A");
  });
});
