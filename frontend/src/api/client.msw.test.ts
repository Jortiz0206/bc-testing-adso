// Rol Front (Jan Janos, S5): el cliente HTTP contra un backend simulado con MSW.
// Fake: los handlers de MSW responden como el API real, sin red ni backend.
import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { api } from "./client";
import { API, server, usarMsw } from "@/test/msw";

usarMsw();

describe("cliente HTTP con MSW", () => {
  beforeEach(() => localStorage.setItem("classkids_token", "tkn"));

  it("caso feliz: devuelve el JSON y envía el token", async () => {
    let autorizacion: string | null = null;
    server.use(http.get(`${API}/grupos`, ({ request }) => {
      autorizacion = request.headers.get("Authorization");
      return HttpResponse.json([{ id: 1, nombre: "Primero A" }]);
    }));

    await expect(api.get("/grupos")).resolves.toEqual([{ id: 1, nombre: "Primero A" }]);
    expect(autorizacion).toBe("Bearer tkn");
  });

  it("500 del API: el error lleva el detail del contrato", async () => {
    server.use(http.get(`${API}/grupos`, () => HttpResponse.json({ detail: "Error interno del servidor" }, { status: 500 })));

    await expect(api.get("/grupos")).rejects.toThrow("Error interno del servidor");
  });

  it("422 del API: el mensaje de validación llega como texto legible", async () => {
    server.use(http.post(`${API}/calificaciones`, () => HttpResponse.json(
      { detail: "Datos inválidos - nota: Input should be less than or equal to 5", errores: [] }, { status: 422 },
    )));

    await expect(api.post("/calificaciones", { nota: 7 })).rejects.toThrow("Datos inválidos - nota:");
  });

  it("error con cuerpo no JSON (un proxy caído): usa el código y el texto de estado", async () => {
    server.use(http.get(`${API}/grupos`, () => new HttpResponse("<html>Bad Gateway</html>", {
      status: 502, statusText: "Bad Gateway", headers: { "Content-Type": "text/html" },
    })));

    await expect(api.get("/grupos")).rejects.toThrow("Error 502: Bad Gateway");
  });

  it("200 con HTML en vez de JSON: muestra un mensaje entendible y no un error de parseo", async () => {
    server.use(http.get(`${API}/grupos`, () => HttpResponse.html("<html>login del proxy</html>")));

    await expect(api.get("/grupos")).rejects.toThrow("Respuesta inválida del servidor");
  });

  it("el PUT envía el cuerpo como JSON", async () => {
    let cuerpo: unknown;
    server.use(http.put(`${API}/alertas/3/estado`, async ({ request }) => {
      cuerpo = await request.json();
      return HttpResponse.json({ id: 3, estado: "resolved" });
    }));

    await api.put("/alertas/3/estado", { estado: "resolved" });

    expect(cuerpo).toEqual({ estado: "resolved" });
  });
});
