import { useState, useEffect } from "react";
import { api } from "../../api/client";
import { Observacion } from "../../types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, MessageSquare, Trash2, BookOpen, AlertTriangle, Heart } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Debe coincidir con los valores reales que usa el backend (ObservacionSchema.tipo,
// por defecto "Convivencial") y los datos sembrados en init.sql.
const tipoConfig: Record<string, { label: string; icon: typeof BookOpen; className: string }> = {
  "Académica": { label: "Académica", icon: BookOpen, className: "bg-primary/10 text-primary" },
  "Convivencial": { label: "Convivencial", icon: AlertTriangle, className: "bg-warning/10 text-warning" },
  "Reconocimiento": { label: "Reconocimiento", icon: Heart, className: "bg-chart-2/10 text-chart-2" },
};
const DEFAULT_TIPO = "Convivencial";

export const ObservacionesEstudiante = ({ estudianteId }: { estudianteId: number | string }) => {
  const [observaciones, setObservaciones] = useState<Observacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [contenido, setContenido] = useState("");
  const [tipo, setTipo] = useState(DEFAULT_TIPO);
  const [saving, setSaving] = useState(false);

  const fetchObservaciones = async () => {
    try {
      setLoading(true);
      // Petición a FastAPI
      const data = await api.get<Observacion[]>("/observaciones");
      // Filtrar por estudiante localmente o por parámetro si el endpoint lo admite
      const filtradas = data.filter((obs) => String(obs.estudiante_id) === String(estudianteId));
      setObservaciones(filtradas);
    } catch (error: any) {
      toast.error("Error al cargar observaciones desde la API");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (estudianteId) {
      fetchObservaciones();
    }
  }, [estudianteId]);

  const handleSave = async () => {
    if (!contenido.trim()) {
      toast.error("Escribe una observación");
      return;
    }
    setSaving(true);
    try {
      // POST a FastAPI con los campos esperados por PostgreSQL
      await api.post("/observaciones", {
        estudiante_id: Number(estudianteId),
        tipo,
        descripcion: contenido.trim(),
      });

      toast.success("Observación registrada");
      setContenido("");
      setShowForm(false);
      fetchObservaciones();
    } catch (error: any) {
      toast.error(`Error al guardar: ${error.message || "Fallo en la API"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      // DELETE a FastAPI
      await api.delete(`/observaciones/${id}`);
      toast.success("Observación eliminada");
      fetchObservaciones();
    } catch (error: any) {
      toast.error(`Error al eliminar: ${error.message || "Fallo en la API"}`);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> Observaciones
          <Badge variant="secondary" className="text-[10px]">{observaciones.length}</Badge>
        </h4>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3 h-3" /> Nueva
        </Button>
      </div>

      {showForm && (
        <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Académica">📚 Académica</SelectItem>
              <SelectItem value="Convivencial">⚠️ Convivencial</SelectItem>
              <SelectItem value="Reconocimiento">💚 Reconocimiento</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Escribe tu observación..."
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            className="min-h-[80px] text-sm"
            maxLength={500}
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-muted-foreground text-center py-4">Cargando observaciones...</p>
      ) : observaciones.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Sin observaciones registradas</p>
      ) : (
        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
          {observaciones.map((obs) => {
            const config = tipoConfig[obs.tipo || DEFAULT_TIPO] || tipoConfig[DEFAULT_TIPO];
            const Icon = config.icon;
            const fechaValida = obs.fecha ? new Date(obs.fecha) : new Date();

            return (
              <div key={obs.id} className="p-3 rounded-lg border border-border bg-card group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${config.className}`}>
                      <Icon className="w-3 h-3" />
                    </div>
                    <Badge variant="outline" className="text-[10px]">{config.label}</Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {format(fechaValida, "d MMM yyyy, HH:mm", { locale: es })}
                    </span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(obs.id)}
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{obs.descripcion}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ObservacionesEstudiante;