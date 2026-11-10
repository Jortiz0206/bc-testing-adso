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

      setTotalEstudiantes(estudiantes.length);

      const estGrupoMap = new Map<string, string>(estudiantes.map((e: any) => [String(e.id), String(e.grupo_id)]));
      const grupoNameMap = new Map<string, string>(grupos.map((g: any) => [String(g.id), String(g.nombre)]));
      const actTipoMap = new Map<string, string>(actividades.map((a: any) => [String(a.id), String(a.tipo || "tarea")]));

      // --- Rendimiento por Grupo ---
      const grupoCalMap = new Map<string, number[]>();
      const grupoEstCount = new Map<string, number>();
      estudiantes.forEach((e: any) => {
        const gId = String(e.grupo_id);
        grupoEstCount.set(gId, (grupoEstCount.get(gId) || 0) + 1);
      });
      calificaciones.forEach((c: any) => {
        const gId = estGrupoMap.get(String(c.estudiante_id));
        if (gId) {
          if (!grupoCalMap.has(gId)) grupoCalMap.set(gId, []);
          grupoCalMap.get(gId)!.push(Number(c.calificacion ?? Number(c.nota || 0) * 20));
        }
      });
      const rpg: GrupoRendimiento[] = grupos.map((g: any) => {
        const cals = grupoCalMap.get(String(g.id)) || [];
        const prom = cals.length > 0 ? Math.round(cals.reduce((s, v) => s + v, 0) / cals.length) : 0;
        return { grupo: String(g.nombre || ""), promedio: prom, estudiantes: grupoEstCount.get(String(g.id)) || 0 };
      }).sort((a, b) => a.grupo.localeCompare(b.grupo));
      setRendimientoPorGrupo(rpg);

      // --- Promedio general ---
      const allCals = calificaciones.map((c: any) => Number(c.calificacion ?? Number(c.nota || 0) * 20));
      const promGen = allCals.length > 0 ? Math.round((allCals.reduce((s, v) => s + v, 0) / allCals.length) * 10) / 10 : 0;
      setPromedioGeneral(promGen);

      // --- Distribución de rendimiento por estudiante ---
      // Se guarda también el periodo de cada nota para poder calcular una tendencia
      // real (no existe una columna `tendencia` en el backend).
      const estCalMap = new Map<string, { valor: number; periodo: number }[]>();
      calificaciones.forEach((c: any) => {
        const estId = String(c.estudiante_id);
        if (!estCalMap.has(estId)) estCalMap.set(estId, []);
        estCalMap.get(estId)!.push({
          valor: Number(c.calificacion ?? Number(c.nota || 0) * 20),
          periodo: Number(c.periodo || 1),
        });
      });
      const tendenciaEstudiante = (estId: string): string => {
        const cals = estCalMap.get(estId) || [];
        const periodos = Array.from(new Set(cals.map((c) => c.periodo))).sort((a, b) => a - b);
        if (periodos.length < 2) return "estable";
        const avgFor = (p: number) => {
          const vals = cals.filter((c) => c.periodo === p).map((c) => c.valor);
          return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        };
        const primero = avgFor(periodos[0]);
        const ultimo = avgFor(periodos[periodos.length - 1]);
        if (primero === null || ultimo === null) return "estable";
        if (ultimo > primero + 2) return "up";
        if (ultimo < primero - 2) return "down";
        return "estable";
      };
      let excelente = 0, bueno = 0, regular = 0, enRiesgo = 0;
      estudiantes.forEach((e: any) => {
        const cals = (estCalMap.get(String(e.id)) || []).map((c) => c.valor);
        const prom = cals.length > 0 ? cals.reduce((s, v) => s + v, 0) / cals.length : -1;
        if (prom < 0) return;
        if (prom >= 90) excelente++;
        else if (prom >= 80) bueno++;
        else if (prom >= 70) regular++;
        else enRiesgo++;
      });
      setDistribucionRiesgo([
        { name: "Excelente (≥90%)", value: excelente, color: "hsl(152, 55%, 42%)" },
        { name: "Bueno (≥80%)", value: bueno, color: "hsl(210, 70%, 55%)" },
        { name: "Regular (≥70%)", value: regular, color: "hsl(36, 90%, 55%)" },
        { name: "En riesgo (<70%)", value: enRiesgo, color: "hsl(0, 72%, 55%)" },
      ]);
      setTotalEnRiesgo(enRiesgo);

      // --- Estudiantes en riesgo ---
      const riesgoList: EstudianteRiesgo[] = [];
      estudiantes.forEach((e: any) => {
        const cals = (estCalMap.get(String(e.id)) || []).map((c) => c.valor);
        const prom = cals.length > 0 ? Math.round(cals.reduce((s, v) => s + v, 0) / cals.length) : -1;
        if (prom >= 0 && prom < 70) {
          riesgoList.push({
            nombre: String(e.nombre || ""),
            apellido: String(e.apellido || ""),
            grupo: grupoNameMap.get(String(e.grupo_id)) || "",
            promedio: prom,
            tendencia: tendenciaEstudiante(String(e.id)),
          });
        }
      });
      riesgoList.sort((a, b) => a.promedio - b.promedio);
      setEstudiantesEnRiesgo(riesgoList);

      // --- Tendencia mensual ---
      const mesesMap = new Map<string, number[]>();
      const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
      calificaciones.forEach((c: any) => {
        const dateVal = c.fecha_registro || c.created_at || c.fecha;
        if (!dateVal) return;
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return;
        const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
        if (!mesesMap.has(key)) mesesMap.set(key, []);
        mesesMap.get(key)!.push(Number(c.calificacion ?? Number(c.nota || 0) * 20));
      });
      const sortedMonths = Array.from(mesesMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      const tend: TendenciaItem[] = sortedMonths.map(([key, vals]) => {
        const d = new Date(key + "-01");
        return {
          mes: monthNames[d.getMonth()] + " " + d.getFullYear().toString().slice(2),
          promedio: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
        };
      });
      setTendenciaMensual(tend);

      if (tend.length >= 2) {
        const last = tend[tend.length - 1].promedio;
        const prev = tend[tend.length - 2].promedio;
        setMejoraMensual(Math.round((last - prev) * 10) / 10);
      }

      // --- Rendimiento por tipo de actividad ---
      const tipoCalMap = new Map<string, number[]>();
      calificaciones.forEach((c: any) => {
        const tipo = actTipoMap.get(String(c.actividad_id));
        if (tipo) {
          if (!tipoCalMap.has(tipo)) tipoCalMap.set(tipo, []);
          tipoCalMap.get(tipo)!.push(Number(c.calificacion ?? Number(c.nota || 0) * 20));
        }
      });
      const rpt: TipoRendimiento[] = Array.from(tipoCalMap.entries()).map(([tipo, vals]) => ({
        tipo: tipo.charAt(0).toUpperCase() + tipo.slice(1),
        promedio: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
      })).sort((a, b) => b.promedio - a.promedio);
      setRendimientoPorTipo(rpt);

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