// Render compartido para los tests de componentes: router en memoria, sesión
// (AuthProvider) y el contenedor de toasts, como en la app real.
import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";

export interface UsuarioDePrueba {
  id: number;
  email: string;
  nombre?: string;
  apellido?: string;
  rol: "admin" | "docente";
}

export const docenteDePrueba: UsuarioDePrueba = { id: 2, email: "docente@classkids.local", nombre: "Laura", rol: "docente" };
export const adminDePrueba: UsuarioDePrueba = { id: 1, email: "admin@classkids.local", nombre: "Admin", rol: "admin" };

/** Pantalla de relleno para las rutas a las que navega el componente probado. */
function OtraPantalla() {
  const { pathname, search } = useLocation();
  return <p>Navegó a {pathname + search}</p>;
}

export function renderWithProviders(
  ui: ReactElement,
  opciones: { ruta?: string; usuario?: UsuarioDePrueba | null; rutaDelComponente?: string } = {},
) {
  const { ruta = "/", usuario = null } = opciones;
  const rutaDelComponente = opciones.rutaDelComponente ?? ruta.split("?")[0];
  localStorage.clear();
  if (usuario) {
    localStorage.setItem("classkids_token", "token-de-prueba");
    localStorage.setItem("classkids_user", JSON.stringify(usuario));
  }
  const user = userEvent.setup();
  const resultado = render(
    <AuthProvider>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path={rutaDelComponente} element={ui} />
          <Route path="*" element={<OtraPantalla />} />
        </Routes>
      </MemoryRouter>
      <Toaster />
    </AuthProvider>,
  );
  return { user, ...resultado };
}
