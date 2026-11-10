import { describe, it, expect } from "vitest";
import { enriquecerEstudiantes, filtrarEstudiantes, validarFormularioEstudiante, type EstudianteView } from "./estudiantes";

describe("enriquecerEstudiantes", () => {
  const grupos = [{ id: 1, nombre: "Primero A" }];

  it("calcula promedio, tendencia, alertas activas y estado de cada estudiante", () => {
    const r = enriquecerEstudiantes({
      grupos,
      estudiantes: [{ id: 7, documento: "1001", nombre: "Ana", apellido: "Ruiz", grupo_id: 1 }],
      calificaciones: [
        { estudiante_id: 7, nota: 2.5, periodo: 1 }, // 50
        { estudiante_id: 7, nota: 3, periodo: 2 }, // 60
        { estudiante_id: 8, nota: 5, periodo: 1 }, // de otro estudiante
      ],
      alertas: [
        { estudiante_id: 7, estado: "active" },
        { estudiante_id: 7, estado: "resolved" },
      ],
    });

    expect(r).toEqual([
      {
        id: "7",
        documento: "1001",
        nombre: "Ana",
        apellido: "Ruiz",
        grupo_id: "1",
        grupo_nombre: "Primero A",
        tendencia: "up",
        estado: "crítico",
        promedio: 55,
        alertas: 1,
      },
    ]);
  });

  it("un estudiante sin notas ni grupo queda con promedio 0 y sin grupo", () => {
    const [vista] = enriquecerEstudiantes({
      grupos,
      estudiantes: [{ id: 9, nombre: "Beto", apellido: "Gil", grupo_id: null }],
      calificaciones: [],
      alertas: [],
    });

    expect(vista.promedio).toBe(0);
    expect(vista.grupo_id).toBe("");
    expect(vista.grupo_nombre).toBe("");
    expect(vista.tendencia).toBe("estable");
  });
});

describe("filtrarEstudiantes", () => {
  const base = { documento: "", grupo_nombre: "", tendencia: "estable", promedio: 0, alertas: 0 } as const;
  const lista: EstudianteView[] = [
    { ...base, id: "1", nombre: "Ana", apellido: "Ruiz", grupo_id: "1", estado: "activo" },
    { ...base, id: "2", nombre: "Beto", apellido: "Ruiz", grupo_id: "2", estado: "en riesgo" },
    { ...base, id: "3", nombre: "Caro", apellido: "Díaz", grupo_id: "1", estado: "en riesgo" },
  ];

  it("busca por nombre y apellido sin importar mayúsculas", () => {
    const r = filtrarEstudiantes(lista, { busqueda: "  ANA ruiz ", grupo: "todos", estado: "todos" });
    expect(r.map((e) => e.id)).toEqual(["1"]);
  });

  it("combina el filtro de grupo y el de estado", () => {
    const r = filtrarEstudiantes(lista, { busqueda: "", grupo: "1", estado: "en riesgo" });
    expect(r.map((e) => e.id)).toEqual(["3"]);
  });

  it("con todos los filtros en 'todos' devuelve la lista completa", () => {
    expect(filtrarEstudiantes(lista, { busqueda: "", grupo: "todos", estado: "todos" })).toHaveLength(3);
  });
});

describe("validarFormularioEstudiante", () => {
  const valido = { documento: "1001", nombre: "Ana", apellido: "Ruiz", grupoId: "1" };

  it("acepta el formulario completo", () => {
    expect(validarFormularioEstudiante(valido)).toBeNull();
  });

  it("acepta el id del grupo como número, que es como llega del API", () => {
    expect(validarFormularioEstudiante({ ...valido, grupoId: 2 })).toBeNull();
  });

  it.each(["documento", "nombre", "apellido", "grupoId"] as const)(
    "rechaza el formulario si %s está vacío o solo tiene espacios",
    (campo) => {
      expect(validarFormularioEstudiante({ ...valido, [campo]: "" })).toBe("Completa todos los campos");
      expect(validarFormularioEstudiante({ ...valido, [campo]: "   " })).toBe("Completa todos los campos");
    },
  );
});
