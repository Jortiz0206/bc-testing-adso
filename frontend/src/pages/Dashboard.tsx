import { useState, useEffect } from "react";
import { Users, GraduationCap, BookOpen, AlertTriangle, Bell, Search, ArrowUpRight, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import StatCard from "@/components/dashboard/StatCard";
import AlertsPanel from "../components/dashboard/AlertsPanel";
import PerformanceChart from "../components/dashboard/PerformanceChart";
import RecentStudents from "@/components/dashboard/RecentStudents";
import { api } from "@/api/client";
import { toast } from "sonner";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ grupos: 0, estudiantes: 0, actividades: 0, alertas: 0 });
  const [search, setSearch] = useState("");

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (!search.trim()) return;
    navigate(`/app/estudiantes?buscar=${encodeURIComponent(search.trim())}`);
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [gRes, eRes, aRes, alRes] = await Promise.all([
          api.get("/grupos"),
          api.get("/estudiantes"),
          api.get("/actividades"),
          api.get("/alertas"),
        ]);

        const gruposList = Array.isArray(gRes) ? gRes : (gRes as any)?.items || [];
        const estudiantesList = Array.isArray(eRes) ? eRes : (eRes as any)?.items || [];
        const actividadesList = Array.isArray(aRes) ? aRes : (aRes as any)?.items || [];
        const alertasList = Array.isArray(alRes) ? alRes : (alRes as any)?.items || [];

        setStats({
          grupos: gruposList.length,
          estudiantes: estudiantesList.length,
          actividades: actividadesList.length,
          alertas: alertasList.length,
        });
      } catch (error) {
        toast.error("Error al cargar las estadísticas del dashboard");
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Resumen de la jornada</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Hola, {[user?.nombre, user?.apellido].filter(Boolean).join(" ") || "Docente"}.</h1>
          <p className="mt-1 text-sm text-muted-foreground">Aquí tienes una lectura rápida de tus grupos y estudiantes.</p>
        </div>
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar estudiante..."
              className="pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all w-[240px]"
            />
          </form>
          <Link to="/app/alertas" aria-label="Ver alertas" className="relative rounded-lg border border-border bg-card p-2 transition-colors hover:bg-secondary">
            <Bell className="w-5 h-5 text-muted-foreground" />
            {stats.alertas > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-[10px] text-destructive-foreground font-bold flex items-center justify-center animate-pulse-gentle">{stats.alertas}</span>}
          </Link>
        </div>
      </div>

      <div className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-xl border border-primary/20 bg-primary/[0.06] px-5 py-4">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative"><p className="text-sm font-semibold text-foreground">Mantén el seguimiento al día</p><p className="mt-1 text-xs text-muted-foreground">Registra una actividad o revisa los casos que necesitan atención.</p></div>
        <div className="relative flex flex-wrap gap-2"><Link to="/app/actividades"><button className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/30 transition-all hover:opacity-90 hover:shadow-md"><Plus className="h-3.5 w-3.5" /> Nueva actividad</button></Link><Link to="/app/alertas" className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-secondary">Revisar alertas <ArrowUpRight className="h-3.5 w-3.5" /></Link></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Grupos" value={stats.grupos} change="" changeType="positive" variant="primary" delay={0} />
        <StatCard icon={GraduationCap} label="Estudiantes" value={stats.estudiantes} change="" changeType="positive" variant="default" delay={80} />
        <StatCard icon={BookOpen} label="Actividades" value={stats.actividades} change="" changeType="neutral" variant="default" delay={160} />
        <StatCard icon={AlertTriangle} label="Alertas Activas" value={stats.alertas} change="" changeType="negative" variant="warning" delay={240} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 animate-fade-in [animation-delay:320ms] opacity-0 [animation-fill-mode:forwards]">
        <div className="lg:col-span-3"><PerformanceChart /></div>
        <div className="lg:col-span-2"><AlertsPanel /></div>
      </div>

      <div className="animate-fade-in [animation-delay:400ms] opacity-0 [animation-fill-mode:forwards]">
        <RecentStudents />
      </div>
    </div>
  );
};

export default Dashboard;