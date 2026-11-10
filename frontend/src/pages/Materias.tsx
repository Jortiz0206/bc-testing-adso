import { useState, useEffect } from "react";
import { Plus, BookOpen, Trash2, Link2, Unlink, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/api/client";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";

interface Materia {
  id: string;
  nombre: string;
}

interface Grupo {
  id: string;
  nombre: string;
}

interface Docente {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
}

interface Asignacion {
  id: string;
  docente_id: string;
  docente: string;
  materia_id: string;
  grupo_id: string;
  materia_nombre: string;
  grupo_nombre: string;
}

const Materias = () => {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtro de búsqueda
  const [searchTerm, setSearchTerm] = useState("");

  // Materia form
  const [materiaDialog, setMateriaDialog] = useState(false);
  const [newMateria, setNewMateria] = useState("");

  // Asignacion form
  const [asignacionDialog, setAsignacionDialog] = useState(false);
  const [selMateriaId, setSelMateriaId] = useState("");
  const [selGrupoId, setSelGrupoId] = useState("");
  const [selDocenteId, setSelDocenteId] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [matRes, grupoRes, asigRes, docentesRes] = await Promise.all([
        api.get("/materias"),
        api.get("/grupos"),
        api.get("/asignaciones"),
        api.get("/catalogo/docentes"),
      ]);

      const materiasData = Array.isArray(matRes) ? matRes : (matRes as any)?.items || [];
      const gruposData = Array.isArray(grupoRes) ? grupoRes : (grupoRes as any)?.items || [];
      const asignacionesData = Array.isArray(asigRes) ? asigRes : (asigRes as any)?.items || [];
      const docentesData = Array.isArray(docentesRes) ? docentesRes : (docentesRes as any)?.items || [];

      setMaterias(materiasData.map((m: any) => ({ id: String(m.id), nombre: String(m.nombre || "") })));
      setGrupos(gruposData.map((g: any) => ({ id: String(g.id), nombre: String(g.nombre || "") })));
      setDocentes(docentesData.map((d: any) => ({ id: String(d.id), nombre: String(d.nombre || ""), apellido: String(d.apellido || ""), email: String(d.email || "") })));

      setAsignaciones(
        asignacionesData.map((a: any) => ({
          id: String(a.id),
          docente_id: String(a.docente_id),
          docente: String(a.docente || ""),
          materia_id: String(a.materia_id),
          grupo_id: String(a.grupo_id),
          materia_nombre: String(a.materia_nombre || a.materias?.nombre || ""),
          grupo_nombre: String(a.grupo_nombre || a.grupos?.nombre || ""),
        }))
      );
    } catch (error) {
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateMateria = async () => {
    if (!newMateria.trim()) { toast.error("Ingresa el nombre de la materia"); return; }
    try {
      await api.post("/materias", { nombre: newMateria.trim() });
      toast.success("¡Materia creada con éxito!");
      setMateriaDialog(false);
      setNewMateria("");
      fetchData();
    } catch (error) {
      toast.error("Error al crear materia");
    }
  };

  const handleDeleteMateria = async (id: string) => {
    try {
      await api.delete(`/materias/${id}`);
      toast.success("Materia eliminada");
      fetchData();
    } catch (error) {
      toast.error("Error al eliminar la materia");
    }
  };

  const handleCreateAsignacion = async () => {
    if (!selMateriaId || !selGrupoId || !selDocenteId) { toast.error("Selecciona docente, materia y grupo"); return; }
    const exists = asignaciones.find(a => a.materia_id === selMateriaId && a.grupo_id === selGrupoId);
    if (exists) { toast.error("Esta asignación ya existe para este grupo"); return; }
    try {
      await api.post("/asignaciones", {
        docente_id: Number(selDocenteId),
        materia_id: selMateriaId,
        grupo_id: selGrupoId,
      });
      toast.success("¡Asignación vinculada!");
      setAsignacionDialog(false);
      setSelMateriaId("");
      setSelGrupoId("");
      setSelDocenteId("");
      fetchData();
    } catch (error) {
      toast.error("Error al crear asignación");
    }
  };

  const handleDeleteAsignacion = async (id: string) => {
    try {
      await api.delete(`/asignaciones/${id}`);
      toast.success("Asignación desvinculada");
      fetchData();
    } catch (error) {
      toast.error("Error al eliminar asignación");
    }
  };

  // Filtrado de materias según la barra de búsqueda
  const filteredMaterias = materias.filter(m => 
    m.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const asignacionesByGrupo = grupos.map(g => ({
    ...g,
    materias: asignaciones.filter(a => a.grupo_id === g.id),
  })).filter(g => g.materias.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <BookOpen className="w-8 h-8 text-primary animate-bounce" />
          <p className="text-sm text-muted-foreground font-medium">Cargando materias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <PageHeader eyebrow="Estructura académica" title="Materias y asignaciones" description="Organiza asignaturas y vincúlalas con tus grupos" actions={<div className="flex items-center gap-3">
          <Button onClick={() => setMateriaDialog(true)} className="gap-2 rounded-2xl shadow-md" size="sm">
            <Plus className="w-4 h-4" /> Nueva Materia
          </Button>
          <Button onClick={() => setAsignacionDialog(true)} variant="secondary" className="gap-2 rounded-2xl shadow-sm" size="sm" disabled={materias.length === 0 || grupos.length === 0}>
            <Link2 className="w-4 h-4" /> Vincular a Grupo
          </Button>
        </div>} />

      {/* Tarjetas de métricas rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="rounded-3xl border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-black text-foreground">{materias.length}</p>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Materias Totales</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <Link2 className="w-7 h-7 text-blue-500" />
            </div>
            <div>
              <p className="text-3xl font-black text-foreground">{asignaciones.length}</p>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Asignaciones Activas</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <Unlink className="w-7 h-7 text-amber-500" />
            </div>
            <div>
              <p className="text-3xl font-black text-foreground">
                {grupos.filter(g => !asignaciones.some(a => a.grupo_id === g.id)).length}
              </p>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Grupos sin Asignar</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contenido principal en Pestañas */}
      <Tabs defaultValue="materias" className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-2xl">
          <TabsTrigger value="materias" className="rounded-xl px-6 font-semibold">Catálogo de Materias</TabsTrigger>
          <TabsTrigger value="asignaciones" className="rounded-xl px-6 font-semibold">Vista por Grupos</TabsTrigger>
        </TabsList>

        {/* Pestaña: Materias */}
        <TabsContent value="materias" className="space-y-4">
          <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar materia..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-2xl bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          <Card className="rounded-3xl border-slate-100 overflow-hidden shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold">Materia</TableHead>
                    <TableHead className="text-center font-bold">Grupos Asignados</TableHead>
                    <TableHead className="w-[80px] text-right font-bold"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterias.map((m) => {
                    const gruposCount = asignaciones.filter(a => a.materia_id === m.id).length;
                    return (
                      <TableRow key={m.id} className="hover:bg-slate-50/60 transition-colors">
                        <TableCell className="font-semibold text-sm text-foreground py-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-primary" />
                          </div>
                          {m.nombre}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="rounded-full px-3 py-0.5 text-xs font-bold">
                            {gruposCount} {gruposCount === 1 ? 'grupo' : 'grupos'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-destructive/10 text-destructive" onClick={() => handleDeleteMateria(m.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {filteredMaterias.length === 0 && (
                <div className="text-center py-16 space-y-3">
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
                    <BookOpen className="w-6 h-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No se encontraron materias registradas.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña: Asignaciones por grupo */}
        <TabsContent value="asignaciones" className="space-y-4">
          {asignacionesByGrupo.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-3">
              <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto">
                <Link2 className="w-6 h-6 text-blue-500" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Aún no hay asignaciones creadas</p>
              <p className="text-xs text-muted-foreground">Vincula materias a tus grupos para empezar a organizarte.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {asignacionesByGrupo.map((g) => (
                <Card key={g.id} className="rounded-3xl border-slate-100 shadow-sm hover:shadow-md transition-all">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-primary"></span>
                        {g.nombre}
                      </h3>
                      <Badge variant="outline" className="rounded-full text-xs font-semibold">
                        {g.materias.length} {g.materias.length === 1 ? 'materia' : 'materias'}
                      </Badge>
                    </div>

                    <div className="space-y-2.5">
                      {g.materias.map((a) => (
                        <div key={a.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100/80 group">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                              <BookOpen className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div>
                              <span className="text-sm font-medium text-slate-800">{a.materia_nombre}</span>
                              <p className="text-xs text-muted-foreground">{a.docente || "Docente sin nombre"}</p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10" 
                            onClick={() => handleDeleteAsignacion(a.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog: Nueva Materia */}
      <Dialog open={materiaDialog} onOpenChange={setMateriaDialog}>
        <DialogContent className="rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Crear nueva materia</DialogTitle>
            <DialogDescription>Ingresa el nombre de la asignatura académica.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label className="font-semibold">Nombre de la materia</Label>
              <Input 
                placeholder="Ej: Matemáticas Avanzadas" 
                value={newMateria} 
                onChange={(e) => setNewMateria(e.target.value)} 
                className="rounded-2xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMateriaDialog(false)} className="rounded-2xl">Cancelar</Button>
            <Button onClick={handleCreateMateria} className="rounded-2xl">Crear Materia</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nueva Asignación */}
      <Dialog open={asignacionDialog} onOpenChange={setAsignacionDialog}>
        <DialogContent className="rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Vincular Materia a Grupo</DialogTitle>
            <DialogDescription>Selecciona el docente, la materia y el grupo escolar correspondiente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label className="font-semibold">Docente</Label>
              <Select value={selDocenteId} onValueChange={setSelDocenteId}>
                <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Seleccionar docente" /></SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {docentes.map(d => <SelectItem key={d.id} value={d.id}>{[d.nombre, d.apellido].filter(Boolean).join(" ")} ({d.email})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Materia</Label>
              <Select value={selMateriaId} onValueChange={setSelMateriaId}>
                <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Seleccionar materia" /></SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {materias.map(m => <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Grupo</Label>
              <Select value={selGrupoId} onValueChange={setSelGrupoId}>
                <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Seleccionar grupo" /></SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAsignacionDialog(false)} className="rounded-2xl">Cancelar</Button>
            <Button onClick={handleCreateAsignacion} className="rounded-2xl">Vincular</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Materias;