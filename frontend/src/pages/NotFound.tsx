import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Ghost, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: Intento de acceso a ruta inexistente:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="text-center max-w-md w-full bg-white p-10 rounded-3xl shadow-lg border border-slate-100">
        {/* Icono decorativo */}
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Ghost className="w-10 h-10 text-primary animate-bounce" />
        </div>
        
        <h1 className="text-6xl font-black text-slate-900 mb-2">404</h1>
        <h2 className="text-2xl font-bold text-slate-800 mb-4">¡Página no encontrada!</h2>
        <p className="text-slate-600 mb-8 leading-relaxed">
          Parece que te has perdido en el aula. No te preocupes, esto le pasa hasta a los mejores estudiantes. 
          Vamos a regresar al panel principal.
        </p>
        
        <Link to="/">
          <Button className="w-full gap-2 rounded-2xl h-12 font-semibold shadow-md shadow-primary/20">
            <ArrowLeft className="w-4 h-4" /> Volver al Inicio
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;