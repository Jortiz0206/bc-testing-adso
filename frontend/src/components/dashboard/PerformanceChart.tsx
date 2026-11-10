import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { api } from "../../api/client";
import { Materia } from "../../types";

interface MateriaRendimiento {
  subject: string;
  promedio: number;
}

export const PerformanceChart = () => {
  const [data, setData] = useState<MateriaRendimiento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [materias, calificaciones] = await Promise.all([
          api.get<Materia[]>("/materias"),
          api.get<any[]>("/calificaciones"),
        ]);

        const materiaCalMap = new Map<number | string, number[]>();
        calificaciones.forEach((c) => {
          const valorNota = c.calificacion ?? c.nota;
          const materiaId = c.materia_id;
          if (materiaId !== undefined && valorNota !== undefined) {
            if (!materiaCalMap.has(materiaId)) materiaCalMap.set(materiaId, []);
            materiaCalMap.get(materiaId)!.push(Number(valorNota));
          }
        });

        const result: MateriaRendimiento[] = materias
          .map((m) => {
            const cals = materiaCalMap.get(m.id) || [];
            const prom = cals.length > 0 ? Math.round((cals.reduce((s, v) => s + v, 0) / cals.length) * 20) : 0;
            return { subject: m.nombre, promedio: prom };
          })
          .filter((m) => m.promedio > 0);

        setData(result);
      } catch (error) {
        console.error("Error al cargar datos del gráfico:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getBarColor = (value: number) => {
    if (value >= 90) return "hsl(152, 55%, 42%)";
    if (value >= 80) return "hsl(210, 70%, 55%)";
    if (value >= 70) return "hsl(36, 90%, 55%)";
    return "hsl(0, 72%, 55%)";
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 animate-fade-in">
        <h3 className="font-semibold text-card-foreground mb-4">Rendimiento por Materia</h3>
        <div className="h-[260px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5 animate-fade-in">
      <h3 className="font-semibold text-card-foreground mb-4">Rendimiento por Materia</h3>
      <div className="h-[260px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="subject"
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
                formatter={(value: number) => [`${value}%`, "Promedio"]}
              />
              <Bar dataKey="promedio" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {data.map((entry, index) => (
                  <Cell key={index} fill={getBarColor(entry.promedio)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Sin datos de calificaciones por materia</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceChart;