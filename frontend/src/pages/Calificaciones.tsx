import { useState, useEffect } from "react";
import { Search, Save, CheckCircle2, Users, BookOpen, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/api/client";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import { construirFilas, payloadCalificacion, resumenCalificaciones, type CalificacionRow } from "@/lib/calificaciones";
import { limitarPorcentaje } from "@/lib/rendimiento";

interface Grupo { id: string; nombre: string; }
interface Actividad { id: string; titulo: string; tipo: string; grupo_id: string; }
interface Estudiante { id: string; nombre: string; apellido: string; }
const Calificaciones = () => {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [selectedGrupo, setSelectedGrupo] = useState("");
  const [selectedActividad, setSelectedActividad] = useState("");
  const [calificaciones, setCalificaciones] = useState<CalificacionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchGrupos = async () => {
      try {
        const res = await api.get("/grupos");
        const data = Array.isArray(res) ? res : (res as any)?.items || [];
        setGrupos(data);
      } catch (error) {
        toast.error("Error al cargar los grupos");
      }
    };
    fetchGrupos();
  }, []);

  useEffect(() => {
    if (!selectedGrupo) { 
      setActividades([]); 
      setSelectedActividad(""); 
      return; 
    }
    const fetchActividades = async () => {
      try {
        const res = await api.get(`/actividades?grupo_id=${selectedGrupo}`);
        const data = Array.isArray(res) ? res : (res as any)?.items || [];
        const filtered = data.filter((a: any) => String(a.grupo_id) === String(selectedGrupo));
        setActividades(filtered);
        setSelectedActividad("");
      } catch (error) {
        toast.error("Error al cargar las actividades");
      }
    };
    fetchActividades();
  }, [selectedGrupo]);

  useEffect(() => {
    if (!selectedGrupo || !selectedActividad) { 
      setCalificaciones([]); 
      return; 
    }
    loadCalificaciones();
  }, [selectedActividad]);

  const loadCalificaciones = async () => {
    setLoading(true);
    try {
      const [estRes, calRes] = await Promise.all([
        api.get(`/estudiantes?grupo_id=${selectedGrupo}`),
        api.get("/calificaciones"),
      ]);

      const estudiantes = Array.isArray(estRes) ? estRes : (estRes as any)?.items || [];
      const calificacionesApi = Array.isArray(calRes) ? calRes : (calRes as any)?.items || [];
      const rows = construirFilas({ estudiantes, calificaciones: calificacionesApi, grupoId: selectedGrupo, actividadId: selectedActividad });
      setCalificaciones(rows);
    } catch (error) {
      toast.error("Error al cargar las calificaciones");
    } finally {
      setLoading(false);
    }
  };

  const updateCalificacion = (idx: number, value: number) => {
    setCalificaciones(prev => prev.map((c, i) => i === idx ? { ...c, calificacion: limitarPorcentaje(value) } : c));
  };

  const toggleEntregado = (idx: number) => {
    setCalificaciones(prev => prev.map((c, i) => i === idx ? { ...c, entregado: !c.entregado } : c));
  };

  const handleSave = async () => {
    if (!selectedActividad) return;
    setSaving(true);
    try {
      for (const c of calificaciones) {
        const materiaId = Number((actividades.find((item) => String(item.id) === String(selectedActividad)) as any)?.materia_id);
        const payload = payloadCalificacion(c, materiaId, Number(selectedActividad));

        if (c.id) {
          await api.put(`/calificaciones/${c.id}`, payload);
        } else {
          await api.post("/calificaciones", payload);
        }
      }
      toast.success("Calificaciones guardadas correctamente");
      loadCalificaciones();
    } catch (error) {
      toast.error("Error al guardar calificaciones");
    } finally {
      setSaving(false);
    }
  };

  const { promedio, entregados, aprobados } = resumenCalificaciones(calificaciones);

  const getCalColor = (cal: number) => {
    if (cal >= 90) return "text-emerald-600 dark:text-emerald-400";
    if (cal >= 70) return "text-primary";
    if (cal > 0) return "text-destructive";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Evidencia de aprendizaje" title="Calificaciones" description="Asigna y consulta calificaciones por actividad" actions={calificaciones.length > 0 && (
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        )} />

      {/* Selectors */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedGrupo} onValueChange={setSelectedGrupo}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Seleccionar grupo" /></SelectTrigger>
          <SelectContent>
            {grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedActividad} onValueChange={setSelectedActividad} disabled={!selectedGrupo}>
          <SelectTrigger className="w-[260px]"><SelectValue placeholder="Seleccionar actividad" /></SelectTrigger>
          <SelectContent>
            {actividades.map(a => (
              <SelectItem key={a.id} value={a.id}>
                {a.titulo} <span className="text-muted-foreground ml-1">({a.tipo})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      {calificaciones.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card><CardContent className="flex items-center gap-4 p-5">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center"><Users className="w-5 h-5 text-primary" /></div>
            <div><p className="text-2xl font-bold text-foreground">{calificaciones.length}</p><p className="text-xs text-muted-foreground">Estudiantes</p></div>
          </CardContent></Card>
          <Card><CardContent className="flex items-center gap-4 p-5">
            <div className="w-11 h-11 rounded-xl bg-chart-2/10 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-chart-2" /></div>
            <div><p className="text-2xl font-bold text-foreground">{entregados}/{calificaciones.length}</p><p className="text-xs text-muted-foreground">Entregados</p></div>
          </CardContent></Card>
          <Card><CardContent className="flex items-center gap-4 p-5">
            <div className="w-11 h-11 rounded-xl bg-chart-3/10 flex items-center justify-center"><Award className="w-5 h-5 text-chart-3" /></div>
            <div><p className="text-2xl font-bold text-foreground">{aprobados}</p><p className="text-xs text-muted-foreground">Aprobados (≥70)</p></div>
          </CardContent></Card>
          <Card><CardContent className="flex items-center gap-4 p-5">
            <div className="w-11 h-11 rounded-xl bg-chart-4/10 flex items-center justify-center"><BookOpen className="w-5 h-5 text-chart-4" /></div>
            <div><p className={`text-2xl font-bold ${getCalColor(promedio)}`}>{promedio}%</p><p className="text-xs text-muted-foreground">Promedio</p></div>
          </CardContent></Card>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40"><p className="text-muted-foreground">Cargando...</p></div>
      ) : calificaciones.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Estudiante</TableHead>
                  <TableHead className="w-[140px] text-center">Calificación</TableHead>
                  <TableHead className="w-[100px] text-center">Entregado</TableHead>
                  <TableHead className="w-[100px] text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calificaciones.map((c, i) => (
                  <TableRow key={c.estudiante_id}>
                    <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary">{c.nombre[0]}{c.apellido[0]}</span>
                        </div>
                        <span className="font-medium text-sm text-foreground">{c.apellido}, {c.nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={c.calificacion}
                        onChange={(e) => updateCalificacion(i, Number(e.target.value))}
                        className={`w-20 mx-auto text-center font-bold ${getCalColor(c.calificacion)}`}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={c.entregado} onCheckedChange={() => toggleEntregado(i)} />
                    </TableCell>
                    <TableCell className="text-center">
                      {c.calificacion >= 90 ? (
                        <Badge variant="default" className="text-[10px]">Excelente</Badge>
                      ) : c.calificacion >= 70 ? (
                        <Badge variant="secondary" className="text-[10px]">Aprobado</Badge>
                      ) : c.calificacion > 0 ? (
                        <Badge variant="destructive" className="text-[10px]">Reprobado</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Sin calif.</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : selectedActividad ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No hay estudiantes en este grupo</p>
        </div>
      ) : (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Selecciona un grupo y una actividad</p>
          <p className="text-sm text-muted-foreground/60">para ver y asignar calificaciones</p>
        </div>
      )}
    </div>
  );
};

export default Calificaciones;