import { ReactNode } from "react";
import { NavLink, Link } from "react-router-dom";
import { ShieldCheck, Users, Database, LayoutDashboard, LogOut, ArrowLeft } from "lucide-react";
import logoc from "@/assets/logo-ClassKids.png";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

const items = [
  { to: "/admin", icon: LayoutDashboard, label: "Resumen", end: true },
  { to: "/admin/usuarios", icon: Users, label: "Usuarios" },
  { to: "/admin/datos", icon: Database, label: "Datos globales" },
];

export const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();

  const handleSignOut = () => {
    signOut();
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className={`fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground flex flex-col z-50 ${isMobile ? "w-[72px]" : "w-[260px]"}`}>
        <div className={`border-b border-sidebar-border ${isMobile ? "px-3 py-6" : "px-5 py-6"}`}>
          <Link to="/" className="flex items-center gap-3">
            <img src={logoc} alt="ClassKids" className="w-9 h-9 rounded-lg object-cover" />
            <div className={isMobile ? "hidden" : ""}>
              <p className="font-bold text-sidebar-foreground">ClassKids</p>
              <p className="text-[10px] uppercase tracking-wider text-primary font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Admin Panel
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`
              }
            >
              <it.icon className="w-5 h-5" />
              {!isMobile && it.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-1">
          {user && !isMobile && (
            <div className="px-3 py-2 mb-1">
              <p className="text-xs font-medium truncate text-sidebar-foreground">{user.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-primary/20 text-primary">
                Administrador
              </span>
            </div>
          )}
          <Link
            to="/app"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all"
          >
            <ArrowLeft className="w-5 h-5" /> {!isMobile && "Vista docente"}
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive transition-all w-full text-left"
          >
            <LogOut className="w-5 h-5" /> {!isMobile && "Cerrar sesión"}
          </button>
        </div>
      </aside>

      <main className={`min-w-0 flex-1 p-4 lg:p-8 ${isMobile ? "ml-[72px]" : "ml-[260px]"}`}>{children}</main>
    </div>
  );
};

export default AdminLayout;