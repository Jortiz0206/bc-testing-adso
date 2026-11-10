import { useEffect, useState } from "react";
import { api } from "@/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { UserPlus, Trash2, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type Row = { user_id: string; email: string; nombre?: string; apellido?: string; role: "admin" | "docente"; created_at: string; last_sign_in_at: string | null };

const AdminUsuarios = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "docente">("docente");
  const [submitting, setSubmitting] = useState(false);
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get("/usuarios");
      const list = Array.isArray(data) ? data : (data as any)?.items || (data as any)?.data || [];
      setRows(list);
    } catch (error: any) {
      toast.error(error?.message || "Error al cargar los usuarios");
      setRows([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const invite = async () => {
    if (!email) return;
    setSubmitting(true);
    try {
      const response = await api.post<{ email_sent: boolean; invitation_url: string }>("/usuarios/invitar", { email, role });
      setInvitationUrl(response.invitation_url);
      if (response.email_sent) {
        toast.success(`Invitación enviada a ${email}`);
      } else {
        toast.success("Invitación creada en modo de prueba", { description: "Usa el enlace mostrado para activarla." });
      }
      setEmail(""); 
      load();
    } catch (error: any) {
      toast.error(error?.message || "Error al enviar la invitación");
    }
    setSubmitting(false);
  };

  const changeRole = async (target_user_id: string, newRole: "admin" | "docente") => {
    try {
      await api.put(`/usuarios/${target_user_id}/rol`, { role: newRole });
      toast.success("Rol actualizado");
      load();
    } catch (error: any) {
      toast.error(error?.message || "Error al actualizar el rol");
    }
  };

  const removeUser = async (target_user_id: string, email: string) => {
    if (!confirm(`¿Eliminar a ${email}? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/usuarios/${target_user_id}`);
      toast.success("Usuario eliminado");
      load();
    } catch (error: any) {
      toast.error(error?.message || "Error al eliminar el usuario");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Administración</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">Usuarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestiona docentes y administradores de la plataforma.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><UserPlus className="w-4 h-4" /> Invitar docente</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invitar nuevo usuario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Correo electrónico</Label>
                <Input type="email" placeholder="docente@escuela.edu" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={role} onValueChange={(v) => setRole(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="docente">Docente</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground flex gap-2">
                <Mail className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                Se enviará un correo al usuario con un enlace para crear su contraseña y acceder a ClassKids.
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={invite} disabled={submitting || !email}>
                {submitting ? "Enviando..." : "Enviar invitación"}
              </Button>
            </DialogFooter>
            {invitationUrl && (
              <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <Label htmlFor="invitation-url">Enlace de prueba</Label>
                <Input id="invitation-url" value={invitationUrl} readOnly onFocus={(event) => event.currentTarget.select()} />
                <Button type="button" variant="outline" className="w-full" onClick={() => navigator.clipboard.writeText(invitationUrl)}>
                  Copiar enlace
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Última conexión</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Cargando...</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin usuarios</TableCell></TableRow>
            ) : rows.map(r => {
              const isSelf = r.user_id === (user as any)?.id;
              const nombreCompleto = [r.nombre, r.apellido].filter(Boolean).join(" ");
              return (
                <TableRow key={r.user_id}>
                  <TableCell className="text-sm text-muted-foreground">{nombreCompleto || "—"}</TableCell>
                  <TableCell className="font-medium">
                    {r.email} {isSelf && <span className="text-xs text-muted-foreground ml-1">(tú)</span>}
                  </TableCell>
                  <TableCell>
                    <Select value={r.role} onValueChange={(v) => changeRole(r.user_id, v as any)} disabled={isSelf}>
                      <SelectTrigger className="w-[150px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="docente">Docente</SelectItem>
                        <SelectItem value="admin"><span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Admin</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.last_sign_in_at ? new Date(r.last_sign_in_at).toLocaleString("es") : <span className="italic">Nunca</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleDateString("es") : "N/A"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" disabled={isSelf} onClick={() => removeUser(r.user_id, r.email)} className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default AdminUsuarios;