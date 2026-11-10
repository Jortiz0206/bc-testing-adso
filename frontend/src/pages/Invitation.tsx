import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, Mail } from "lucide-react";
import { noClipboardProps } from "@/lib/passwordField";

interface Invitation {
  email: string;
  rol: string;
}

const Invitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api.get<Invitation>(`/invitaciones/${encodeURIComponent(token)}`)
      .then(setInvitation)
      .catch(() => toast.error("La invitación es inválida o expiró"))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirmation) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/invitaciones/${encodeURIComponent(token || "")}/aceptar`, { nombre: name, apellido: lastName, password });
      toast.success("Cuenta activada. Ya puedes iniciar sesión.");
      navigate("/auth", { replace: true });
    } catch (error: any) {
      toast.error(error?.message || "No se pudo activar la cuenta");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Activa tu cuenta</h1>
            <p className="text-sm text-muted-foreground">
              {loading ? "Validando invitación..." : invitation ? `Invitación para ${invitation.email}` : "Invitación inválida o expirada"}
            </p>
          </div>
          {invitation && (
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invitation-name">Nombres</Label>
                  <Input id="invitation-name" value={name} onChange={(event) => setName(event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invitation-lastname">Apellidos</Label>
                  <Input id="invitation-lastname" value={lastName} onChange={(event) => setLastName(event.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invitation-email">Correo</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="invitation-email" value={invitation.email} className="pl-10" disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invitation-password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="invitation-password" type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} className="pl-10" required autoComplete="new-password" {...noClipboardProps} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invitation-confirmation">Confirmar contraseña</Label>
                <Input id="invitation-confirmation" type="password" minLength={6} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required autoComplete="new-password" {...noClipboardProps} />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Activando..." : "Activar cuenta"}
              </Button>
            </form>
          )}
          {!loading && !invitation && <Button className="w-full" onClick={() => navigate("/auth")}>Volver al inicio de sesión</Button>}
        </CardContent>
      </Card>
    </div>
  );
};

export default Invitation;
