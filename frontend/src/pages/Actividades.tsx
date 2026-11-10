import { useState, useEffect } from "react";
import { Search, Plus, BookOpen, Calendar, CheckCircle2, Clock, MoreVertical, FileText, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/api/client";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";

interface ActividadView {
  id: string;
  titulo: string;
  tipo: string;
  grupo_id: string;
  grupo_nombre: string;
  fecha_entrega: string;
  estado: string;
  descripcion: string | null;
  entregados: number;
  totalEstudiantes: number;
  promedioCalificacion: number | null;
}

const getTipoBadge = (tipo: string) => {
  const styles: Record<string, string> = {
    tarea: "bg-primary/10 text-primary border-primary/20",
    examen: "bg-destructive/10 text-destructive border-destructive/20",
    proyecto: "bg-chart-4/10 text-chart-4 border-chart-4/20",
    participación: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  };
  return <Badge variant="outline" className={`text-[10px] ${styles[tipo] || ""}`}>{tipo ? tipo.charAt(0).toUpperCase() + tipo.slice(1) : ""}</Badge>;
};

const getEstadoBadge = (estado: string) => {
  switch (estado) {
    case "pendiente": return <Badge variant="outline" className="text-[10px]">Pendiente</Badge>;
    case "completada": return <Badge variant="default" className="text-[10px]">Completada</Badge>;
    case "vencida": return <Badge variant="destructive" className="text-[10px]">Vencida</Badge>;
    default: return null;
  }
};

const getEstadoIcon = (estado: string) => {
  switch (estado) {
    case "completada": return <CheckCircle2 className="w-5 h-5 text-primary" />;
    case "vencida": return <Clock className="w-5 h-5 text-destructive" />;
    default: return <FileText className="w-5 h-5 text-muted-foreground" />;
  }
};

const Actividades = () => {
  const [actividades, setActividades] = useState<ActividadView[]>([]);
  const [grupos, setGrupos] = useState<{ id: string; nombre: string }[]>([]);
  const [materias, setMaterias] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("todos");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [filterGrupo, setFilterGrupo] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitulo, setNewTitulo] = useState("");
  const [newTipo, setNewTipo] = useState("");
  const [newGrupoId, setNewGrupoId] = useState("");
  const [newMateriaId, setNewMateriaId] = useState("");
  const [newFecha, setNewFecha] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [gruposRes, actRes, matRes] = await Promise.all([
        api.get("/grupos"),
        api.get("/actividades"),
        api.get("/materias"),
      ]);

      const gruposList = Array.isArray(gruposRes) ? gruposRes : (gruposRes as any)?.items || [];
      const actList = Array.isArray(actRes) ? actRes : (actRes as any)?.items || [];
      const matList = Array.isArray(matRes) ? matRes : (matRes as any)?.items || [];

      setGrupos(gruposList);
      setMaterias(matList);

      const enriched = await Promise.all(
        actList.map(async (a: any) => {
          try {
            const [estCountRes, calRes] = await Promise.all([
              api.get(`/estudiantes?grupo_id=${a.grupo_id}`),
              api.get(`/calificaciones?actividad_id=${a.id}`),
            ]);

            const estList = Array.isArray(estCountRes) ? estCountRes : (estCountRes as any)?.items || [];
            const cals = Array.isArray(calRes) ? calRes : (calRes as any)?.items || [];

            // No existe un campo `entregado` en el backend: una calificación
            // registrada para esta actividad ya implica que fue entregada.
            const entregados = cals.length;
            const totalEstudiantes = estList.length || a.totalEstudiantes || 0;
            const calValues = cals.map((c: any) => Number(c.calificacion ?? Number(c.nota || 0) * 20)).filter((v: number) => !isNaN(v));
            const prom = calValues.length > 0 ? Math.round(calValues.reduce((s, v) => s + v, 0) / calValues.length) : null;

            let estado = a.estado || (a.fecha_entrega && new Date(a.fecha_entrega) < new Date() ? "vencida" : "pendiente");
            if (estado === "pendiente" && totalEstudiantes > 0 && entregados === totalEstudiantes) estado = "completada";

            return {
              id: a.id,
              titulo: a.titulo,
              tipo: a.tipo || "tarea",
              grupo_id: a.grupo_id,
              grupo_nombre: a.grupo_nombre || a.grupos?.nombre || "",
              fecha_entrega: a.fecha_entrega,
              estado,
              descripcion: a.descripcion,
              entregados,
              totalEstudiantes,
              promedioCalificacion: prom,
            };
          } catch {
            return {
              id: a.id,
              titulo: a.titulo,
              tipo: a.tipo || "tarea",
              grupo_id: a.grupo_id,
              grupo_nombre: a.grupo_nombre || "",
              fecha_entrega: a.fecha_entrega,
              estado: a.estado || (a.fecha_entrega && new Date(a.fecha_entrega) < new Date() ? "vencida" : "pendiente"),
              descripcion: a.descripcion,
              entregados: 0,
              totalEstudiantes: 0,
              promedioCalificacion: null,
            };
          }
        })
      );
      setActividades(enriched);
    } catch (error: any) {
      toast.error(error?.message || "Error al cargar las actividades");
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    if (!newTitulo || !newTipo || !newGrupoId || !newMateriaId || !newFecha) {
      toast.error("Completa los campos requeridos");
      return;
    }
    try {
      await api.post("/actividades", {
        titulo: newTitulo,
        tipo: newTipo,
        grupo_id: newGrupoId,
        fecha_entrega: newFecha,
        descripcion: newDesc || null,
        materia_id: newMateriaId || null,
      });
      toast.success("Actividad creada");
      setDialogOpen(false);
      setNewTitulo(""); setNewTipo(""); setNewGrupoId(""); setNewMateriaId(""); setNewFecha(""); setNewDesc("");
      fetchData();
    } catch (error: any) {
      toast.error(error?.message || "Error al crear actividad");
    }
  };

  const filtered = actividades.filter((a) => {
    const matchSearch = a.titulo?.toLowerCase().includes(search.toLowerCase());
    const matchTipo = filterTipo === "todos" || a.tipo === filterTipo;
    const matchEstado = filterEstado === "todos" || a.estado === filterEstado;
    const matchGrupo = filterGrupo === "todos" || a.grupo_id === filterGrupo;
    return matchSearch && matchTipo && matchEstado && matchGrupo;
  });

  const completadas = actividades.filter(a => a.estado === "completada").length;
  const vencidas = actividades.filter(a => a.estado === "vencida").length;
  const pendientes = actividades.filter(a => a.estado === "pendiente").length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Cargando actividades...</p></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Planeación docente" title="Actividades" description="Gestión de tareas, exámenes y calificaciones" actions={<Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Nueva Actividad</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card><CardContent className="flex items-center gap-4 p-5">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center"><BookOpen className="w-5 h-5 text-primary" /></div>
          <div><p className="text-2xl font-bold text-foreground">{actividades.length}</p><p className="text-xs text-muted-foreground">Total</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-5">
          <div className="w-11 h-11 rounded-xl bg-chart-3/10 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-chart-3" /></div>
          <div><p className="text-2xl font-bold text-foreground">{completadas}</p><p className="text-xs text-muted-foreground">Completadas</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-5">
          <div className="w-11 h-11 rounded-xl bg-chart-2/10 flex items-center justify-center"><Clock className="w-5 h-5 text-chart-2" /></div>
          <div><p className="text-2xl font-bold text-foreground">{pendientes}</p><p className="text-xs text-muted-foreground">Pendientes</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-5">
          <div className="w-11 h-11 rounded-xl bg-destructive/10 flex items-center justify-center"><Clock className="w-5 h-5 text-destructive" /></div>
          <div><p className="text-2xl font-bold text-destructive">{vencidas}</p><p className="text-xs text-muted-foreground">Vencidas</p></div>
        </CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar actividad..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            <SelectItem value="tarea">Tarea</SelectItem>
            <SelectItem value="examen">Examen</SelectItem>
            <SelectItem value="proyecto">Proyecto</SelectItem>
            <SelectItem value="participación">Participación</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="completada">Completada</SelectItem>
            <SelectItem value="vencida">Vencida</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterGrupo} onValueChange={setFilterGrupo}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Grupo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los grupos</SelectItem>
            {grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((act) => {
          const porcentajeEntrega = act.totalEstudiantes > 0 ? Math.round((act.entregados / act.totalEstudiantes) * 100) : 0;
          return (
            <Card key={act.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getEstadoIcon(act.estado)}</div>
                    <div className="space-y-1">
                      <p className="font-semibold text-sm text-foreground leading-tight">{act.titulo}</p>
                      <div className="flex items-center gap-2">
                        {getTipoBadge(act.tipo)}
                        <Badge variant="outline" className="text-[10px]">{act.grupo_nombre}</Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /><span>{act.fecha_entrega ? new Date(act.fecha_entrega).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : "N/A"}</span></div>
                  <div className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /><span>{act.entregados}/{act.totalEstudiantes} entregados</span></div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Progreso de entrega</span><span className="font-medium text-foreground">{porcentajeEntrega}%</span></div>
                  <Progress value={porcentajeEntrega} className="h-2" />
                </div>
                <div className="flex items-center justify-between">
                  {getEstadoBadge(act.estado)}
                  {act.promedioCalificacion !== null && (
                    <span className={`text-sm font-bold ${act.promedioCalificacion >= 80 ? "text-primary" : act.promedioCalificacion >= 70 ? "text-warning" : "text-destructive"}`}>Prom: {act.promedioCalificacion}%</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No se encontraron actividades</p>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Crear nueva actividad</DialogTitle><DialogDescription>Ingresa los datos de la actividad</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Título</Label><Input placeholder="Nombre de la actividad" value={newTitulo} onChange={(e) => setNewTitulo(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Tipo</Label>
                <Select value={newTipo} onValueChange={setNewTipo}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent><SelectItem value="tarea">Tarea</SelectItem><SelectItem value="examen">Examen</SelectItem><SelectItem value="proyecto">Proyecto</SelectItem><SelectItem value="participación">Participación</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Grupo</Label>
                <Select value={newGrupoId} onValueChange={setNewGrupoId}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Fecha de entrega</Label><Input type="date" value={newFecha} onChange={(e) => setNewFecha(e.target.value)} /></div>
            <div className="space-y-2"><Label>Materia</Label>
              <Select value={newMateriaId} onValueChange={setNewMateriaId}><SelectTrigger><SelectValue placeholder="Seleccionar materia" /></SelectTrigger>
                <SelectContent>{materias.map(m => <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Descripción (opcional)</Label><Textarea placeholder="Instrucciones" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Crear actividad</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Actividades;