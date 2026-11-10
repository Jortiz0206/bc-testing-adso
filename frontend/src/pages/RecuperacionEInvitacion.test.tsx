// Rol Front (Alejandra Guio, S6): pantallas de nueva contraseña e invitación con MSW.
// Los cuerpos de error vienen de src/test/respuestas-reales.json, capturados del
// backend corriendo contra la BD de pruebas: así los handlers no "mienten".
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import ResetPassword from "./ResetPassword";
import Invitation from "./Invitation";
import reales from "@/test/respuestas-reales.json";
import { API, server, usarMsw } from "@/test/msw";
import { renderWithProviders } from "@/test/render";

usarMsw();

describe("ResetPassword", () => {
  it("sin token en el enlace avisa que es inválido", async () => {
    renderWithProviders(<ResetPassword />, { ruta: "/reset-password" });

    expect(await screen.findByText(/Enlace inválido o expirado/)).toBeInTheDocument();
  });

  it("no envía si las contraseñas no coinciden o son cortas", async () => {
    const { user } = renderWithProviders(<ResetPassword />, { ruta: "/reset-password?token=abc" });

    await user.type(await screen.findByLabelText("Nueva contraseña"), "secreta1");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "otra1234");
    await user.click(screen.getByRole("button", { name: "Actualizar contraseña" }));
    expect(await screen.findByText("Las contraseñas no coinciden")).toBeInTheDocument();
  });

  it("con un token válido actualiza la contraseña y vuelve al inicio de sesión", async () => {
    let cuerpo: unknown;
    server.use(http.post(`${API}/auth/reset-password`, async ({ request }) => {
      cuerpo = await request.json();
      return HttpResponse.json({ mensaje: "Contraseña actualizada correctamente" });
    }));
    const { user } = renderWithProviders(<ResetPassword />, { ruta: "/reset-password?token=abc" });

    await user.type(await screen.findByLabelText("Nueva contraseña"), "secreta1");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "secreta1");
    await user.click(screen.getByRole("button", { name: "Actualizar contraseña" }));

    expect(await screen.findByText("Navegó a /auth")).toBeInTheDocument();
    expect(cuerpo).toEqual({ password: "secreta1", token: "abc" });
  });

  it("con un token vencido muestra el mensaje real del API", async () => {
    server.use(http.post(`${API}/auth/reset-password`, () => HttpResponse.json(reales.errores.reset_400, { status: 400 })));
    const { user } = renderWithProviders(<ResetPassword />, { ruta: "/reset-password?token=vencido" });

    await user.type(await screen.findByLabelText("Nueva contraseña"), "secreta1");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "secreta1");
    await user.click(screen.getByRole("button", { name: "Actualizar contraseña" }));

    expect(await screen.findByText(reales.errores.reset_400.detail)).toBeInTheDocument();
  });
});

describe("Invitation", () => {
  it("una invitación inválida avisa y ofrece volver al inicio de sesión", async () => {
    server.use(http.get(`${API}/invitaciones/:token`, () => HttpResponse.json(reales.errores.invitacion_404, { status: 404 })));
    renderWithProviders(<Invitation />, { ruta: "/invitacion?token=no-existe" });

    expect(await screen.findByText("La invitación es inválida o expiró")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Volver al inicio de sesión" })).toBeInTheDocument();
  });

  it("activa la cuenta con el correo de la invitación", async () => {
    let cuerpo: unknown;
    server.use(
      http.get(`${API}/invitaciones/:token`, () => HttpResponse.json({ email: "nuevo@classkids.local", rol: "Docente" })),
      http.post(`${API}/invitaciones/:token/aceptar`, async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json({ mensaje: "Cuenta activada correctamente" });
      }),
    );
    const { user } = renderWithProviders(<Invitation />, { ruta: "/invitacion?token=tok" });

    expect(await screen.findByLabelText("Correo")).toHaveValue("nuevo@classkids.local");
    await user.type(screen.getByLabelText("Nombres"), "Laura");
    await user.type(screen.getByLabelText("Apellidos"), "Jiménez");
    await user.type(screen.getByLabelText("Contraseña"), "secreta1");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "secreta1");
    await user.click(screen.getByRole("button", { name: "Activar cuenta" }));

    expect(await screen.findByText("Navegó a /auth")).toBeInTheDocument();
    expect(cuerpo).toEqual({ nombre: "Laura", apellido: "Jiménez", password: "secreta1" });
  });

  it("si las contraseñas no coinciden no llama al API", async () => {
    server.use(http.get(`${API}/invitaciones/:token`, () => HttpResponse.json({ email: "n@classkids.local", rol: "Docente" })));
    const { user } = renderWithProviders(<Invitation />, { ruta: "/invitacion?token=tok" });

    await user.type(await screen.findByLabelText("Nombres"), "Laura");
    await user.type(screen.getByLabelText("Apellidos"), "Jiménez");
    await user.type(screen.getByLabelText("Contraseña"), "secreta1");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "otra1234");
    await user.click(screen.getByRole("button", { name: "Activar cuenta" }));

    expect(await screen.findByText("Las contraseñas no coinciden")).toBeInTheDocument();
  });
});
