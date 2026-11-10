import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import logoC from "@/assets/logo-ClassKids.png";

const LEGAL_LINKS = [
  { to: "/legal/terminos", label: "Términos y condiciones" },
  { to: "/legal/privacidad", label: "Política de privacidad" },
  { to: "/legal/cookies", label: "Política de cookies" },
  { to: "/legal/proteccion-datos", label: "Protección de datos" },
];

interface LegalLayoutProps {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}

const LegalLayout = ({ title, updatedAt, children }: LegalLayoutProps) => {
  return (
    <div className="min-h-screen bg-[#f6f4ef] text-[#20262d]">
      <header className="border-b border-[#20262d]/10 bg-[#f6f4ef]/95">
        <div className="mx-auto flex h-[76px] max-w-4xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoC} alt="ClassKids" className="h-10 w-10 rounded-xl" />
            <span className="font-display text-xl font-bold tracking-tight">ClassKids</span>
          </Link>
          <Link to="/" className="flex items-center gap-2 text-sm font-medium text-[#20262d]/60 hover:text-[#20262d]">
            <ArrowLeft className="h-4 w-4" /> Volver al inicio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-14">
        <nav className="mb-10 flex flex-wrap gap-x-6 gap-y-2 border-b border-[#20262d]/10 pb-6 text-sm">
          {LEGAL_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="text-[#20262d]/55 hover:text-[#147d68]">
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#147d68]">Documento legal</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.03em]">{title}</h1>
        <p className="mt-2 text-sm text-[#20262d]/45">Última actualización: {updatedAt}</p>

        <div className="prose-legal mt-10 space-y-6 text-[15px] leading-7 text-[#20262d]/75">
          {children}
        </div>
      </main>

      <footer className="border-t border-[#20262d]/10 px-6 py-8 text-center text-xs text-[#20262d]/40">
        © {new Date().getFullYear()} ClassKids — Proyecto de formación ADSO, SENA.
      </footer>
    </div>
  );
};

export default LegalLayout;
