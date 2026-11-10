import { useEffect, useState } from "react";
import { api } from "@/api/client";
import { Users, GraduationCap, BookOpen, AlertTriangle, ShieldCheck, UserCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import PageHeader from "@/components/layout/PageHeader";

const Stat = ({ icon: Icon, label, value, tone, delay = 0 }: any) => (
  <Card
    className="group p-5 animate-fade-in opacity-0 [animation-fill-mode:forwards] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-foreground/5"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${tone}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </Card>
);

const AdminDashboard = () => {
  const [s, setS] = useState({ docentes: 0, admins: 0, grupos: 0, estudiantes: 0, actividades: 0, alertas: 0 });

  useEffect(() => {
    (async () => {
      try {
        const [docentesRes, adminsRes, gruposRes, estudiantesRes, actividadesRes, alertasRes] = await Promise.all([
          api.get('/docentes/count').catch(() => ({ count: 0 })),
          api.get('/admins/count').catch(() => ({ count: 0 })),
          api.get('/grupos/count').catch(() => ({ count: 0 })),
          api.get('/estudiantes/count').catch(() => ({ count: 0 })),
          api.get('/actividades/count').catch(() => ({ count: 0 })),
          api.get('/alertas/activas/count').catch(() => ({ count: 0 })),
        ]);

        setS({
          docentes: (docentesRes as any)?.count || (docentesRes as any)?.total || 0,
          admins: (adminsRes as any)?.count || (adminsRes as any)?.total || 0,
          grupos: (gruposRes as any)?.count || (gruposRes as any)?.total || 0,
          estudiantes: (estudiantesRes as any)?.count || (estudiantesRes as any)?.total || 0,
          actividades: (actividadesRes as any)?.count || (actividadesRes as any)?.total || 0,
          alertas: (alertasRes as any)?.count || (alertasRes as any)?.total || 0,
        });
      } catch (error) {
        console.error("Error al cargar las métricas del dashboard:", error);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Administración" title="Panel de administración" description="Métricas globales y control de la plataforma" />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Stat icon={UserCheck} label="Docentes" value={s.docentes} tone="bg-primary/10 text-primary" delay={0} />
        <Stat icon={ShieldCheck} label="Administradores" value={s.admins} tone="bg-accent/30 text-accent-foreground" delay={60} />
        <Stat icon={Users} label="Grupos totales" value={s.grupos} tone="bg-info/10 text-info" delay={120} />
        <Stat icon={GraduationCap} label="Estudiantes totales" value={s.estudiantes} tone="bg-primary/10 text-primary" delay={180} />
        <Stat icon={BookOpen} label="Actividades" value={s.actividades} tone="bg-muted text-muted-foreground" delay={240} />
        <Stat icon={AlertTriangle} label="Alertas activas" value={s.alertas} tone="bg-destructive/10 text-destructive" delay={300} />
      </div>

      <Card className="p-6 animate-fade-in [animation-delay:380ms] opacity-0 [animation-fill-mode:forwards]">
        <h2 className="font-semibold text-foreground mb-2">¿Cómo funciona la creación de usuarios?</h2>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-5">
          <li>Vas a <Link to="/admin/usuarios" className="text-primary font-medium hover:underline">Usuarios</Link> y haces clic en "Invitar docente".</li>
          <li>Ingresas el correo del docente y el rol (docente o administrador).</li>
          <li>El sistema envía un correo de invitación con un enlace seguro al docente.</li>
          <li>El docente abre el enlace, define su contraseña y queda activo automáticamente.</li>
          <li>Tú puedes cambiar su rol o eliminarlo desde la misma pantalla.</li>
        </ol>
      </Card>
    </div>
  );
};

export default AdminDashboard;