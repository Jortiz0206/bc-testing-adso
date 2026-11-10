// Rol BD (Johanna Ortiz, S3): componente Estudiantes — la lista que carga los datos y el registro con su validación
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import Estudiantes from "./Estudiantes";
import { api } from "@/api/client";
import { docenteDePrueba, renderWithProviders } from "@/test/render";

vi.mock("@/api/client", () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
const get = vi.mocked(api.get);
const post = vi.mocked(api.post);
const put = vi.mocked(api.put);

const datos: Record<string, unknown> = {
  "/grupos": [
    { id: 1, nombre: "Primero A" },
    { id: 2, nombre: "Segundo B" },
  ],
  "/estudiantes": [
    { id: 10, documento: "1001", nombre: "Ana", apellido: "Ruiz", grupo_id: 1 },
    { id: 11, documento: "1002", nombre: "Beto", apellido: "Gil", grupo_id: 2 },
  ],
  "/calificaciones": [
    { estudiante_id: 10, nota: 4.5 }, // 90 %
    { estudiante_id: 11, nota: 2.5 }, // 50 %
  ],
  "/alertas": [{ estudiante_id: 11, estado: "active" }],
  "/observaciones": [],
};

function servirDatos(sobrescribir: Record<string, unknown> = {}) {
  const tabla = { ...datos, ...sobrescribir };
  get.mockImplementation(async (endpoint: string) => {
    const valor = tabla[endpoint.split("?")[0]];
    if (valor instanceof Error) throw valor;
    return valor;
  });
}

function renderEstudiantes(ruta = "/app/estudiantes") {
  return renderWithProviders(<Estudiantes />, { ruta, usuario: docenteDePrueba });
}

describe("Estudiantes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servirDatos();
  });

  it("muestra el estado de carga y luego cada estudiante con su promedio y estado", async () => {
    renderEstudiantes();

    expect(screen.getByText("Cargando estudiantes...")).toBeInTheDocument();
    const filaAna = (await screen.findByText("Ana Ruiz")).closest("tr")!;
    expect(within(filaAna).getByText("90%")).toBeInTheDocument();
    expect(within(filaAna).getByText("Activo")).toBeInTheDocument();

    const filaBeto = screen.getByText("Beto Gil").closest("tr")!;
    expect(within(filaBeto).getByText("Crítico")).toBeInTheDocument();
    expect(screen.getByText("Total estudiantes").previousSibling).toHaveTextContent("2");
  });

  it("filtra la lista con el buscador y avisa cuando no hay coincidencias", async () => {
    const { user } = renderEstudiantes();
    await screen.findByText("Ana Ruiz");

    await user.type(screen.getByRole("textbox", { name: "Buscar estudiante" }), "beto");
    expect(screen.queryByText("Ana Ruiz")).not.toBeInTheDocument();
    expect(screen.getByText("Beto Gil")).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "Buscar estudiante" }), "zzz");
    expect(screen.getByText("No se encontraron estudiantes")).toBeInTheDocument();
  });

  it("toma la búsqueda inicial del parámetro ?buscar= de la URL", async () => {
    renderEstudiantes("/app/estudiantes?buscar=ana");

    expect(await screen.findByText("Ana Ruiz")).toBeInTheDocument();
    expect(screen.queryByText("Beto Gil")).not.toBeInTheDocument();
  });

  it("filtra por estado con el selector", async () => {
    const { user } = renderEstudiantes();
    await screen.findByText("Ana Ruiz");

    await user.click(screen.getByRole("combobox", { name: "Filtrar por estado" }));
    await user.click(await screen.findByRole("option", { name: "Crítico" }));

    expect(screen.queryByText("Ana Ruiz")).not.toBeInTheDocument();
    expect(screen.getByText("Beto Gil")).toBeInTheDocument();
  });

  it("si el API falla muestra un error y la lista vacía", async () => {
    servirDatos({ "/estudiantes": new Error("Error 500") });
    renderEstudiantes();

    expect(await screen.findByText("Error al cargar los estudiantes")).toBeInTheDocument();
    expect(screen.getByText("No se encontraron estudiantes")).toBeInTheDocument();
  });

  describe("formulario de registro", () => {
    it("no envía el formulario incompleto y avisa qué falta", async () => {
      const { user } = renderEstudiantes();
      await user.click(await screen.findByRole("button", { name: "Nuevo Estudiante" }));
      const dialogo = screen.getByRole("dialog", { name: "Registrar nuevo estudiante" });

      await user.type(within(dialogo).getByLabelText("Documento"), "2001");
      await user.click(within(dialogo).getByRole("button", { name: "Registrar" }));

      expect(await screen.findByText("Completa todos los campos")).toBeInTheDocument();
      expect(post).not.toHaveBeenCalled();
    });

    it("registra un estudiante completo, cierra el diálogo y recarga la lista", async () => {
      post.mockResolvedValue({ id: 12 });
      const { user } = renderEstudiantes();
      await user.click(await screen.findByRole("button", { name: "Nuevo Estudiante" }));
      const dialogo = screen.getByRole("dialog", { name: "Registrar nuevo estudiante" });

      await user.type(within(dialogo).getByLabelText("Documento"), "2001");
      await user.type(within(dialogo).getByLabelText("Nombre"), "Caro");
      await user.type(within(dialogo).getByLabelText("Apellido"), "Díaz");
      await user.click(within(dialogo).getByRole("combobox", { name: "Grupo" }));
      await user.click(await screen.findByRole("option", { name: "Segundo B" }));
      await user.click(within(dialogo).getByRole("button", { name: "Registrar" }));

      expect(await screen.findByText("Estudiante registrado")).toBeInTheDocument();
      expect(post).toHaveBeenCalledWith("/estudiantes", {
        documento: "2001", nombre: "Caro", apellido: "Díaz", grupo_id: 2, activo: true,
      });
      expect(screen.queryByRole("dialog", { name: "Registrar nuevo estudiante" })).not.toBeInTheDocument();
      expect(get.mock.calls.filter(([url]) => url === "/estudiantes")).toHaveLength(2);
    });

    it("edita un estudiante desde su detalle con los datos precargados", async () => {
      put.mockResolvedValue({});
      const { user } = renderEstudiantes();
      await user.click(await screen.findByRole("button", { name: "Ver a Ana Ruiz" }));
      await user.click(await screen.findByRole("button", { name: "Editar" }));
      const dialogo = screen.getByRole("dialog", { name: "Editar estudiante" });

      expect(within(dialogo).getByLabelText("Documento")).toHaveValue("1001");
      await user.clear(within(dialogo).getByLabelText("Apellido"));
      await user.type(within(dialogo).getByLabelText("Apellido"), "Ruiz Mesa");
      await user.click(within(dialogo).getByRole("button", { name: "Guardar cambios" }));

      expect(await screen.findByText("Estudiante actualizado")).toBeInTheDocument();
      expect(put).toHaveBeenCalledWith("/estudiantes/10", expect.objectContaining({ apellido: "Ruiz Mesa", grupo_id: "1" }));
    });

    it("si el API rechaza el registro (documento repetido) muestra su motivo y deja el diálogo abierto", async () => {
      post.mockRejectedValue(new Error("Ya existe un registro con esos datos (por ejemplo, el mismo documento)"));
      const { user } = renderEstudiantes();
      await user.click(await screen.findByRole("button", { name: "Nuevo Estudiante" }));
      const dialogo = screen.getByRole("dialog", { name: "Registrar nuevo estudiante" });

      await user.type(within(dialogo).getByLabelText("Documento"), "1001");
      await user.type(within(dialogo).getByLabelText("Nombre"), "Ana");
      await user.type(within(dialogo).getByLabelText("Apellido"), "Ruiz");
      await user.click(within(dialogo).getByRole("combobox", { name: "Grupo" }));
      await user.click(await screen.findByRole("option", { name: "Primero A" }));
      await user.click(within(dialogo).getByRole("button", { name: "Registrar" }));

      expect(await screen.findByText("Ya existe un registro con esos datos (por ejemplo, el mismo documento)")).toBeInTheDocument();
      expect(screen.getByRole("dialog", { name: "Registrar nuevo estudiante" })).toBeInTheDocument();
    });
  });
});
