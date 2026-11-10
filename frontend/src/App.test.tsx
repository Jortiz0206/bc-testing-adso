import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

// Stub del cliente HTTP: las páginas protegidas piden datos al cargar y aquí solo
// interesa a qué pantalla deja entrar cada regla de acceso, no los datos.
vi.mock("@/api/client", () => ({
  api: {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

function visitar(ruta: string, usuario?: { rol: "admin" | "docente"; nombre?: string }) {
  localStorage.clear();
  if (usuario) {
    localStorage.setItem("classkids_token", "tkn");
    localStorage.setItem("classkids_user", JSON.stringify({ id: 1, email: "u@classkids.local", ...usuario }));
  }
  window.history.pushState({}, "", ruta);
  render(<App />);
}

describe("reglas de acceso de las rutas", () => {
  beforeEach(() => localStorage.clear());

  it("sin sesión, /app redirige al inicio de sesión", async () => {
    visitar("/app/estudiantes");

    expect(await screen.findByRole("heading", { name: "ClassKids" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/auth");
  });

  it("un docente que intenta entrar a /admin vuelve a su panel", async () => {
    visitar("/admin/usuarios", { rol: "docente", nombre: "Laura" });

    expect(await screen.findByRole("heading", { name: "Hola, Laura." })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/app");
  });

  it("un administrador entra al panel de administración", async () => {
    visitar("/admin", { rol: "admin" });

    expect(await screen.findByRole("heading", { name: "Panel de administración" })).toBeInTheDocument();
  });

  it("con sesión iniciada, /auth lleva directo al panel", async () => {
    visitar("/auth", { rol: "docente", nombre: "Laura" });

    expect(await screen.findByRole("heading", { name: "Hola, Laura." })).toBeInTheDocument();
  });

  it.each([
    ["/legal/terminos"],
    ["/legal/privacidad"],
    ["/legal/cookies"],
    ["/legal/proteccion-datos"],
  ])("la página pública %s se ve sin sesión", async (ruta) => {
    visitar(ruta);

    expect(await screen.findAllByRole("heading", { level: 1 })).not.toHaveLength(0);
    expect(window.location.pathname).toBe(ruta);
  });

  it("una ruta inexistente muestra la página 404", async () => {
    visitar("/no-existe");

    expect(await screen.findByText(/404/)).toBeInTheDocument();
  });
});
