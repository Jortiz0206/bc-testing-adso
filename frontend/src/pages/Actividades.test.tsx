// Rol Front (Johanna Ortiz, S7): Actividades con MSW y datos con la forma real del API.
import { describe, it, expect } from "vitest";
import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import Actividades from "./Actividades";
import reales from "@/test/respuestas-reales.json";
import { API, server, usarMsw } from "@/test/msw";
import { docenteDePrueba, renderWithProviders } from "@/test/render";

usarMsw();

const materias = [{ id: 1, nombre: "Matemáticas", codigo: null }];
const futura = { ...reales.actividades[1], id: 9, titulo: "Proyecto final", tipo: "proyecto", fecha_entrega: "2999-01-01", estado: "pendiente" };

function servirDatos(actividades = [...reales.actividades, futura]) {
  server.use(
    http.get(`${API}/grupos`, () => HttpResponse.json(reales.grupos)),
    http.get(`${API}/materias`, () => HttpResponse.json(materias)),
    http.get(`${API}/actividades`, () => HttpResponse.json(actividades)),
    http.get(`${API}/estudiantes`, () => HttpResponse.json(reales.estudiantes)),
    http.get(`${API}/calificaciones`, ({ request }) => {
      const id = Number(new URL(request.url).searchParams.get("actividad_id"));
      return HttpResponse.json(reales.calificaciones.filter((c) => c.actividad_id === id));
    }),
  );
}

const tarjeta = (titulo: string) => screen.getByText(titulo).closest(".group") as HTMLElement;

function renderActividades() {
  return renderWithProviders(<Actividades />, { ruta: "/app/actividades", usuario: docenteDePrueba });
}

describe("Actividades (con MSW)", () => {
  it("muestra cada actividad con su entrega y promedio calculados de las notas reales", async () => {
    servirDatos();
    renderActividades();

    expect(screen.getByText("Cargando actividades...")).toBeInTheDocument();
    await screen.findByText("Taller de Sumas y Restas");
    // 1 de 2 estudiantes del grupo tiene nota (4.8 → 96 %)
    expect(within(tarjeta("Taller de Sumas y Restas")).getByText(/1\s*\/\s*2/)).toBeInTheDocument();
    expect(within(tarjeta("Taller de Sumas y Restas")).getByText(/96/)).toBeInTheDocument();
  });

  it("filtra por texto y avisa cuando nada coincide", async () => {
    servirDatos();
    const { user } = renderActividades();
    await screen.findByText("Proyecto final");

    await user.type(screen.getByRole("textbox", { name: "Buscar actividad" }), "proyecto");
    expect(screen.queryByText("Taller de Sumas y Restas")).not.toBeInTheDocument();
    expect(screen.getByText("Proyecto final")).toBeInTheDocument();
  });

  it("filtra las vencidas", async () => {
    servirDatos();
    const { user } = renderActividades();
    await screen.findByText("Proyecto final");

    await user.click(screen.getByRole("combobox", { name: "Filtrar por estado" }));
    await user.click(await screen.findByRole("option", { name: /Vencida/i }));

    expect(screen.queryByText("Proyecto final")).not.toBeInTheDocument();
    expect(screen.getByText("Taller de Sumas y Restas")).toBeInTheDocument();
  });

  it("crea una actividad con todos los campos requeridos", async () => {
    servirDatos();
    let cuerpo: Record<string, unknown> | undefined;
    server.use(http.post(`${API}/actividades`, async ({ request }) => {
      cuerpo = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ id: 50 }, { status: 201 });
    }));
    const { user } = renderActividades();
    await user.click(await screen.findByRole("button", { name: "Nueva Actividad" }));
    const dialogo = screen.getByRole("dialog", { name: "Crear nueva actividad" });

    await user.type(within(dialogo).getByLabelText("Título"), "Evaluación de sumas");
    await user.click(within(dialogo).getByRole("combobox", { name: "Tipo" }));
    await user.click(await screen.findByRole("option", { name: /Examen/i }));
    await user.click(within(dialogo).getByRole("combobox", { name: "Grupo" }));
    await user.click(await screen.findByRole("option", { name: reales.grupos[0].nombre }));
    await user.type(within(dialogo).getByLabelText("Fecha de entrega"), "2026-12-01");
    await user.click(within(dialogo).getByRole("combobox", { name: "Materia" }));
    await user.click(await screen.findByRole("option", { name: "Matemáticas" }));
    await user.click(within(dialogo).getByRole("button", { name: "Crear actividad" }));

    expect(await screen.findByText("Actividad creada")).toBeInTheDocument();
    expect(cuerpo).toMatchObject({ titulo: "Evaluación de sumas", tipo: "examen", fecha_entrega: "2026-12-01", materia_id: 1, grupo_id: 1 });
  });

  it("no crea la actividad incompleta", async () => {
    servirDatos();
    const { user } = renderActividades();
    await user.click(await screen.findByRole("button", { name: "Nueva Actividad" }));

    await user.click(screen.getByRole("button", { name: "Crear actividad" }));

    expect(await screen.findByText("Completa los campos requeridos")).toBeInTheDocument();
  });

  it("si una actividad no puede cargar sus notas, igual se muestra con lo básico", async () => {
    servirDatos();
    server.use(http.get(`${API}/calificaciones`, () => HttpResponse.json({ detail: "Error interno del servidor" }, { status: 500 })));
    renderActividades();

    expect(await screen.findByText("Taller de Sumas y Restas")).toBeInTheDocument();
  });

  it("si el API cae al cargar muestra el mensaje", async () => {
    server.use(http.get(`${API}/:recurso`, () => HttpResponse.json({ detail: "Error interno del servidor" }, { status: 500 })));
    renderActividades();

    expect(await screen.findByText("Error interno del servidor")).toBeInTheDocument();
  });
});
