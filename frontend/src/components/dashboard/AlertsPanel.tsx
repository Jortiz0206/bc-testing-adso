import { useState, useEffect } from "react";
import { AlertTriangle, Clock, TrendingDown } from "lucide-react";
import { api } from "../../api/client";
import { Alerta } from "../../types";
import { tiempoTranscurrido } from "@/lib/fechas";
import { esAlertaActiva } from "@/lib/rendimiento";

interface AlertUI {
  id: number;
  student: string;
  group: string;
  type: string;
  message: string;
  date: string;
}

const typeConfig: Record<string, { icon: typeof AlertTriangle; color: string; bg: string }> = {
  "Bajo Rendimiento": { icon: TrendingDown, color: "text-destructive", bg: "bg-destructive/10" },
  "Inasistencia": { icon: Clock, color: "text-warning", bg: "bg-warning/10" },
  "Seguimiento": { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
  "critical": { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
};

const AlertsPanel = () => {
  const [alerts, setAlerts] = useState<AlertUI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        // Llamada a tu API local en FastAPI
        const data = await api.get<Alerta[]>("/alertas");

        // Mapeo desde la estructura de FastAPI hacia la interfaz visual
        // Solo las alertas sin resolver: el contador dice "activas".
        const mapped: AlertUI[] = (data || []).filter(esAlertaActiva).map((a) => ({
          id: a.id,
          student: `${a.estudiante_nombre || ""} ${a.estudiante_apellido || ""}`.trim() || "Estudiante",
          group: "Activo",
          type: a.tipo,
          message: a.mensaje,
          date: a.fecha_creacion ? tiempoTranscurrido(a.fecha_creacion) : "Reciente",
        }));

        setAlerts(mapped);
      } catch (error) {
        console.error("Error cargando alertas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  return (
    <div className="bg-card rounded-xl border border-border p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-card-foreground">Alertas Tempranas</h3>
        <span className="text-xs bg-destructive/10 text-destructive font-semibold px-2.5 py-1 rounded-full">
          {alerts.length} activas
        </span>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Cargando desde FastAPI...</p>
      ) : alerts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Sin alertas activas</p>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const config = typeConfig[alert.type] || typeConfig["Seguimiento"];
            const Icon = config.icon;
            return (
              <div key={alert.id} className="flex gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer group">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-card-foreground">{alert.student}</p>
                    <span className="text-[11px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{alert.group}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{alert.message}</p>
                </div>
                <span className="text-[11px] text-muted-foreground flex-shrink-0">{alert.date}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AlertsPanel;