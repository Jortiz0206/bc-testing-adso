import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, ArrowUpRight, BarChart3, BookOpen, Check, ClipboardCheck, GraduationCap, LayoutDashboard, Mail, Search, Target, Users } from "lucide-react";
import logoC from "@/assets/logo-ClassKids.png";
import { CONTACT_EMAIL } from "@/lib/contact";

const LEGAL_LINKS = [
  { to: "/legal/terminos", label: "Términos y condiciones" },
  { to: "/legal/privacidad", label: "Política de privacidad" },
  { to: "/legal/cookies", label: "Política de cookies" },
  { to: "/legal/proteccion-datos", label: "Protección de datos" },
];

const Landing = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const dashHref = user ? (isAdmin ? "/admin" : "/app") : "/auth";

  const steps = [
    [Users, "01", "Organiza", "Reúne grupos, estudiantes, materias y actividades en un solo lugar."],
    [Search, "02", "Observa", "Lee calificaciones, promedios y alertas sin perderte en archivos."],
    [Target, "03", "Actúa", "Ajusta el trabajo de aula y registra el acompañamiento realizado."],
  ] as const;

  const modules = [
    [Users, "Grupos y estudiantes", "Contexto completo para entender a quién acompañar."],
    [ClipboardCheck, "Calificaciones", "Registro por materia y periodo, listo para consultar."],
    [BarChart3, "Análisis", "Una lectura rápida del rendimiento de cada grupo."],
    [BookOpen, "Actividades", "Planeación conectada con las necesidades observadas."],
  ] as const;

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-[#20262d]">
      <header className="border-b border-[#20262d]/10 bg-[#f6f4ef]/95">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-6 lg:px-10">
          <Link to="/" className="flex items-center gap-3"><img src={logoC} alt="ClassKids" className="h-10 w-10 rounded-xl" /><span className="font-display text-xl font-bold tracking-tight">ClassKids</span></Link>
          <nav className="hidden items-center gap-8 text-base font-semibold text-[#20262d]/85 md:flex"><a href="#producto" className="hover:text-[#147d68]">Producto</a><a href="#metodo" className="hover:text-[#147d68]">Cómo funciona</a><a href="#colegios" className="hover:text-[#147d68]">Para colegios</a></nav>
          <Link to={dashHref}><Button className="h-10 rounded-lg bg-[#20262d] px-5 text-base text-white hover:bg-[#34414a]">{user ? "Abrir plataforma" : "Iniciar sesión"}<ArrowUpRight className="ml-2 h-4 w-4" /></Button></Link>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-14 lg:grid-cols-[0.74fr_1.26fr] lg:px-10 lg:pb-24 lg:pt-20">
          <div className="max-w-xl"><p className="mb-5 text-sm font-bold uppercase tracking-[0.2em] text-[#147d68]">Seguimiento académico para colegios</p><h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-6xl">Convierte los datos del aula en mejores decisiones.</h1><p className="mt-6 max-w-lg text-lg leading-8 text-[#20262d]/65">ClassKids ayuda a detectar señales de bajo rendimiento, entender dónde aparecen y orientar actividades de apoyo para cada grupo.</p><div className="mt-8 flex flex-wrap items-center gap-4"><Link to={dashHref}><Button className="h-12 rounded-lg bg-[#147d68] px-6 text-base font-semibold text-white shadow-lg shadow-[#147d68]/20 hover:bg-[#0f6655]">{user ? "Ir al panel" : "Ver cómo funciona"}<ArrowRight className="ml-2 h-4 w-4" /></Button></Link><span className="text-base text-[#20262d]/50">Una herramienta para el trabajo real del colegio</span></div><div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-[#20262d]/10 pt-5 text-base text-[#20262d]/60">{["Señales visibles", "Actividades con contexto", "Seguimiento compartido"].map((item) => <span key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-[#147d68]" />{item}</span>)}</div><p className="mt-5 text-sm font-medium text-[#147d68]">Si usas WhatsApp o Excel, ya sabes usar ClassKids — sin curva de aprendizaje.</p>{!user && <p className="mt-4 text-sm text-[#20262d]/45">El acceso se otorga por invitación de tu colegio — no hay registro público. Si ya tienes cuenta, inicia sesión arriba.</p>}</div>

          <div><div className="overflow-hidden rounded-2xl border border-[#20262d]/15 bg-[#20262d] p-3 shadow-2xl shadow-[#20262d]/15 sm:p-4"><div className="overflow-hidden rounded-xl bg-[#f6f4ef]"><div className="flex h-12 items-center justify-between border-b border-[#20262d]/10 bg-white px-4">
<div className="flex items-center gap-2"><img src={logoC} alt="" className="h-6 w-6 rounded-md" /><span className="font-display text-sm font-bold">ClassKids</span></div><div className="flex items-center gap-2"><span className="hidden text-[10px] text-[#20262d]/45 sm:inline">Viernes, 22 de agosto</span><span className="h-6 w-6 rounded-full bg-[#147d68]" /></div></div><div className="grid min-h-[355px] grid-cols-[94px_1fr] sm:grid-cols-[145px_1fr]"><aside className="border-r border-[#20262d]/10 bg-[#20262d] p-3 text-white"><p className="mb-5 text-[9px] uppercase tracking-widest text-white/45">Panel</p>{[[LayoutDashboard, "Resumen"], [Users, "Estudiantes"], [BookOpen, "Actividades"], [BarChart3, "Análisis"]].map(([Icon, label], index) => { const NavIcon = Icon as typeof LayoutDashboard; return <div key={label as string} className={`mb-1 flex items-center gap-2 rounded-md px-2 py-2 text-[10px] ${index === 0 ? "bg-white/15 text-[#f4c95d]" : "text-white/55"}`}><NavIcon className="h-3.5 w-3.5" /><span className="hidden sm:inline">{label as string}</span></div>; })}<div className="mt-5 border-t border-white/10 pt-4 text-[9px] text-white/45">Docente</div></aside><div className="min-w-0 p-4 sm:p-6"><div className="flex items-end justify-between gap-3"><div><p className="text-[9px] font-bold uppercase tracking-widest text-[#147d68]">Resumen de la jornada</p><p className="mt-1 font-display text-lg font-semibold sm:text-2xl">Hola, Laura.</p></div><span className="hidden rounded-md border border-[#20262d]/10 bg-white px-2 py-1 text-[9px] text-[#20262d]/55 sm:inline">Este periodo</span></div><div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">{[["3", "Grupos"], ["72%", "Promedio"], ["8", "Alertas"]].map(([value, label], index) => <div key={label} className="rounded-lg border border-[#20262d]/10 bg-white p-2.5 sm:p-3"><p className={`font-display text-lg font-semibold sm:text-xl ${index === 2 ? "text-[#d86f54]" : "text-[#20262d]"}`}>{value}</p><p className="mt-1 text-[9px] text-[#20262d]/50">{label}</p></div>)}</div><div className="mt-4 grid gap-3 sm:grid-cols-[1.2fr_0.8fr]"><div className="rounded-lg border border-[#20262d]/10 bg-white p-3"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold">Rendimiento por materia</p><BarChart3 className="h-3.5 w-3.5 text-[#147d68]" /></div><div className="mt-5 flex h-24 items-end justify-around gap-2 border-b border-[#20262d]/10">{[["MAT", "62%", "h-[62%]"], ["ESP", "81%", "h-[81%]"], ["CIE", "74%", "h-[74%]"], ["SOC", "88%", "h-[88%]"]].map(([name, value, height]) => <div key={name} className="flex h-full flex-1 flex-col items-center justify-end gap-1"><span className="text-[8px] text-[#20262d]/45">{value}</span><div className={`w-full max-w-8 rounded-t-sm bg-[#147d68] ${height}`} /><span className="mb-1 text-[8px] text-[#20262d]/45">{name}</span></div>)}</div></div><div className="rounded-lg border border-[#20262d]/10 bg-white p-3"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold">Atención prioritaria</p><AlertTriangle className="h-3.5 w-3.5 text-[#d86f54]" /></div><div className="mt-4 space-y-3"><div><div className="flex justify-between text-[9px]"><span>Matemáticas · 4A</span><span className="text-[#d86f54]">Alta</span></div><div className="mt-1 h-1 rounded-full bg-[#f0e5df]"><div className="h-full w-[68%] rounded-full bg-[#d86f54]" /></div></div><div><div className="flex justify-between text-[9px]"><span>Lectura · 3B</span><span className="text-[#d99d24]">Media</span></div><div className="mt-1 h-1 rounded-full bg-[#f3edda]"><div className="h-full w-[45%] rounded-full bg-[#f4c95d]" /></div></div></div><p className="mt-5 text-[9px] leading-4 text-[#20262d]/45">Revisa actividades de refuerzo.</p></div></div></div></div></div></div><p className="mt-4 text-center text-sm text-[#20262d]/45">Así se ve un lunes en la mañana para una docente como Laura.</p></div>
        </section>

        <section id="producto" className="border-y border-[#20262d]/10 bg-white px-6 py-20 lg:px-10"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center"><div><p className="text-sm font-bold uppercase tracking-[0.2em] text-[#d86f54]">El problema que resolvemos</p><h2 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-[-0.04em]">Cuando una nota baja aparece, ya deberías tener contexto.</h2><p className="mt-6 text-base leading-7 text-[#20262d]/60">La información del aula suele existir, pero repartida entre archivos, cuadernos y conversaciones. ClassKids la reúne para que el equipo pueda observar antes, actuar mejor y volver a revisar.</p></div><div className="relative overflow-hidden rounded-2xl border border-[#20262d]/10 bg-[#f6f4ef] p-6 sm:p-8"><p className="text-sm font-bold uppercase tracking-widest text-[#147d68]">Así se ve en la práctica</p><div className="mt-5 grid grid-cols-3 gap-3">{([[Users, "10", "Grupos"], [GraduationCap, "200", "Estudiantes"], [AlertTriangle, "32", "Alertas activas"]] as const).map(([Icon, value, label]) => { const StatIcon = Icon as typeof Users; return <div key={label as string} className="rounded-xl border border-[#20262d]/10 bg-white p-4"><StatIcon className={`h-5 w-5 ${label === "Alertas activas" ? "text-[#d86f54]" : "text-[#147d68]"}`} /><p className="mt-3 font-display text-2xl font-semibold">{value}</p><p className="mt-1 text-sm text-[#20262d]/50">{label}</p></div>; })}</div><p className="mt-2 text-xs uppercase tracking-widest text-[#20262d]/35">Datos del entorno de demostración</p><div className="mt-5 rounded-xl border border-[#147d68]/20 bg-[#147d68]/5 p-5"><p className="text-sm font-bold uppercase tracking-widest text-[#147d68]">Así se activa una alerta</p><p className="mt-2 text-base leading-7 text-[#20262d]/65">Cuando el promedio acumulado de un estudiante baja de 3.0, ClassKids genera una alerta automática — sin que nadie tenga que estar revisando planillas todos los días.</p></div></div></div></section>

        <section id="metodo" className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24"><div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[0.2em] text-[#147d68]">Cómo funciona</p><h2 className="mt-4 font-display text-4xl font-semibold tracking-[-0.04em]">Un flujo simple para decisiones más oportunas.</h2></div><div className="mt-12 grid gap-8 border-t border-[#20262d]/10 pt-8 md:grid-cols-3">{steps.map(([Icon, number, title, text]) => { const StepIcon = Icon as typeof Users; return <article key={number as string}><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#147d68]/10 text-[#147d68]"><StepIcon className="h-5 w-5" /></span><span className="font-display text-base font-semibold text-[#d86f54]">{number}</span></div><h3 className="mt-6 font-display text-2xl font-semibold">{title}</h3><p className="mt-3 max-w-xs text-base leading-7 text-[#20262d]/60">{text}</p></article>; })}</div></section>

        <section id="colegios" className="bg-[#20262d] px-6 py-20 text-white lg:px-10 lg:py-24"><div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end"><div className="max-w-xl"><p className="text-sm font-bold uppercase tracking-[0.2em] text-[#f4c95d]">Para equipos educativos</p><h2 className="mt-4 font-display text-4xl font-semibold tracking-[-0.04em]">Una vista común para acompañar mejor.</h2><p className="mt-5 text-base leading-7 text-white/60">Docentes registran. Coordinación interpreta. El colegio actúa con una conversación basada en evidencia.</p></div><Link to={dashHref}><Button className="w-fit rounded-lg bg-[#f4c95d] px-6 text-base font-semibold text-[#20262d] hover:bg-[#f7d878]">Entrar a ClassKids<ArrowUpRight className="ml-2 h-4 w-4" /></Button></Link></div><div className="mt-14 grid gap-px overflow-hidden border border-white/15 bg-white/15 md:grid-cols-4">{modules.map(([Icon, title, text]) => <article key={title} className="bg-[#20262d] p-6"><Icon className="h-5 w-5 text-[#f4c95d]" /><h3 className="mt-8 font-display text-lg font-semibold">{title}</h3><p className="mt-3 text-base leading-7 text-white/55">{text}</p></article>)}</div></div></section>
        <section className="border-t border-[#20262d]/10 bg-white px-6 py-20 lg:px-10">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#147d68]">Empieza hoy</p>
            <h2 className="font-display text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Lleva el seguimiento académico de tu colegio a un solo lugar.
            </h2>
            <p className="max-w-xl text-lg leading-8 text-[#20262d]/60">
              El acceso se otorga por invitación institucional. Si tu colegio ya tiene cuenta en
              ClassKids, ingresa desde aquí; si quieres conocer la plataforma, escríbenos.
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
              <Link to={dashHref}>
                <Button className="h-12 rounded-lg bg-[#147d68] px-6 text-base font-semibold text-white shadow-lg shadow-[#147d68]/20 hover:bg-[#0f6655]">
                  {user ? "Ir al panel" : "Iniciar sesión"}<ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-2 text-base font-medium text-[#20262d]/70 hover:text-[#147d68]">
                <Mail className="h-4 w-4" />{CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#20262d] px-6 pb-10 text-white lg:px-10"><div className="mx-auto max-w-7xl border-t border-white/15 pt-8"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><img src={logoC} alt="ClassKids" className="h-8 w-8 rounded-lg" /><span className="font-display font-semibold">ClassKids</span></div><p className="text-base text-white/50">Seguimiento académico para equipos que acompañan mejor.</p><p className="text-sm text-white/35">© {new Date().getFullYear()} ClassKids</p></div><nav className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-6 text-sm text-white/45">{LEGAL_LINKS.map((link) => <Link key={link.to} to={link.to} className="hover:text-white">{link.label}</Link>)}</nav><p className="mt-6 flex items-center gap-2 text-sm text-white/35"><GraduationCap className="h-3.5 w-3.5" />Proyecto de formación del programa Análisis y Desarrollo de Software (ADSO) — Servicio Nacional de Aprendizaje (SENA).</p></div></footer>
    </div>
  );
};

export default Landing;
