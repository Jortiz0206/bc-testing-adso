/**
 * Texto relativo para la fecha de una alerta ("Hoy", "Ayer", "Hace 3 días"…).
 * `ahora` es un parámetro (por defecto, el reloj real) para poder probar los
 * límites sin depender del día en que corren los tests.
 */
export function tiempoTranscurrido(fecha: string | null | undefined, ahora: Date = new Date()): string {
  if (!fecha) return "N/A";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "N/A";
  const dias = Math.floor((ahora.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (dias <= 0) return "Hoy";
  if (dias === 1) return "Ayer";
  if (dias < 7) return `Hace ${dias} días`;
  return `Hace ${Math.floor(dias / 7)} semana(s)`;
}
