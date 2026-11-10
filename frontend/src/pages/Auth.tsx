import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, Lock, ArrowRight } from "lucide-react";
import logoC from "@/assets/logo-ClassKids.png";
import { api } from "@/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { noClipboardProps } from "@/lib/passwordField";

const Auth = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post("/auth/login", { email, password });
      
      const authResponse = response as { access_token?: string; token?: string; user?: { id: number; email: string; nombre?: string; apellido?: string; rol?: string } };
      const token = authResponse.access_token || authResponse.token;
      if (!token || !authResponse.user) throw new Error("Respuesta de autenticación inválida");
      login(token, authResponse.user);

      toast.success("¡Bienvenido a ClassKids!");
      navigate("/app", { replace: true });
    } catch (error: any) {
      const msg = error?.message || "";
      toast.error(
        msg.includes("credentials") || msg.includes("Invalid")
          ? "Credenciales inválidas"
          : msg.includes("confirmed")
          ? "Confirma tu email antes de iniciar sesión"
          : msg || "Error al iniciar sesión"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Ingresa tu email");
      return;
    }
    setLoading(true);

    try {
      const response = await api.post<{ reset_token?: string }>("/auth/forgot-password", {
        email,
        redirect_to: `${window.location.origin}/reset-password`,
      });
      toast.success("Revisa tu correo para restablecer tu contraseña");
      if (response.reset_token) navigate(`/reset-password?token=${encodeURIComponent(response.reset_token)}`);
      setShowReset(false);
    } catch (error: any) {
      toast.error(error?.message || "Error al enviar el enlace de recuperación");
    } finally {
      setLoading(false);
    }
  };

  if (showReset) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-background flex items-center justify-center p-4">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-warning/10 blur-3xl" />
        <Card className="relative w-full max-w-md animate-fade-in shadow-xl shadow-foreground/5">
          <CardContent className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <img src={logoC} alt="ClassKids" className="w-14 h-14 mx-auto rounded-xl shadow-lg shadow-primary/20" />
              <h1 className="text-2xl font-bold text-foreground">Restablecer contraseña</h1>
              <p className="text-sm text-muted-foreground">Ingresa tu email para recibir un enlace</p>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="reset-email" type="email" placeholder="docente@escuela.edu" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Enviando..." : "Enviar enlace"}
              </Button>
              <button type="button" onClick={() => setShowReset(false)} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
                Volver al inicio de sesión
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background flex items-center justify-center p-4">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-warning/10 blur-3xl" />
      <Card className="relative w-full max-w-md animate-fade-in shadow-xl shadow-foreground/5">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <img src={logoC} alt="ClassKids" className="w-14 h-14 mx-auto rounded-xl shadow-lg shadow-primary/20" />
            <h1 className="text-2xl font-bold text-foreground">ClassKids</h1>
            <p className="text-sm text-muted-foreground">
              Inicia sesión en tu cuenta
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="docente@escuela.edu" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type="password" placeholder="••••••••" className="pl-10" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="current-password" {...noClipboardProps} />
              </div>
            </div>

            <button type="button" onClick={() => setShowReset(true)} className="text-xs text-primary hover:underline">
              ¿Olvidaste tu contraseña?
            </button>

            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? "Cargando..." : "Iniciar sesión"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Las cuentas son creadas por el administrador. Si necesitas acceso, contacta a la coordinación de tu institución.
            </p>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;