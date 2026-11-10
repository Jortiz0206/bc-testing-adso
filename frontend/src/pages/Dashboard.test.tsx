// Rol Front (Jan Janos, S8): ramas sin cubrir del reporte de cobertura del CI
// en el panel del docente (Dashboard, AlertsPanel, PerformanceChart, RecentStudents).
import { describe, it, expect } from "vitest";
import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import Dashboard from "./Dashboard";
import reales from "@/test/respuestas-reales.json";
import { API, server, usarMsw } from "@/test/msw";
import { docenteDePrueba, renderWithProviders } from "@/test/render";

usarMsw();

const hoy = new Date().toISOString();
const alertas = [
  { id: 1, estudiante_id: 1, estudiante_nombre: "Sofía", estudiante_apellido: "Gómez", tipo: "Bajo Rendimiento", mensaje: "Promedio bajo", estado: "active", fecha_creacion: hoy },
  { id: 2, estudiante_id: 2, estudiante_nombre: "Mateo", estudiante_apellido: "Rodríguez", tipo: "Seguimiento", mensaje: "Ya mejoró", estado: "resolved", fecha_creacion: hoy },
];
const materias = [{ id: 1, nombre: "Matemáticas" }, { id: 2, nombre: "Español y Literatura" }, { id: 3, nombre: "Sin notas" }];

function servir(sobrescribir: Record<string, unknown> = {}) {
  const tabla: Record<string, unknown> = {
    grupos: reales.grupos, estudiantes: reales.estudiantes, actividades: reales.actividades,
    alertas, materias, calificaciones: reales.calificaciones, ...sobrescribir,
  };
  server.use(http.get(`${API}/:recurso`, ({ params }) => {
    const valor = tabla[String(params.recurso)];
    return valor instanceof Response ? valor : HttpResponse.json(valor);
  }));
}

function renderDashboard() {
  return renderWithProviders(<Dashboard />, { ruta: "/app", usuario: docenteDePrueba });
}

describe("Dashboard (con MSW)", () => {
  it("saluda al docente y resume grupos, estudiantes, actividades y alertas", async () => {
    servir();
    renderDashboard();

    expect(screen.getByRole("heading", { name: "Hola, Laura." })).toBeInTheDocument();
    const tarjeta = (await screen.findByText("Total Grupos")).parentElement!;
    expect(within(tarjeta).getByText("1")).toBeInTheDocument();
  });

  it("el panel de alertas cuenta solo las activas (antes contaba también las resueltas)", async () => {
    servir();
    renderDashboard();

    const panel = (await screen.findByRole("heading", { name: "Alertas Tempranas" })).closest("div")!.parentElement!;
    expect(await within(panel).findByText("1 activas")).toBeInTheDocument();
    expect(within(panel).getByText("Sofía Gómez")).toBeInTheDocument();
    expect(within(panel).queryByText("Mateo Rodríguez")).not.toBeInTheDocument();
  });

  it("sin alertas ni notas, los paneles lo dicen en vez de quedar vacíos", async () => {
    servir({ alertas: [], calificaciones: [] });
    renderDashboard();

    expect(await screen.findByText("Sin alertas activas")).toBeInTheDocument();
    expect(await screen.findByText("Sin datos de calificaciones por materia")).toBeInTheDocument();
  });

  it("'Ver todos' de estudiantes destacados lleva a /app/estudiantes (antes a una ruta 404)", async () => {
    servir();
    const { user } = renderDashboard();

    await user.click(await screen.findByRole("button", { name: "Ver todos" }));

    expect(await screen.findByText("Navegó a /app/estudiantes")).toBeInTheDocument();
  });

  it("al tocar un estudiante destacado abre la lista filtrada por su nombre", async () => {
    servir();
    const { user } = renderDashboard();

    await user.click(await screen.findByText("Sofía Gómez", { selector: "p.text-sm.font-medium" }));

    expect(await screen.findByText(/Navegó a \/app\/estudiantes\?buscar=Sof/)).toBeInTheDocument();
  });

  it("el buscador del encabezado lleva a la lista de estudiantes con la búsqueda", async () => {
    servir();
    const { user } = renderDashboard();

    await user.type(screen.getByRole("textbox", { name: "Buscar estudiante" }), "Mateo{Enter}");

    expect(await screen.findByText("Navegó a /app/estudiantes?buscar=Mateo")).toBeInTheDocument();
  });

  it("si el API falla muestra el error de las estadísticas y los paneles no se rompen", async () => {
    server.use(http.get(`${API}/:recurso`, () => HttpResponse.json({ detail: "Error interno del servidor" }, { status: 500 })));
    renderDashboard();

    expect(await screen.findByText("Error al cargar las estadísticas del dashboard")).toBeInTheDocument();
    expect(await screen.findByText("Sin estudiantes registrados")).toBeInTheDocument();
  });
});
