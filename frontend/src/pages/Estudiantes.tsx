import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Plus, GraduationCap, TrendingUp, TrendingDown, AlertTriangle, ChevronRight, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/api/client";
import { toast } from "sonner";
import ObservacionesEstudiante from "@/components/students/ObservacionesEstudiante";
import PageHeader from "@/components/layout/PageHeader";
import { enriquecerEstudiantes, filtrarEstudiantes, validarFormularioEstudiante, type EstudianteView } from "@/lib/estudiantes";

const getEstadoBadge = (estado: string) => {
  switch (estado) {
    case "activo": return <Badge variant="default" className="text-[10px]">Activo</Badge>;
    case "en riesgo": return <Badge variant="secondary" className="text-[10px] bg-warning/15 text-warning-foreground border-warning/30">En riesgo</Badge>;
    case "crítico": return <Badge variant="destructive" className="text-[10px]">Crítico</Badge>;
    default: return <Badge variant="outline" className="text-[10px]">Activo</Badge>;
  }
};

const getTendenciaIcon = (tendencia: string) => {
  switch (tendencia) {
    case "up": return <TrendingUp className="w-4 h-4 text-primary" />;
    case "down": return <TrendingDown className="w-4 h-4 text-destructive" />;
    default: return <div className="w-4 h-4 rounded-full bg-muted" />;
  }
};

const getInitials = (nombre: string, apellido: string) => `${nombre?.[0] || ""}${apellido?.[0] || ""}`.toUpperCase();

const avatarColors = [
  "bg-primary/15 text-primary",
  "bg-chart-2/15 text-chart-2",
  "bg-chart-3/15 text-chart-3",
  "bg-chart-4/15 text-chart-4",
  "bg-chart-5/15 text-chart-5",
];

const Estudiantes = () => {
  const [estudiantes, setEstudiantes] = useState<EstudianteView[]>([]);
  const [grupos, setGrupos] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("buscar") || "");
  const [filterGrupo, setFilterGrupo] = useState("todos");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEstudiante, setSelectedEstudiante] = useState<EstudianteView | null>(null);
  const [editingEstudiante, setEditingEstudiante] = useState<EstudianteView | null>(null);
  const [newDocumento, setNewDocumento] = useState("");
  const [newNombre, setNewNombre] = useState("");
  const [newApellido, setNewApellido] = useState("");
  const [newGrupoId, setNewGrupoId] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [gruposRes, estRes, calsRes, alertasRes] = await Promise.all([
        api.get("/grupos"),
        api.get("/estudiantes"),
        api.get("/calificaciones"),
        api.get("/alertas"),
      ]);

      const gruposList = Array.isArray(gruposRes) ? gruposRes : (gruposRes as any)?.items || [];
      setGrupos(gruposList);

      const ests = Array.isArray(estRes) ? estRes : (estRes as any)?.items || [];
      const cals = Array.isArray(calsRes) ? calsRes : (calsRes as any)?.items || [];
      const alertas = Array.isArray(alertasRes) ? alertasRes : (alertasRes as any)?.items || [];

      const enriched = enriquecerEstudiantes({ estudiantes: ests, calificaciones: cals, alertas, grupos: gruposList });
      setEstudiantes(enriched);
    } catch (error) {
      toast.error("Error al cargar los estudiantes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    const error = validarFormularioEstudiante({ documento: newDocumento, nombre: newNombre, apellido: newApellido, grupoId: newGrupoId });
    if (error) {
      toast.error(error);
      return;
    }
    try {
      const payload = {
        documento: newDocumento,
        nombre: newNombre, 
        apellido: newApellido, 
        grupo_id: newGrupoId,
        activo: true,
      };
      if (editingEstudiante) {
        await api.put(`/estudiantes/${editingEstudiante.id}`, payload);
        toast.success("Estudiante actualizado");
      } else {
        await api.post("/estudiantes", payload);
        toast.success("Estudiante registrado");
      }
      setDialogOpen(false);
      setEditingEstudiante(null);
      setNewDocumento("");
      setNewNombre(""); 
      setNewApellido(""); 
      setNewGrupoId("");
      fetchData();
    } catch (error) {
      toast.error("Error al registrar estudiante");
    }
  };

  const openCreateDialog = () => {
    setEditingEstudiante(null);
    setNewDocumento("");
    setNewNombre("");
    setNewApellido("");
    setNewGrupoId("");
    setDialogOpen(true);
  };

  const openEditDialog = (estudiante: EstudianteView) => {
    setSelectedEstudiante(null);
    setEditingEstudiante(estudiante);
    setNewDocumento(estudiante.documento || "");
    setNewNombre(estudiante.nombre);
    setNewApellido(estudiante.apellido);
    setNewGrupoId(estudiante.grupo_id);
    setDialogOpen(true);
  };

  const filtered = filtrarEstudiantes(estudiantes, { busqueda: search, grupo: filterGrupo, estado: filterEstado });

  const enRiesgo = estudiantes.filter(e => e.estado === "en riesgo" || e.estado === "crítico").length;
  const promedioGeneral = estudiantes.length > 0 
    ? Math.round(estudiantes.reduce((s, e) => s + e.promedio, 0) / estudiantes.length) 
    : 0;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Cargando estudiantes...</p></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Comunidad escolar" title="Estudiantes" description="Seguimiento individual de cada estudiante" actions={<Button onClick={openCreateDialog} className="gap-2">
          <Plus className="w-4 h-4" /> Nuevo Estudiante
        </Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="flex items-center gap-4 p-5">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center"><GraduationCap className="w-5 h-5 text-primary" /></div>
          <div><p className="text-2xl font-bold text-foreground">{estudiantes.length}</p><p className="text-xs text-muted-foreground">Total estudiantes</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-5">
          <div className="w-11 h-11 rounded-xl bg-destructive/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-destructive" /></div>
          <div><p className="text-2xl font-bold text-destructive">{enRiesgo}</p><p className="text-xs text-muted-foreground">En riesgo o crítico</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-5">
          <div className="w-11 h-11 rounded-xl bg-chart-3/10 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-chart-3" /></div>
          <div><p className="text-2xl font-bold text-foreground">{promedioGeneral}%</p><p className="text-xs text-muted-foreground">Promedio general</p></div>
        </CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input aria-label="Buscar estudiante" placeholder="Buscar estudiante..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterGrupo} onValueChange={setFilterGrupo}>
          <SelectTrigger className="w-[160px]" aria-label="Filtrar por grupo"><SelectValue placeholder="Grupo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los grupos</SelectItem>
            {grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-[140px]" aria-label="Filtrar por estado"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="activo">Activo</SelectItem>
            <SelectItem value="en riesgo">En riesgo</SelectItem>
            <SelectItem value="crítico">Crítico</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estudiante</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead className="text-center">Promedio</TableHead>
                <TableHead className="text-center">Tendencia</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-center">Alertas</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((est, idx) => (
                <TableRow key={est.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedEstudiante(est)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className={`text-xs font-semibold ${avatarColors[idx % avatarColors.length]}`}>
                          {getInitials(est.nombre, est.apellido)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="font-medium text-sm text-foreground">{est.nombre} {est.apellido}</p>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{est.grupo_nombre}</Badge></TableCell>
                  <TableCell className="text-center">
                    <span className={`font-bold text-sm ${est.promedio >= 80 ? "text-primary" : est.promedio >= 70 ? "text-warning" : "text-destructive"}`}>{est.promedio}%</span>
                  </TableCell>
                  <TableCell className="text-center">{getTendenciaIcon(est.tendencia)}</TableCell>
                  <TableCell className="text-center">{getEstadoBadge(est.estado)}</TableCell>
                  <TableCell className="text-center">
                    {est.alertas > 0 ? <Badge variant="destructive" className="text-[10px] px-1.5">{est.alertas}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell><Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Ver a ${est.nombre} ${est.apellido}`}><ChevronRight className="w-4 h-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <GraduationCap className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No se encontraron estudiantes</p>
        </div>
      )}

      <Dialog open={!!selectedEstudiante} onOpenChange={() => setSelectedEstudiante(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          {selectedEstudiante && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="text-base font-bold bg-primary/15 text-primary">
                      {getInitials(selectedEstudiante.nombre, selectedEstudiante.apellido)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <DialogTitle>{selectedEstudiante.nombre} {selectedEstudiante.apellido}</DialogTitle>
                    <DialogDescription>Grupo {selectedEstudiante.grupo_nombre}</DialogDescription>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEditDialog(selectedEstudiante)}>
                    <Pencil className="w-3.5 h-3.5" /> Editar
                  </Button>
                </div>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Promedio</p>
                  <p className={`text-xl font-bold ${selectedEstudiante.promedio >= 80 ? "text-primary" : selectedEstudiante.promedio >= 70 ? "text-warning" : "text-destructive"}`}>{selectedEstudiante.promedio}%</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Estado:</span>{getEstadoBadge(selectedEstudiante.estado)}</div>
                  <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Tendencia:</span>{getTendenciaIcon(selectedEstudiante.tendencia)}</div>
                </div>
                {selectedEstudiante.alertas > 0 && (
                  <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/15 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <p className="text-xs text-destructive">{selectedEstudiante.alertas} alerta(s) activa(s)</p>
                  </div>
                )}
                <div className="border-t border-border pt-3">
                  <ObservacionesEstudiante estudianteId={selectedEstudiante.id} />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEstudiante ? "Editar estudiante" : "Registrar nuevo estudiante"}</DialogTitle>
            <DialogDescription>{editingEstudiante ? "Actualiza los datos del estudiante" : "Ingresa los datos del estudiante"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label htmlFor="estudiante-documento">Documento</Label><Input id="estudiante-documento" placeholder="Número de documento" value={newDocumento} onChange={(e) => setNewDocumento(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="estudiante-nombre">Nombre</Label><Input id="estudiante-nombre" placeholder="Nombre" value={newNombre} onChange={(e) => setNewNombre(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="estudiante-apellido">Apellido</Label><Input id="estudiante-apellido" placeholder="Apellido" value={newApellido} onChange={(e) => setNewApellido(e.target.value)} /></div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estudiante-grupo">Grupo</Label>
              <Select value={newGrupoId} onValueChange={setNewGrupoId}>
                <SelectTrigger id="estudiante-grupo"><SelectValue placeholder="Seleccionar grupo" /></SelectTrigger>
                <SelectContent>{grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingEstudiante ? "Guardar cambios" : "Registrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Estudiantes;