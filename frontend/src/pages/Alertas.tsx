import { useState, useEffect } from "react";
import { AlertTriangle, Clock, TrendingDown, CheckCircle, Filter, Bell, BellOff, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/api/client";
import PageHeader from "@/components/layout/PageHeader";
import { toast } from "sonner";

type AlertType = "declining" | "low_grade" | "attendance" | "critical";
type AlertStatus = "active" | "reviewed" | "resolved";

interface AlertView {
  id: string;
  student: string;
  group: string;
  type: AlertType;
  status: AlertStatus;
  message: string;
  detail: string;
  date: string;
  priority: string;
}

const typeConfig: Record<AlertType, { icon: typeof AlertTriangle; label: string; color: string; bg: string }> = {
  critical: { icon: AlertTriangle, label: "Crítico", color: "text-destructive", bg: "bg-destructive/10" },
  low_grade: { icon: TrendingDown, label: "Calificación baja", color: "text-destructive", bg: "bg-destructive/10" },
  attendance: { icon: Clock, label: "Asistencia", color: "text-warning", bg: "bg-warning/10" },
  declining: { icon: TrendingDown, label: "Tendencia", color: "text-warning", bg: "bg-warning/10" },
};

const statusConfig: Record<AlertStatus, { label: string; color: string; bg: string }> = {
  active: { label: "Activa", color: "text-destructive", bg: "bg-destructive/10" },
  reviewed: { label: "Revisada", color: "text-info", bg: "bg-info/10" },
  resolved: { label: "Resuelta", color: "text-success", bg: "bg-success/10" },
};

const normalizeStatus = (status: string): AlertStatus => {
  if (status === "Pendiente") return "active";
  if (status === "Revisada") return "reviewed";
  if (status === "Resuelta") return "resolved";
  return status as AlertStatus;
};

// El backend guarda `tipo` como texto libre (ej. "Bajo Rendimiento", "Inasistencia",
// "Seguimiento", o "low_grade" generado automáticamente), no como un enum cerrado.
// Se infiere la categoría visual por palabras clave en vez de comparar el string exacto.
const inferType = (tipo: string): AlertType => {
  const t = (tipo || "").toLowerCase();
  if (t.includes("crítico") || t.includes("critico") || t.includes("critical")) return "critical";
  if (t.includes("bajo rendimiento") || t.includes("low_grade") || t.includes("calificaci")) return "low_grade";
  if (t.includes("inasistencia") || t.includes("attendance") || t.includes("asistencia")) return "attendance";
  return "declining";
};

const priorityByType: Record<AlertType, string> = {
  critical: "alta",
  low_grade: "alta",
  attendance: "media",
  declining: "baja",
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return `Hace ${Math.floor(diffDays / 7)} semana(s)`;
};

const Alertas = () => {
  const [alerts, setAlerts] = useState<AlertView[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedAlert, setSelectedAlert] = useState<AlertView | null>(null);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await api.get("/alertas");
      const list = Array.isArray(data) ? data : (data as any)?.items || (data as any)?.data || [];

      const mapped: AlertView[] = list.map((a: any) => {
        const type = inferType(a.tipo);
        return {
          id: a.id,
          student: [a.estudiante_nombre, a.estudiante_apellido].filter(Boolean).join(" ") || "Estudiante",
          group: "",
          type,
          status: normalizeStatus(a.estado),
          message: a.mensaje,
          detail: a.tipo || "",
          date: formatDate(a.fecha_creacion),
          priority: priorityByType[type],
        };
      });
      setAlerts(mapped);
    } catch (error: any) {
      toast.error(error?.message || "Error cargando alertas");
      setAlerts([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAlerts(); }, []);

  const updateStatus = async (id: string, status: AlertStatus) => {
    try {
      await api.put(`/alertas/${id}/estado`, { estado: status });
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      setSelectedAlert(null);
      toast.success("Alerta actualizada");
    } catch (error: any) {
      toast.error(error?.message || "Error actualizando alerta");
    }
  };

  const filtered = alerts.filter((a) => {
    if (filterType !== "all" && a.type !== filterType) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    return true;
  });

  const activeCount = alerts.filter(a => a.status === "active").length;
  const reviewedCount = alerts.filter(a => a.status === "reviewed").length;
  const resolvedCount = alerts.filter(a => a.status === "resolved").length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Cargando alertas...</p></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Seguimiento" title="Alertas tempranas" description="Revisa señales y registra el acompañamiento de cada caso" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center"><Bell className="w-5 h-5 text-destructive" /></div>
          <div><p className="text-2xl font-bold text-card-foreground">{activeCount}</p><p className="text-xs text-muted-foreground">Alertas Activas</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center"><Eye className="w-5 h-5 text-info" /></div>
          <div><p className="text-2xl font-bold text-card-foreground">{reviewedCount}</p><p className="text-xs text-muted-foreground">En Revisión</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-success" /></div>
          <div><p className="text-2xl font-bold text-card-foreground">{resolvedCount}</p><p className="text-xs text-muted-foreground">Resueltas</p></div>
        </CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="text-sm border border-border bg-card rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring/25">
          <option value="all">Todos los tipos</option>
          <option value="critical">Crítico</option>
          <option value="declining">Tendencia</option>
          <option value="low_grade">Calificación baja</option>
          <option value="attendance">Asistencia</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-sm border border-border bg-card rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring/25">
          <option value="all">Todos los estados</option>
          <option value="active">Activas</option>
          <option value="reviewed">Revisadas</option>
          <option value="resolved">Resueltas</option>
        </select>
        <span className="text-sm text-muted-foreground ml-auto">{filtered.length} alertas</span>
      </div>

      <div className="space-y-3">
        {filtered.map((alert) => {
          const config = typeConfig[alert.type] || typeConfig.declining;
          const sConfig = statusConfig[alert.status] || statusConfig.active;
          const Icon = config.icon;
          return (
            <Card key={alert.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedAlert(alert)}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg}`}><Icon className={`w-5 h-5 ${config.color}`} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-card-foreground">{alert.student}</p>
                    {alert.group && <span className="text-[11px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">{alert.group}</span>}
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${sConfig.bg} ${sConfig.color}`}>{sConfig.label}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${alert.priority === "alta" ? "bg-destructive/10 text-destructive" : alert.priority === "media" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"}`}>Prioridad {alert.priority}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">{alert.date}</span>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <BellOff className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No hay alertas con los filtros seleccionados</p>
          </div>
        )}
      </div>

      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAlert && (() => { const Icon = typeConfig[selectedAlert.type]?.icon || AlertTriangle; return <Icon className={`w-5 h-5 ${typeConfig[selectedAlert.type]?.color}`} />; })()}
              Detalle de Alerta
            </DialogTitle>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-card-foreground text-lg">{selectedAlert.student}</span>
                {selectedAlert.group && <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">{selectedAlert.group}</span>}
              </div>
              <div className="flex gap-2">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${typeConfig[selectedAlert.type]?.bg} ${typeConfig[selectedAlert.type]?.color}`}>{typeConfig[selectedAlert.type]?.label}</span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusConfig[selectedAlert.status]?.bg} ${statusConfig[selectedAlert.status]?.color}`}>{statusConfig[selectedAlert.status]?.label}</span>
              </div>
              <div className="bg-muted/50 rounded-lg p-4"><p className="text-sm text-card-foreground leading-relaxed">{selectedAlert.detail || selectedAlert.message}</p></div>
              <p className="text-xs text-muted-foreground">Fecha: {selectedAlert.date}</p>
              <div className="flex gap-2 pt-2">
                {selectedAlert.status === "active" && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus(selectedAlert.id, "reviewed")}><Eye className="w-4 h-4 mr-1" /> Marcar como revisada</Button>
                )}
                {selectedAlert.status !== "resolved" && (
                  <Button size="sm" onClick={() => updateStatus(selectedAlert.id, "resolved")}><CheckCircle className="w-4 h-4 mr-1" /> Resolver</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Alertas;