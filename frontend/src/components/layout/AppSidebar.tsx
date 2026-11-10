import { 
  LayoutDashboard, Users, BookOpen, BarChart3, Bell, 
  GraduationCap, ClipboardList, LogOut, ChevronLeft, ChevronRight, Library, ShieldCheck
} from "lucide-react";
import { NavLink, useLocation, Link } from "react-router-dom";
import { useSidebar } from "@/contexts/SidebarContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useIsMobile } from "@/hooks/use-mobile";
import logoc from "@/assets/logo-ClassKids.png";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/app" },
  { icon: Users, label: "Grupos", path: "/app/grupos" },
  { icon: GraduationCap, label: "Estudiantes", path: "/app/estudiantes" },
  { icon: Library, label: "Materias", path: "/app/materias" },
  { icon: BookOpen, label: "Actividades", path: "/app/actividades" },
  { icon: ClipboardList, label: "Calificaciones", path: "/app/calificaciones" },
  { icon: BarChart3, label: "Análisis", path: "/app/analisis" },
  { icon: Bell, label: "Alertas", path: "/app/alertas" },
];

export const AppSidebar = () => {
  const { collapsed, toggle } = useSidebar();
  const isMobile = useIsMobile();
  const isCollapsed = collapsed || isMobile;
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { role, isAdmin } = useUserRole();

  const handleSignOut = () => {
    signOut();
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 z-50 ${
        isCollapsed ? "w-[72px]" : "w-[260px]"
      }`}
    >
      <div className="flex items-center gap-3 px-5 py-6 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-3 min-w-0">
          <img src={logoc} alt="ClassKids" className="w-9 h-9 rounded-lg flex-shrink-0 object-cover" />
          {!isCollapsed && (
            <div className="animate-fade-in min-w-0">
              <h1 className="text-base font-bold tracking-tight truncate text-sidebar-foreground">ClassKids</h1>
              <p className="text-[11px] text-sidebar-muted">Seguimiento Académico</p>
            </div>
          )}
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/app"}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-sidebar-primary" : ""}`} />
              {!isCollapsed && <span className="animate-fade-in">{item.label}</span>}
            </NavLink>
          );
        })}

        {isAdmin && (
          <NavLink
            to="/admin"
            className="flex items-center gap-3 px-3 py-2.5 mt-4 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-all border border-primary/30"
          >
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span>Panel Admin</span>}
          </NavLink>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        {!isCollapsed && user && (
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{user.email}</p>
            <span
              className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                role === "admin"
                  ? "bg-primary/20 text-primary"
                  : "bg-accent text-accent-foreground"
              }`}
            >
              {role === "admin" ? "Administrador" : "Docente"}
            </span>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive transition-all w-full text-left"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>Cerrar sesión</span>}
        </button>
      </div>

      <button
        onClick={toggle}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border shadow-sm flex items-center justify-center hover:bg-secondary transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-foreground" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 text-foreground" />
        )}
      </button>
    </aside>
  );
};

export default AppSidebar;