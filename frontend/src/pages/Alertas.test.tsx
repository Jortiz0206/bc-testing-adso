// Rol Front (Jan Janos, S5): la página de Alertas con el cliente HTTP real y MSW.
import { describe, it, expect } from "vitest";
import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import Alertas from "./Alertas";
import { API, server, usarMsw } from "@/test/msw";
import { docenteDePrueba, renderWithProviders } from "@/test/render";

usarMsw();

const hoy = new Date().toISOString();
const alertas = [
  { id: 1, estudiante_nombre: "Ana", estudiante_apellido: "Ruiz", tipo: "low_grade", mensaje: "Promedio académico bajo: 2.50", estado: "active", fecha_creacion: hoy },
  { id: 2, estudiante_nombre: "Beto", estudiante_apellido: "Gil", tipo: "Inasistencia", mensaje: "Faltó tres días", estado: "reviewed", fecha_creacion: hoy },
  { id: 3, estudiante_nombre: "Caro", estudiante_apellido: "Díaz", tipo: "Seguimiento", mensaje: "Ya mejoró", estado: "resolved", fecha_creacion: hoy },
];

function servirAlertas(lista: unknown[] = alertas) {
  server.use(http.get(`${API}/alertas`, () => HttpResponse.json(lista)));
}

function renderAlertas() {
  return renderWithProviders(<Alertas />, { ruta: "/app/alertas", usuario: docenteDePrueba });
}

describe("Alertas (con MSW)", () => {
  it("cuenta las alertas por estado y muestra la categoría según el tipo", async () => {
    servirAlertas();
    renderAlertas();

    expect(await screen.findByText("Ana Ruiz")).toBeInTheDocument();
    expect(screen.getByText("Alertas Activas").previousSibling).toHaveTextContent("1");
    expect(screen.getByText("En Revisión").previousSibling).toHaveTextContent("1");
    expect(screen.getByText("Resueltas", { selector: "p" }).previousSibling).toHaveTextContent("1");
    expect(screen.getByText("3 alertas")).toBeInTheDocument();
    expect(screen.getAllByText("Hoy")).toHaveLength(3);
  });

  it("filtra por tipo y por estado", async () => {
    servirAlertas();
    const { user } = renderAlertas();
    await screen.findByText("Ana Ruiz");

    await user.selectOptions(screen.getByRole("combobox", { name: "Filtrar por tipo" }), "attendance");
    expect(screen.getByText("Beto Gil")).toBeInTheDocument();
    expect(screen.queryByText("Ana Ruiz")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "Filtrar por estado" }), "active");
    expect(screen.getByText("No hay alertas con los filtros seleccionados")).toBeInTheDocument();
  });

  it("resolver una alerta envía el nuevo estado al API y actualiza la lista", async () => {
    servirAlertas();
    let cuerpo: unknown;
    server.use(http.put(`${API}/alertas/1/estado`, async ({ request }) => {
      cuerpo = await request.json();
      return HttpResponse.json({ id: 1, estado: "resolved" });
    }));
    const { user } = renderAlertas();

    await user.click(await screen.findByText("Ana Ruiz"));
    const dialogo = screen.getByRole("dialog", { name: "Detalle de Alerta" });
    expect(within(dialogo).getByText("Calificación baja")).toBeInTheDocument();
    await user.click(within(dialogo).getByRole("button", { name: "Resolver" }));

    expect(await screen.findByText("Alerta actualizada")).toBeInTheDocument();
    expect(cuerpo).toEqual({ estado: "resolved" });
    expect(screen.getByText("Resueltas", { selector: "p" }).previousSibling).toHaveTextContent("2");
  });

  it("si el API rechaza el cambio de estado muestra su mensaje", async () => {
    servirAlertas();
    server.use(http.put(`${API}/alertas/2/estado`, () => HttpResponse.json({ detail: "Alerta no encontrada" }, { status: 404 })));
    const { user } = renderAlertas();

    await user.click(await screen.findByText("Beto Gil"));
    await user.click(screen.getByRole("button", { name: "Resolver" }));

    expect(await screen.findByText("Alerta no encontrada")).toBeInTheDocument();
  });

  it("con el API caído muestra el error y la lista vacía", async () => {
    server.use(http.get(`${API}/alertas`, () => HttpResponse.json({ detail: "Error interno del servidor" }, { status: 500 })));
    renderAlertas();

    expect(await screen.findByText("Error interno del servidor")).toBeInTheDocument();
    expect(screen.getByText("No hay alertas con los filtros seleccionados")).toBeInTheDocument();
  });
});
