// Rol Front (Alejandra Guio, S3): componente Auth — formulario de inicio de sesión y recuperación
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import Auth from "./Auth";
import { api } from "@/api/client";
import { renderWithProviders } from "@/test/render";

vi.mock("@/api/client", () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
const post = vi.mocked(api.post);

function renderAuth() {
  return renderWithProviders(<Auth />, { ruta: "/auth" });
}

describe("Auth", () => {
  beforeEach(() => {
    post.mockReset();
  });

  it("con credenciales válidas guarda la sesión y lleva al panel", async () => {
    post.mockResolvedValue({ access_token: "jwt", user: { id: 2, email: "docente@classkids.local", rol: "docente" } });
    const { user } = renderAuth();

    await user.type(screen.getByLabelText("Email"), "docente@classkids.local");
    await user.type(screen.getByLabelText("Contraseña"), "secreta1");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByText("Navegó a /app")).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith("/auth/login", { email: "docente@classkids.local", password: "secreta1" });
    expect(localStorage.getItem("classkids_token")).toBe("jwt");
  });

  it("si el API rechaza las credenciales muestra su mensaje y no navega", async () => {
    post.mockRejectedValue(new Error("Correo o contraseña incorrectos"));
    const { user } = renderAuth();

    await user.type(screen.getByLabelText("Email"), "docente@classkids.local");
    await user.type(screen.getByLabelText("Contraseña"), "otra-clave");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByText("Correo o contraseña incorrectos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeEnabled();
    expect(localStorage.getItem("classkids_token")).toBeNull();
  });

  it("una respuesta sin token se trata como error de autenticación", async () => {
    post.mockResolvedValue({ user: { id: 2, email: "x@y.co" } });
    const { user } = renderAuth();

    await user.type(screen.getByLabelText("Email"), "x@y.co");
    await user.type(screen.getByLabelText("Contraseña"), "secreta1");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByText("Respuesta de autenticación inválida")).toBeInTheDocument();
  });

  it("deshabilita el botón mientras espera la respuesta (evita doble envío)", async () => {
    let responder: (valor: unknown) => void = () => {};
    post.mockReturnValue(new Promise((resolve) => { responder = resolve; }));
    const { user } = renderAuth();

    await user.type(screen.getByLabelText("Email"), "docente@classkids.local");
    await user.type(screen.getByLabelText("Contraseña"), "secreta1");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(screen.getByRole("button", { name: "Cargando..." })).toBeDisabled();
    responder({ access_token: "jwt", user: { id: 2, email: "docente@classkids.local" } });
    expect(await screen.findByText("Navegó a /app")).toBeInTheDocument();
  });

  it("no permite pegar la contraseña", async () => {
    const { user } = renderAuth();
    const campo = screen.getByLabelText("Contraseña");

    await user.click(campo);
    await user.paste("pegada");

    expect(campo).toHaveValue("");
    expect(await screen.findByText(/escribe tu contraseña manualmente/)).toBeInTheDocument();
  });

  describe("recuperación de contraseña", () => {
    it("envía el correo con el enlace de regreso a /reset-password y vuelve al inicio de sesión", async () => {
      post.mockResolvedValue({ mensaje: "ok", email_sent: true });
      const { user } = renderAuth();

      await user.click(screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));
      await user.type(screen.getByLabelText("Email"), "docente@classkids.local");
      await user.click(screen.getByRole("button", { name: "Enviar enlace" }));

      expect(await screen.findByText("Revisa tu correo para restablecer tu contraseña")).toBeInTheDocument();
      expect(post).toHaveBeenCalledWith("/auth/forgot-password", {
        email: "docente@classkids.local",
        redirect_to: `${window.location.origin}/reset-password`,
      });
      expect(screen.getByRole("heading", { name: "ClassKids" })).toBeInTheDocument();
    });

    it("si el envío falla muestra el error y se queda en el formulario", async () => {
      post.mockRejectedValue(new Error("Servicio no disponible"));
      const { user } = renderAuth();

      await user.click(screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));
      await user.type(screen.getByLabelText("Email"), "docente@classkids.local");
      await user.click(screen.getByRole("button", { name: "Enviar enlace" }));

      expect(await screen.findByText("Servicio no disponible")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Restablecer contraseña" })).toBeInTheDocument();
    });

    it("el botón de volver regresa al inicio de sesión", async () => {
      const { user } = renderAuth();

      await user.click(screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));
      await user.click(screen.getByRole("button", { name: "Volver al inicio de sesión" }));

      expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeInTheDocument();
    });
  });
});
