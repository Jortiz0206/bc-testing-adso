import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, TrendingDown, Users, AlertTriangle, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";
import { api } from "@/api/client";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import { calcularAnalisis } from "@/lib/analisis";

interface GrupoRendimiento { grupo: string; promedio: number; estudiantes: number; }
interface TendenciaItem { mes: string; promedio: number; }
interface DistribucionItem { name: string; value: number; color: string; }
interface EstudianteRiesgo {
  nombre: string; apellido: string; grupo: string; promedio: number;
  tendencia: string;
}
interface TipoRendimiento { tipo: string; promedio: number; }

const Analisis = () => {
  const [loading, setLoading] = useState(true);
  const [rendimientoPorGrupo, setRendimientoPorGrupo] = useState<GrupoRendimiento[]>([]);
  const [tendenciaMensual, setTendenciaMensual] = useState<TendenciaItem[]>([]);
  const [distribucionRiesgo, setDistribucionRiesgo] = useState<DistribucionItem[]>([]);
  const [estudiantesEnRiesgo, setEstudiantesEnRiesgo] = useState<EstudianteRiesgo[]>([]);
  const [rendimientoPorTipo, setRendimientoPorTipo] = useState<TipoRendimiento[]>([]);
  const [promedioGeneral, setPromedioGeneral] = useState(0);
  const [totalEstudiantes, setTotalEstudiantes] = useState(0);
  const [totalEnRiesgo, setTotalEnRiesgo] = useState(0);
  const [mejoraMensual, setMejoraMensual] = useState(0);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [gruposRes, estudiantesRes, calificacionesRes, actividadesRes] = await Promise.all([
        api.get("/grupos"),
        api.get("/estudiantes"),
        api.get("/calificaciones"),
        api.get("/actividades"),
      ]);

      const grupos = Array.isArray(gruposRes) ? gruposRes : (gruposRes as any)?.items || [];
      const estudiantes = Array.isArray(estudiantesRes) ? estudiantesRes : (estudiantesRes as any)?.items || [];
      const calificaciones = Array.isArray(calificacionesRes) ? calificacionesRes : (calificacionesRes as any)?.items || [];
      const actividades = Array.isArray(actividadesRes) ? actividadesRes : (actividadesRes as any)?.items || [];

      const resultado = calcularAnalisis({ grupos, estudiantes, calificaciones, actividades });
      const { excelente, bueno, regular, enRiesgo } = resultado.distribucion;
      setTotalEstudiantes(resultado.totalEstudiantes);
      setRendimientoPorGrupo(resultado.rendimientoPorGrupo);
      setPromedioGeneral(resultado.promedioGeneral);
      setDistribucionRiesgo([
        { name: "Excelente (≥90%)", value: excelente, color: "hsl(152, 55%, 42%)" },
        { name: "Bueno (≥80%)", value: bueno, color: "hsl(210, 70%, 55%)" },
        { name: "Regular (≥70%)", value: regular, color: "hsl(36, 90%, 55%)" },
        { name: "En riesgo (<70%)", value: enRiesgo, color: "hsl(0, 72%, 55%)" },
      ]);
      setTotalEnRiesgo(enRiesgo);
      setEstudiantesEnRiesgo(resultado.estudiantesEnRiesgo);
      setTendenciaMensual(resultado.tendenciaMensual);
      setMejoraMensual(resultado.mejoraMensual);
      setRendimientoPorTipo(resultado.rendimientoPorTipo);

    } catch (error: any) {
      toast.error(error?.message || "Error al cargar los datos de análisis");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Cargando análisis...</p></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Lectura pedagógica" title="Análisis de rendimiento" description="Datos en tiempo real para priorizar el acompañamiento" />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Target className="w-5 h-5 text-primary" /></div>
            <div><p className="text-2xl font-bold text-card-foreground">{promedioGeneral}%</p><p className="text-xs text-muted-foreground">Promedio General</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-chart-2/10 flex items-center justify-center"><Users className="w-5 h-5 text-chart-2" /></div>
            <div><p className="text-2xl font-bold text-card-foreground">{totalEstudiantes}</p><p className="text-xs text-muted-foreground">Estudiantes Activos</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-destructive" /></div>
            <div><p className="text-2xl font-bold text-card-foreground">{totalEnRiesgo}</p><p className="text-xs text-muted-foreground">En Riesgo Académico</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${mejoraMensual >= 0 ? "bg-chart-3/10" : "bg-destructive/10"}`}>
              {mejoraMensual >= 0 ? <TrendingUp className="w-5 h-5 text-chart-3" /> : <TrendingDown className="w-5 h-5 text-destructive" />}
            </div>
            <div>
              <p className={`text-2xl font-bold ${mejoraMensual >= 0 ? "text-chart-3" : "text-destructive"}`}>{mejoraMensual >= 0 ? "+" : ""}{mejoraMensual}%</p>
              <p className="text-xs text-muted-foreground">vs Mes Anterior</p>
            </div>
          </div>
        </CardContent></Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Rendimiento por Grupo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rendimientoPorGrupo.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={rendimientoPorGrupo} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                  <XAxis dataKey="grupo" fontSize={12} tick={{ fill: "hsl(215, 12%, 50%)" }} />
                  <YAxis domain={[0, 100]} fontSize={12} tick={{ fill: "hsl(215, 12%, 50%)" }} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(214, 20%, 90%)", fontSize: "13px" }}
                    formatter={(value: any, _: any, props: any) => [`${value}% (${props.payload.estudiantes} est.)`, "Promedio"]} />
                  <Bar dataKey="promedio" radius={[6, 6, 0, 0]}>
                    {rendimientoPorGrupo.map((entry, index) => (
                      <Cell key={index} fill={
                        entry.promedio >= 90 ? "hsl(152, 55%, 42%)" :
                        entry.promedio >= 80 ? "hsl(210, 70%, 55%)" :
                        entry.promedio >= 70 ? "hsl(36, 90%, 55%)" :
                        "hsl(0, 72%, 55%)"
                      } />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-10">Sin datos de calificaciones</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Distribución de Rendimiento</CardTitle>
          </CardHeader>
          <CardContent>
            {distribucionRiesgo.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={distribucionRiesgo} cx="50%" cy="45%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {distribucionRiesgo.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                  <Tooltip formatter={(value: any) => [`${value} estudiantes`]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-10">Sin datos</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Tendencia Mensual
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tendenciaMensual.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={tendenciaMensual}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                  <XAxis dataKey="mes" fontSize={12} tick={{ fill: "hsl(215, 12%, 50%)" }} />
                  <YAxis domain={[0, 100]} fontSize={12} tick={{ fill: "hsl(215, 12%, 50%)" }} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(214, 20%, 90%)", fontSize: "13px" }}
                    formatter={(value: any) => [`${value}%`, "Promedio"]} />
                  <Line type="monotone" dataKey="promedio" stroke="hsl(142, 60%, 40%)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(142, 60%, 40%)" }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-10">Sin datos históricos</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Rendimiento por Tipo de Actividad</CardTitle>
          </CardHeader>
          <CardContent>
            {rendimientoPorTipo.length > 0 ? (
              <div className="space-y-4 mt-2">
                {rendimientoPorTipo.map((item) => (
                  <div key={item.tipo}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-card-foreground">{item.tipo}</span>
                      <span className={`text-sm font-bold ${
                        item.promedio >= 90 ? "text-chart-3" :
                        item.promedio >= 80 ? "text-chart-2" :
                        item.promedio >= 70 ? "text-chart-4" :
                        "text-destructive"
                      }`}>{item.promedio}%</span>
                    </div>
                    <Progress value={item.promedio} className={`h-2 ${
                      item.promedio >= 90 ? "[&>div]:bg-chart-3" :
                      item.promedio >= 80 ? "[&>div]:bg-chart-2" :
                      item.promedio >= 70 ? "[&>div]:bg-chart-4" :
                      "[&>div]:bg-destructive"
                    }`} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-10">Sin datos</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Estudiantes en Riesgo */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" /> Estudiantes en Riesgo Académico
          </CardTitle>
        </CardHeader>
        <CardContent>
          {estudiantesEnRiesgo.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-3 font-semibold text-muted-foreground">Estudiante</th>
                    <th className="text-left py-3 px-3 font-semibold text-muted-foreground">Grupo</th>
                    <th className="text-left py-3 px-3 font-semibold text-muted-foreground">Promedio</th>
                    <th className="text-left py-3 px-3 font-semibold text-muted-foreground">Tendencia</th>
                    <th className="text-left py-3 px-3 font-semibold text-muted-foreground">Nivel</th>
                  </tr>
                </thead>
                <tbody>
                  {estudiantesEnRiesgo.map((est, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-3 font-medium text-card-foreground">{est.nombre} {est.apellido}</td>
                      <td className="py-3 px-3">
                        <span className="text-xs bg-secondary px-2 py-0.5 rounded text-secondary-foreground">{est.grupo}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`font-bold ${est.promedio < 60 ? "text-destructive" : "text-chart-4"}`}>{est.promedio}%</span>
                      </td>
                      <td className="py-3 px-3">
                        {est.tendencia === "down" ? (
                          <span className="flex items-center gap-1 text-destructive text-xs font-medium"><TrendingDown className="w-3.5 h-3.5" /> Bajando</span>
                        ) : est.tendencia === "up" ? (
                          <span className="flex items-center gap-1 text-chart-3 text-xs font-medium"><TrendingUp className="w-3.5 h-3.5" /> Subiendo</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Estable</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          est.promedio < 60 ? "bg-destructive/10 text-destructive" : "bg-chart-4/10 text-chart-4"
                        }`}>
                          {est.promedio < 60 ? "Crítico" : "En riesgo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-6">No hay estudiantes en riesgo 🎉</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Analisis;