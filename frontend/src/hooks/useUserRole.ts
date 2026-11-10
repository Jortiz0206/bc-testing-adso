import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "docente";

export function useUserRole() {
  const { user, loading } = useAuth();

  // El rol ya viene incluido en `user` (AuthContext lo carga desde localStorage
  // de forma síncrona), así que se deriva directamente en cada render en vez de
  // guardarlo en un estado propio actualizado por un efecto aparte. Ese segundo
  // estado quedaba un render "atrasado" respecto a `user` en una recarga
  // completa (ej. entrar directo a /admin), y como AdminRoute combina ambos
  // `loading` con OR, alcanzaba a leer `isAdmin: false` con datos ya obsoletos
  // antes de que el efecto se disparara — redirigiendo a un administrador real
  // fuera del panel de administración.
  const role: AppRole | null = user ? (((user as any).rol || (user as any).role || "docente") as AppRole) : null;

  return { role, loading, isAdmin: role === "admin" };
}