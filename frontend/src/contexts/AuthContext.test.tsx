import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

describe("AuthProvider", () => {
  beforeEach(() => localStorage.clear());

  it("sin sesión guardada termina de cargar sin usuario", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("restaura la sesión guardada en localStorage", () => {
    localStorage.setItem("classkids_token", "tkn");
    localStorage.setItem("classkids_user", JSON.stringify({ id: 1, email: "a@b.co", rol: "docente" }));

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.token).toBe("tkn");
    expect(result.current.user).toEqual({ id: 1, email: "a@b.co", rol: "docente" });
  });

  it("borra una sesión corrupta en vez de romper la app", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem("classkids_token", "tkn");
    localStorage.setItem("classkids_user", "{no es json");

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem("classkids_token")).toBeNull();
    expect(localStorage.getItem("classkids_user")).toBeNull();
  });

  it("login guarda la sesión y signOut la elimina", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => result.current.login("nuevo", { id: 2, email: "d@c.co" }));
    expect(result.current.user?.email).toBe("d@c.co");
    expect(localStorage.getItem("classkids_token")).toBe("nuevo");

    act(() => result.current.signOut());
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem("classkids_user")).toBeNull();
  });
});

describe("useUserRole", () => {
  beforeEach(() => localStorage.clear());

  const conUsuario = (usuario: object | null) => {
    if (usuario) {
      localStorage.setItem("classkids_token", "tkn");
      localStorage.setItem("classkids_user", JSON.stringify(usuario));
    }
    return renderHook(() => useUserRole(), { wrapper }).result.current;
  };

  it.each([
    [{ id: 1, email: "a@b.co", rol: "admin" }, "admin", true],
    [{ id: 1, email: "a@b.co", role: "admin" }, "admin", true],
    [{ id: 1, email: "a@b.co", rol: "docente" }, "docente", false],
    [{ id: 1, email: "a@b.co" }, "docente", false],
  ])("el usuario %o tiene rol %s (admin: %s)", (usuario, rol, esAdmin) => {
    const r = conUsuario(usuario);
    expect(r.role).toBe(rol);
    expect(r.isAdmin).toBe(esAdmin);
  });

  it("sin usuario no hay rol", () => {
    expect(conUsuario(null)).toMatchObject({ role: null, isAdmin: false });
  });
});
