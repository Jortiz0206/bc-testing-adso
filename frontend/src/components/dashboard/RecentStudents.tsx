import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { Estudiante, Grupo } from "../../types";

interface StudentView {
  id: number | string;
  name: string;
  group: string;
  average: number;
  status: "risk" | "watch" | "good";
  trend: string;
}

const statusConfig = {
  risk: { label: "En riesgo", className: "bg-destructive/10 text-destructive" },
  watch: { label: "Observar", className: "bg-warning/10 text-warning" },
  good: { label: "Buen nivel", className: "bg-success/10 text-success" },
};

const trendConfig: Record<string, string> = {
  up: "↑",
  down: "↓",
  stable: "→",
};

export const RecentStudents = () => {
  const [students, setStudents] = useState<StudentView[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);

        // Peticiones paralelas al backend en FastAPI
        const [estudiantes, grupos, calificaciones] = await Promise.all([
          api.get<Estudiante[]>("/estudiantes"),
          api.get<Grupo[]>("/grupos"),
          api.get<any[]>("/calificaciones"),
        ]);

        if (!estudiantes || estudiantes.length === 0) {
          setStudents([]);
          setLoading(false);
          return;
        }

        // Mapa de ID de Grupo -> Nombre del Grupo
        const gruposMap = new Map(grupos.map((g) => [g.id, g.nombre]));

        // Mapa de ID de Estudiante -> Lista de Calificaciones (nota + periodo)
        const calMap = new Map<number | string, { nota: number; periodo: number }[]>();
        calificaciones.forEach((c) => {
          const estId = c.estudiante_id;
          if (estId !== undefined && c.nota !== undefined) {
            if (!calMap.has(estId)) calMap.set(estId, []);
            calMap.get(estId)!.push({ nota: Number(c.nota), periodo: Number(c.periodo || 1) });
          }
        });

        // Tomamos los primeros 6 estudiantes
        const recent = estudiantes.slice(0, 6);

        const enriched: StudentView[] = recent.map((e) => {
          const calsList = calMap.get(e.id) || [];
          const avg =
            calsList.length > 0
              ? Math.round((calsList.reduce((s, c) => s + c.nota, 0) / calsList.length) * 20)
              : 0;

          const status: "risk" | "watch" | "good" =
            avg > 0 && avg < 70 ? "risk" : avg >= 70 && avg < 80 ? "watch" : "good";

          // No existe columna `tendencia` en el backend: se calcula comparando el
          // promedio del primer y el último periodo con calificaciones reales.
          const periodos = Array.from(new Set(calsList.map((c) => c.periodo))).sort((a, b) => a - b);
          let trend = "stable";
          if (periodos.length >= 2) {
            const avgFor = (p: number) => {
              const notas = calsList.filter((c) => c.periodo === p).map((c) => c.nota);
              return notas.length > 0 ? notas.reduce((a, b) => a + b, 0) / notas.length : null;
            };
            const primero = avgFor(periodos[0]);
            const ultimo = avgFor(periodos[periodos.length - 1]);
            if (primero !== null && ultimo !== null) {
              if (ultimo > primero + 0.1) trend = "up";
              else if (ultimo < primero - 0.1) trend = "down";
            }
          }

          return {
            id: e.id,
            name: `${e.nombre} ${e.apellido}`,
            group: e.grupo_id ? gruposMap.get(e.grupo_id) || "" : "",
            average: avg,
            status,
            trend,
          };
        });

        setStudents(enriched);
      } catch (error) {
        console.error("Error al cargar estudiantes destacados:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 animate-fade-in">
        <h3 className="font-semibold text-card-foreground mb-4">Estudiantes Destacados</h3>
        <p className="text-sm text-muted-foreground text-center py-8">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-card-foreground">Estudiantes Destacados</h3>
        <button
          onClick={() => navigate("/estudiantes")}
          className="text-xs text-primary font-medium hover:underline"
        >
          Ver todos
        </button>
      </div>
      {students.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Sin estudiantes registrados
        </p>
      ) : (
        <div className="space-y-2">
          {students.map((s) => {
            const config = statusConfig[s.status];
            return (
              <div
                key={s.id}
                onClick={() => navigate(`/estudiantes`)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {s.name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.group}</p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <span className="text-sm font-bold text-card-foreground">
                    {s.average}% {trendConfig[s.trend] || "→"}
                  </span>
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${config.className}`}
                  >
                    {config.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecentStudents;