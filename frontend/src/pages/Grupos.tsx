import { useState, useEffect } from "react";
import { Search, Plus, Users, TrendingUp, MoreVertical, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { api } from "@/api/client";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import logoC from "@/assets/logo-ClassKids.png";

interface GrupoRow {
  id: string;
  nombre: string;
  grado: string;
  turno: string;
  color: string;
  user_id?: string;
  estudiantesCount?: number;
  actividadesCount?: number;
  alertasCount?: number;
  promedioGeneral?: number;
}

const getPerformanceColor = (promedio: number) => {
  if (promedio >= 90) return "text-emerald-500";
  if (promedio >= 80) return "text-primary";
  if (promedio >= 70) return "text-amber-500";
  return "text-destructive";
};

const getPerformanceLabel = (promedio: number) => {
  if (promedio >= 90) return "Excelente";
  if (promedio >= 80) return "Bueno";
  if (promedio >= 70) return "Regular";
  return "En riesgo";
};

const getPerformanceBadgeVariant = (promedio: number): "default" | "secondary" | "destructive" | "outline" => {
  if (promedio >= 90) return "default";
  if (promedio >= 80) return "secondary";
  return "destructive";
};

// Cursos disponibles para el selector de "Nuevo grupo": de 1° a 5°, secciones A y B.
// Reemplaza la digitación libre del nombre/grado por una lista cerrada de valores válidos.
const CURSOS_DISPONIBLES = ["1°", "2°", "3°", "4°", "5°"].flatMap((grado) =>
  ["A", "B"].map((seccion) => ({
    value: `${grado}${seccion}`,
    grado,
    nombre: `Grado ${grado.replace("°", "")}${seccion}`,
  })),
);

// La tabla `grupos` no tiene columna `color`; se deriva un color estable a partir
// del nombre para poder distinguir tarjetas sin depender de un campo inexistente.
const AVATAR_PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];
const colorForGrupo = (nombre: string) => {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash = (hash * 31 + nombre.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
};

const Grupos = () => {
  const [grupos, setGrupos] = useState<GrupoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterGrado, setFilterGrado] = useState("todos");
  const [filterTurno, setFilterTurno] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCurso, setNewCurso] = useState("");
  const [newTurno, setNewTurno] = useState("");

  const fetchGrupos = async () => {
    setLoading(true);
    try {
      const [gruposRes, estRes, actRes, alertasRes, calsRes] = await Promise.all([
        api.get("/grupos"),
        api.get("/estudiantes"),
        api.get("/actividades"),
        api.get("/alertas"),
        api.get("/calificaciones"),
      ]);

      const gruposData = Array.isArray(gruposRes) ? gruposRes : (gruposRes as any)?.items || [];
      const estudiantesData = Array.isArray(estRes) ? estRes : (estRes as any)?.items || [];
      const actividadesData = Array.isArray(actRes) ? actRes : (actRes as any)?.items || [];
      const alertasData = Array.isArray(alertasRes) ? alertasRes : (alertasRes as any)?.items || [];
      const calificacionesData = Array.isArray(calsRes) ? calsRes : (calsRes as any)?.items || [];

      const enriched: GrupoRow[] = gruposData.map((g: any) => {
        const grupoEstudiantes = estudiantesData.filter((e: any) => String(e.grupo_id) === String(g.id));
        const estIds = new Set(grupoEstudiantes.map((e: any) => String(e.id)));

        const grupoActividades = actividadesData.filter((a: any) => String(a.grupo_id) === String(g.id));
        const grupoAlertas = alertasData.filter((al: any) => estIds.has(String(al.estudiante_id)) && String(al.estado || "").toLowerCase() !== "resolved" && String(al.estado || "") !== "Resuelta");
        const grupoCalificaciones = calificacionesData.filter((c: any) => estIds.has(String(c.estudiante_id)));

        const promedio = grupoCalificaciones.length > 0
          ? Math.round((grupoCalificaciones.reduce((s: number, c: any) => s + Number(c.calificacion ?? c.nota * 20), 0) / grupoCalificaciones.length))
          : 0;

        return {
          id: String(g.id),
          nombre: String(g.nombre || ""),
          grado: String(g.grado || "1°"),
          turno: String(g.turno || "Matutino"),
          color: colorForGrupo(String(g.nombre || g.id)),
          estudiantesCount: grupoEstudiantes.length,
          actividadesCount: grupoActividades.length,
          alertasCount: grupoAlertas.length,
          promedioGeneral: promedio,
        };
      });

      setGrupos(enriched);
    } catch (error) {
      toast.error("Error cargando grupos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGrupos(); }, []);

  const handleCreate = async () => {
    const curso = CURSOS_DISPONIBLES.find((c) => c.value === newCurso);
    if (!curso || !newTurno) {
      toast.error("Completa todos los campos");
      return;
    }
    try {
      await api.post("/grupos", {
        nombre: curso.nombre,
        grado: curso.grado,
        turno: newTurno,
      });
      toast.success("Grupo creado");
      setDialogOpen(false);
      setNewCurso("");
      setNewTurno("");
      fetchGrupos();
    } catch (error) {
      toast.error("Error al crear grupo");
    }
  };

  const filtered = grupos.filter((g) => {
    const matchSearch = g.nombre.toLowerCase().includes(search.toLowerCase()) || g.grado.toLowerCase().includes(search.toLowerCase());
    const matchGrado = filterGrado === "todos" || g.grado === filterGrado;
    const matchTurno = filterTurno === "todos" || g.turno === filterTurno;
    return matchSearch && matchGrado && matchTurno;
  });

  const totalEstudiantes = grupos.reduce((s, g) => s + (g.estudiantesCount || 0), 0);
  const promedioGlobal = grupos.length > 0 ? Math.round(grupos.reduce((s, g) => s + (g.promedioGeneral || 0), 0) / grupos.length) : 0;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Cargando grupos...</p></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Estructura académica" title="Grupos" description="Gestión y seguimiento de grupos académicos" actions={<Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Nuevo Grupo
        </Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{grupos.length}</p>
              <p className="text-xs text-muted-foreground">Grupos activos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="w-11 h-11 rounded-xl bg-chart-2/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-chart-2" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalEstudiantes}</p>
              <p className="text-xs text-muted-foreground">Estudiantes totales</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="w-11 h-11 rounded-xl bg-chart-3/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-chart-3" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${getPerformanceColor(promedioGlobal)}`}>{promedioGlobal}%</p>
              <p className="text-xs text-muted-foreground">Promedio global</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar grupo..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterGrado} onValueChange={setFilterGrado}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Grado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los grados</SelectItem>
            {Array.from(new Set(grupos.map((g) => g.grado))).sort().map((grado) => (
              <SelectItem key={grado} value={grado}>{grado}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterTurno} onValueChange={setFilterTurno}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Turno" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los turnos</SelectItem>
            <SelectItem value="Matutino">Matutino</SelectItem>
            <SelectItem value="Vespertino">Vespertino</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((grupo) => (
          <Card key={grupo.id} className="group hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center p-1.5" style={{ backgroundColor: grupo.color }}>
                    <img src={logoC} alt="ClassKids" className="w-full h-full rounded-md object-contain" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{grupo.nombre}</CardTitle>
                    <p className="text-xs text-muted-foreground">{grupo.grado} · {grupo.turno}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {(grupo.alertasCount || 0) > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">{grupo.alertasCount} alertas</Badge>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-bold text-foreground">{grupo.estudiantesCount}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Estudiantes</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{grupo.actividadesCount}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Actividades</p>
                </div>
                <div>
                  <p className={`text-lg font-bold ${getPerformanceColor(grupo.promedioGeneral || 0)}`}>{grupo.promedioGeneral}%</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Promedio</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Rendimiento</span>
                  <Badge variant={getPerformanceBadgeVariant(grupo.promedioGeneral || 0)} className="text-[10px] h-5">
                    {getPerformanceLabel(grupo.promedioGeneral || 0)}
                  </Badge>
                </div>
                <Progress value={grupo.promedioGeneral || 0} className="h-2" />
              </div>
              <Button variant="ghost" className="w-full justify-between text-xs text-muted-foreground hover:text-foreground">
                Ver detalle del grupo <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No se encontraron grupos</p>
          <p className="text-sm text-muted-foreground/60">Intenta con otros filtros de búsqueda</p>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear nuevo grupo</DialogTitle>
            <DialogDescription>Ingresa los datos del grupo académico</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Curso</Label>
              <Select value={newCurso} onValueChange={setNewCurso}>
                <SelectTrigger><SelectValue placeholder="Seleccionar curso" /></SelectTrigger>
                <SelectContent>
                  {CURSOS_DISPONIBLES.map((curso) => (
                    <SelectItem key={curso.value} value={curso.value}>{curso.value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Turno</Label>
              <Select value={newTurno} onValueChange={setNewTurno}>
                <SelectTrigger><SelectValue placeholder="Seleccionar turno" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Matutino">Matutino</SelectItem>
                  <SelectItem value="Vespertino">Vespertino</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Crear grupo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Grupos;