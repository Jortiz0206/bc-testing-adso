// Rol Front (Jan Janos, S5): la página de Grupos con el cliente HTTP real y MSW.
import { describe, it, expect } from "vitest";
import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import Grupos from "./Grupos";
import { API, server, usarMsw } from "@/test/msw";
import { docenteDePrueba, renderWithProviders } from "@/test/render";

usarMsw();

const datos = {
  grupos: [
    { id: 1, nombre: "Grado 1A", grado: "1°", turno: "Matutino" },
    { id: 2, nombre: "Grado 2B", grado: "2°", turno: "Vespertino" },
  ],
  estudiantes: [{ id: 10, grupo_id: 1 }, { id: 11, grupo_id: 1 }, { id: 12, grupo_id: 2 }],
  actividades: [{ id: 100, grupo_id: 1 }],
  alertas: [{ estudiante_id: 10, estado: "active" }, { estudiante_id: 11, estado: "resolved" }],
  calificaciones: [{ estudiante_id: 10, nota: 4.5 }, { estudiante_id: 11, nota: 3.5 }, { estudiante_id: 12, nota: 2 }],
};

function servirDatos() {
  server.use(
    ...Object.entries(datos).map(([recurso, lista]) => http.get(`${API}/${recurso}`, () => HttpResponse.json(lista))),
  );
}

function tarjeta(nombre: string) {
  return screen.getByText(nombre).closest(".group") as HTMLElement;
}

function renderGrupos() {
  return renderWithProviders(<Grupos />, { ruta: "/app/grupos", usuario: docenteDePrueba });
}

describe("Grupos (con MSW)", () => {
  it("resume cada grupo con estudiantes, actividades, alertas activas y promedio", async () => {
    servirDatos();
    renderGrupos();

    await screen.findByText("Grado 1A");
    const primero = within(tarjeta("Grado 1A"));
    expect(primero.getByText("80%")).toBeInTheDocument(); // (90 + 70) / 2
    expect(primero.getByText("1 alertas")).toBeInTheDocument();
    expect(primero.getByText("Bueno")).toBeInTheDocument();
    expect(within(tarjeta("Grado 2B")).getByText("En riesgo")).toBeInTheDocument();
  });

  it("busca y filtra por turno", async () => {
    servirDatos();
    const { user } = renderGrupos();
    await screen.findByText("Grado 1A");

    await user.type(screen.getByRole("textbox", { name: "Buscar grupo" }), "2b");
    expect(screen.queryByText("Grado 1A")).not.toBeInTheDocument();

    await user.clear(screen.getByRole("textbox", { name: "Buscar grupo" }));
    await user.click(screen.getByRole("combobox", { name: "Filtrar por turno" }));
    await user.click(await screen.findByRole("option", { name: "Matutino" }));
    expect(screen.getByText("Grado 1A")).toBeInTheDocument();
    expect(screen.queryByText("Grado 2B")).not.toBeInTheDocument();
  });

  it("crea un grupo a partir del curso y el turno elegidos", async () => {
    servirDatos();
    let cuerpo: unknown;
    server.use(http.post(`${API}/grupos`, async ({ request }) => {
      cuerpo = await request.json();
      return HttpResponse.json({ id: 3 }, { status: 201 });
    }));
    const { user } = renderGrupos();

    await user.click(await screen.findByRole("button", { name: "Nuevo Grupo" }));
    const dialogo = screen.getByRole("dialog", { name: "Crear nuevo grupo" });
    await user.click(within(dialogo).getByRole("combobox", { name: "Curso" }));
    await user.click(await screen.findByRole("option", { name: "3°B" }));
    await user.click(within(dialogo).getByRole("combobox", { name: "Turno" }));
    await user.click(await screen.findByRole("option", { name: "Vespertino" }));
    await user.click(within(dialogo).getByRole("button", { name: "Crear grupo" }));

    expect(await screen.findByText("Grupo creado")).toBeInTheDocument();
    expect(cuerpo).toEqual({ nombre: "Grado 3B", grado: "3°", turno: "Vespertino" });
  });

  it("no crea el grupo si falta el turno", async () => {
    servirDatos();
    const { user } = renderGrupos();

    await user.click(await screen.findByRole("button", { name: "Nuevo Grupo" }));
    await user.click(screen.getByRole("button", { name: "Crear grupo" }));

    expect(await screen.findByText("Completa todos los campos")).toBeInTheDocument();
  });

  it("si el API falla al cargar muestra el error y ningún grupo", async () => {
    server.use(http.get(`${API}/:recurso`, () => HttpResponse.json({ detail: "Error interno del servidor" }, { status: 500 })));
    renderGrupos();

    expect(await screen.findByText("Error cargando grupos")).toBeInTheDocument();
    expect(screen.getByText("No se encontraron grupos")).toBeInTheDocument();
  });
});
