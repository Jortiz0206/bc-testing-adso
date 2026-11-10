import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api, apiFetch } from "./client";

// Stub: reemplaza fetch con una respuesta fija para probar el cliente sin red.
function respuesta(status: number, cuerpo?: unknown, statusText = "") {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: cuerpo === undefined ? () => Promise.reject(new Error("sin JSON")) : () => Promise.resolve(cuerpo),
  } as Response;
}

describe("apiFetch", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("envía el token guardado como Authorization Bearer", async () => {
    localStorage.setItem("classkids_token", "abc");
    fetchMock.mockResolvedValue(respuesta(200, []));

    await apiFetch("/grupos");

    const [, opciones] = fetchMock.mock.calls[0];
    expect(opciones.headers).toMatchObject({ Authorization: "Bearer abc", "Content-Type": "application/json" });
  });

  it("no envía Authorization cuando no hay sesión", async () => {
    fetchMock.mockResolvedValue(respuesta(200, []));

    await apiFetch("/grupos");

    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty("Authorization");
  });

  it("lanza el detail del API cuando la respuesta es un error", async () => {
    fetchMock.mockResolvedValue(respuesta(409, { detail: "La asignación ya existe" }));

    await expect(apiFetch("/asignaciones")).rejects.toThrow("La asignación ya existe");
  });

  it("si el error no trae JSON, el mensaje incluye el código y el texto de estado", async () => {
    fetchMock.mockResolvedValue(respuesta(502, undefined, "Bad Gateway"));

    await expect(apiFetch("/grupos")).rejects.toThrow("Error 502: Bad Gateway");
  });

  it("devuelve undefined con 204 sin intentar leer el cuerpo", async () => {
    fetchMock.mockResolvedValue(respuesta(204));

    await expect(apiFetch("/algo")).resolves.toBeUndefined();
  });
});

describe("api", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(respuesta(200, { ok: true }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it.each([
    ["post", "POST"],
    ["put", "PUT"],
  ] as const)("%s serializa el cuerpo como JSON y usa el método %s", async (metodo, http) => {
    await api[metodo]("/grupos/1", { nombre: "Primero A" });

    const [url, opciones] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/grupos\/1$/);
    expect(opciones).toMatchObject({ method: http, body: JSON.stringify({ nombre: "Primero A" }) });
  });

  it("delete usa el método DELETE y get no envía cuerpo", async () => {
    await api.delete("/grupos/1");
    await api.get("/grupos");

    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "DELETE" });
    expect(fetchMock.mock.calls[1][1].body).toBeUndefined();
  });
});
