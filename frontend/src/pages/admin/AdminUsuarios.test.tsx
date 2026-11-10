// Rol Backend (Jan Janos, S3): componente AdminUsuarios — usuarios y roles que entrega el API
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, within } from "@testing-library/react";
import AdminUsuarios from "./AdminUsuarios";
import { api } from "@/api/client";
import { adminDePrueba, renderWithProviders } from "@/test/render";

vi.mock("@/api/client", () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
const get = vi.mocked(api.get);
const post = vi.mocked(api.post);
const put = vi.mocked(api.put);
const del = vi.mocked(api.delete);

// El API envía user_id como texto (u.id::text); el admin de la sesión tiene id numérico 1.
const usuarios = [
  { user_id: "1", email: "admin@classkids.local", nombre: "Admin", role: "admin", created_at: "2026-01-10T12:00:00", last_sign_in_at: null },
  { user_id: "5", email: "laura@classkids.local", nombre: "Laura", apellido: "Jiménez", role: "docente", created_at: "2026-02-01T12:00:00", last_sign_in_at: "2026-03-01T08:00:00" },
];

function renderAdminUsuarios() {
  return renderWithProviders(<AdminUsuarios />, { ruta: "/admin/usuarios", usuario: adminDePrueba });
}

describe("AdminUsuarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue(usuarios);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lista los usuarios con su nombre completo y marca 'Nunca' a quien no ha entrado", async () => {
    renderAdminUsuarios();

    expect(screen.getByText("Cargando...")).toBeInTheDocument();
    const fila = (await screen.findByText("laura@classkids.local")).closest("tr")!;
    expect(within(fila).getByText("Laura Jiménez")).toBeInTheDocument();
    expect(screen.getByText("Nunca")).toBeInTheDocument();
  });

  it("el administrador no puede cambiar su propio rol ni eliminarse", async () => {
    renderAdminUsuarios();

    const propia = (await screen.findByText("admin@classkids.local")).closest("tr")!;
    expect(within(propia).getByText("(tú)")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Rol de admin@classkids.local" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Eliminar a admin@classkids.local" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Eliminar a laura@classkids.local" })).toBeEnabled();
  });

  it("muestra 'Sin usuarios' cuando la lista está vacía", async () => {
    get.mockResolvedValue([]);
    renderAdminUsuarios();

    expect(await screen.findByText("Sin usuarios")).toBeInTheDocument();
  });

  it("si la carga falla muestra el error del API", async () => {
    get.mockRejectedValue(new Error("Permisos insuficientes"));
    renderAdminUsuarios();

    expect(await screen.findByText("Permisos insuficientes")).toBeInTheDocument();
    expect(screen.getByText("Sin usuarios")).toBeInTheDocument();
  });

  describe("invitar", () => {
    it("el botón de envío está deshabilitado mientras no haya correo", async () => {
      const { user } = renderAdminUsuarios();
      await user.click(screen.getByRole("button", { name: "Invitar docente" }));

      expect(screen.getByRole("button", { name: "Enviar invitación" })).toBeDisabled();
    });

    it("invita con el rol elegido y, sin SMTP, muestra el enlace de prueba", async () => {
      post.mockResolvedValue({ email_sent: false, invitation_url: "http://127.0.0.1:8080/invitacion?token=abc" });
      const { user } = renderAdminUsuarios();
      await user.click(screen.getByRole("button", { name: "Invitar docente" }));
      const dialogo = screen.getByRole("dialog", { name: "Invitar nuevo usuario" });

      await user.type(within(dialogo).getByLabelText("Correo electrónico"), "nuevo@classkids.local");
      await user.click(within(dialogo).getByRole("combobox", { name: "Rol" }));
      await user.click(await screen.findByRole("option", { name: "Administrador" }));
      await user.click(within(dialogo).getByRole("button", { name: "Enviar invitación" }));

      expect(post).toHaveBeenCalledWith("/usuarios/invitar", { email: "nuevo@classkids.local", role: "admin" });
      expect(await screen.findByText("Invitación creada en modo de prueba")).toBeInTheDocument();
      expect(within(dialogo).getByLabelText("Enlace de prueba")).toHaveValue("http://127.0.0.1:8080/invitacion?token=abc");
      expect(within(dialogo).getByLabelText("Correo electrónico")).toHaveValue("");
    });

    it("con SMTP configurado confirma el envío al correo", async () => {
      post.mockResolvedValue({ email_sent: true, invitation_url: "http://x/invitacion?token=1" });
      const { user } = renderAdminUsuarios();
      await user.click(screen.getByRole("button", { name: "Invitar docente" }));
      await user.type(screen.getByLabelText("Correo electrónico"), "otro@classkids.local");
      await user.click(screen.getByRole("button", { name: "Enviar invitación" }));

      expect(await screen.findByText("Invitación enviada a otro@classkids.local")).toBeInTheDocument();
    });

    it("muestra el error cuando el usuario ya existe", async () => {
      post.mockRejectedValue(new Error("El usuario ya existe"));
      const { user } = renderAdminUsuarios();
      await user.click(screen.getByRole("button", { name: "Invitar docente" }));
      await user.type(screen.getByLabelText("Correo electrónico"), "laura@classkids.local");
      await user.click(screen.getByRole("button", { name: "Enviar invitación" }));

      expect(await screen.findByText("El usuario ya existe")).toBeInTheDocument();
    });
  });

  it("cambia el rol de otro usuario", async () => {
    put.mockResolvedValue({});
    const { user } = renderAdminUsuarios();

    await user.click(await screen.findByRole("combobox", { name: "Rol de laura@classkids.local" }));
    await user.click(await screen.findByRole("option", { name: "Admin" }));

    expect(put).toHaveBeenCalledWith("/usuarios/5/rol", { role: "admin" });
    expect(await screen.findByText("Rol actualizado")).toBeInTheDocument();
  });

  it("elimina solo si se confirma", async () => {
    del.mockResolvedValue({});
    const confirmar = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
    vi.stubGlobal("confirm", confirmar);
    const { user } = renderAdminUsuarios();
    const eliminar = await screen.findByRole("button", { name: "Eliminar a laura@classkids.local" });

    await user.click(eliminar);
    expect(del).not.toHaveBeenCalled();

    await user.click(eliminar);
    expect(del).toHaveBeenCalledWith("/usuarios/5");
    expect(await screen.findByText("Usuario eliminado")).toBeInTheDocument();
  });
});
