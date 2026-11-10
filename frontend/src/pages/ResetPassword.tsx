import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import logoC from "@/assets/logo-ClassKids.png";
import { noClipboardProps } from "@/lib/passwordField";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // El backend entrega el token de recuperación como query param ?token=...
    // (ver enviar_reset_por_correo en backend/main.py). Sin token, el enlace
    // no es válido y se debe mostrar el mensaje de "enlace inválido o expirado".
    const token = new URLSearchParams(window.location.search).get("token");
    setReady(!!token);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      const token = new URLSearchParams(window.location.search).get("token");
      await api.post("/auth/reset-password", { password, token });
      toast.success("¡Contraseña actualizada con éxito!");
      navigate("/auth");
    } catch (error: any) {
      toast.error(error?.message || "Error al actualizar la contraseña");
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-3xl border-slate-100 shadow-lg">
          <CardContent className="p-8 text-center space-y-4">
            <img src={logoC} alt="ClassKids" className="w-16 h-16 mx-auto rounded-2xl shadow-sm" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Enlace inválido o expirado. Solicita un nuevo enlace de restablecimiento de contraseña.
            </p>
            <Button onClick={() => navigate("/auth")} className="w-full rounded-2xl h-11 font-semibold">
              Volver al inicio de sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-3xl border-slate-100 shadow-xl">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <img src={logoC} alt="ClassKids" className="w-16 h-16 mx-auto rounded-2xl shadow-sm" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Nueva contraseña</h1>
            <p className="text-sm text-muted-foreground">Ingresa y confirma tu nueva contraseña para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="font-semibold text-slate-700">Nueva contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="new-password" 
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-10 rounded-2xl bg-slate-50/50 border-slate-200 h-11" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  {...noClipboardProps}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="font-semibold text-slate-700">Confirmar contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="confirm-password" 
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-10 rounded-2xl bg-slate-50/50 border-slate-200 h-11" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  {...noClipboardProps}
                />
              </div>
            </div>

            <Button type="submit" className="w-full rounded-2xl h-11 font-semibold shadow-md shadow-primary/20 gap-2" disabled={loading}>
              {loading ? "Actualizando..." : "Actualizar contraseña"}
            </Button>
          </form>

          <div className="text-center pt-2">
            <button 
              type="button" 
              onClick={() => navigate("/auth")}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Volver al login
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;