import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { useUserRole } from "@/hooks/useUserRole";
import AppLayout from "./components/layout/AppLayout";
import AdminLayout from "./components/layout/AdminLayout";
import LoadingScreen from "./components/layout/LoadingScreen";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Grupos from "./pages/Grupos";
import Estudiantes from "./pages/Estudiantes";
import Actividades from "./pages/Actividades";
import Analisis from "./pages/Analisis";
import Alertas from "./pages/Alertas";
import Calificaciones from "./pages/Calificaciones";
import Materias from "./pages/Materias";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsuarios from "./pages/admin/AdminUsuarios";
import AdminDatos from "./pages/admin/AdminDatos";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Invitation from "./pages/Invitation";
import Terminos from "./pages/legal/Terminos";
import Privacidad from "./pages/legal/Privacidad";
import Cookies from "./pages/legal/Cookies";
import ProteccionDatos from "./pages/legal/ProteccionDatos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  if (loading || roleLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/app" replace />;
  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/app" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SidebarProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/invitacion" element={<Invitation />} />
              <Route path="/legal/terminos" element={<Terminos />} />
              <Route path="/legal/privacidad" element={<Privacidad />} />
              <Route path="/legal/cookies" element={<Cookies />} />
              <Route path="/legal/proteccion-datos" element={<ProteccionDatos />} />

              <Route path="/admin/*" element={
                <AdminRoute>
                  <AdminLayout>
                    <Routes>
                      <Route path="/" element={<AdminDashboard />} />
                      <Route path="/usuarios" element={<AdminUsuarios />} />
                      <Route path="/datos" element={<AdminDatos />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AdminLayout>
                </AdminRoute>
              } />

              <Route path="/app/*" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/grupos" element={<Grupos />} />
                      <Route path="/estudiantes" element={<Estudiantes />} />
                      <Route path="/materias" element={<Materias />} />
                      <Route path="/actividades" element={<Actividades />} />
                      <Route path="/calificaciones" element={<Calificaciones />} />
                      <Route path="/analisis" element={<Analisis />} />
                      <Route path="/alertas" element={<Alertas />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                </ProtectedRoute>
              } />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </SidebarProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
