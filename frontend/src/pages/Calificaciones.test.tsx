// Rol Front (Alejandra Guio, S6): Calificaciones con MSW y datos con la forma real del API.
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import Calificaciones from "./Calificaciones";
import reales from "@/test/respuestas-reales.json";
import { API, server, usarMsw } from "@/test/msw";
import { docenteDePrueba, renderWithProviders } from "@/test/render";

usarMsw();

function servirDatos() {
  server.use(
    http.get(`${API}/grupos`, () => HttpResponse.json(reales.grupos)),
    http.get(`${API}/actividades`, () => HttpResponse.json(reales.actividades)),
    http.get(`${API}/estudiantes`, () => HttpResponse.json(reales.estudiantes)),
    http.get(`${API}/calificaciones`, () => HttpResponse.json(reales.calificaciones)),
  );
}

async function elegirActividad(user: ReturnType<typeof renderWithProviders>["user"]) {
  await user.click(screen.getByRole("combobox", { name: "Grupo" }));
  await user.click(await screen.findByRole("option", { name: reales.grupos[0].nombre }));
  await user.click(screen.getByRole("combobox", { name: "Actividad" }));
  await user.click(await screen.findByRole("option", { name: new RegExp(reales.actividades[0].titulo) }));
}

describe("Calificaciones (con MSW)", () => {
  it("al elegir grupo y actividad lista a los estudiantes con la nota que ya tienen", async () => {
    servirDatos();
    const { user } = renderWithProviders(<Calificaciones />, { ruta: "/app/calificaciones", usuario: docenteDePrueba });

    await elegirActividad(user);

    expect(await screen.findByRole("spinbutton", { name: "Calificación de Sofía Gómez" })).toHaveValue(96); // 4.8 → 96 %
    expect(screen.getByRole("spinbutton", { name: "Calificación de Mateo Rodríguez" })).toHaveValue(0);
    expect(screen.getByRole("switch", { name: "Entregó Sofía Gómez" })).toBeChecked();
  });

  it("guarda: actualiza la nota existente (PUT) y crea la nueva (POST) en escala 0-5", async () => {
    servirDatos();
    const enviados: { metodo: string; url: string; cuerpo: unknown }[] = [];
    const registrar = async ({ request }: { request: Request }) => {
      enviados.push({ metodo: request.method, url: new URL(request.url).pathname, cuerpo: await request.json() });
      return HttpResponse.json({ id: 99 });
    };
    server.use(http.put(`${API}/calificaciones/:id`, registrar), http.post(`${API}/calificaciones`, registrar));
    const { user } = renderWithProviders(<Calificaciones />, { ruta: "/app/calificaciones", usuario: docenteDePrueba });
    await elegirActividad(user);

    const campo = await screen.findByRole("spinbutton", { name: "Calificación de Mateo Rodríguez" });
    await user.clear(campo);
    await user.type(campo, "61");
    await user.click(screen.getByRole("button", { name: /Guardar cambios/ }));

    expect(await screen.findByText("Calificaciones guardadas correctamente")).toBeInTheDocument();
    expect(enviados).toContainEqual(expect.objectContaining({ metodo: "PUT", url: "/calificaciones/1" }));
    expect(enviados).toContainEqual({
      metodo: "POST", url: "/calificaciones",
      cuerpo: { estudiante_id: "2", materia_id: 1, actividad_id: 1, nota: 3.1, observacion: null },
    });
  });

  it("si el API rechaza la nota, avisa que no se guardaron", async () => {
    servirDatos();
    server.use(
      http.put(`${API}/calificaciones/:id`, () => HttpResponse.json(reales.errores.calificacion_422, { status: 422 })),
    );
    const { user } = renderWithProviders(<Calificaciones />, { ruta: "/app/calificaciones", usuario: docenteDePrueba });
    await elegirActividad(user);
    await screen.findByText(/Sofía/);

    await user.click(screen.getByRole("button", { name: /Guardar cambios/ }));

    expect(await screen.findByText("Error al guardar calificaciones")).toBeInTheDocument();
  });

  it("si no cargan los grupos muestra el error", async () => {
    server.use(http.get(`${API}/grupos`, () => HttpResponse.json({ detail: "Error interno del servidor" }, { status: 500 })));
    renderWithProviders(<Calificaciones />, { ruta: "/app/calificaciones", usuario: docenteDePrueba });

    expect(await screen.findByText("Error al cargar los grupos")).toBeInTheDocument();
  });
});
