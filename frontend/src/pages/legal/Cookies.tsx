import LegalLayout from "./LegalLayout";
import { CONTACT_EMAIL } from "@/lib/contact";

const Cookies = () => (
  <LegalLayout title="Política de cookies" updatedAt="septiembre de 2026">
    <p>
      ClassKids utiliza almacenamiento del navegador de forma limitada, únicamente para mantener tu
      sesión iniciada y recordar tus preferencias dentro de la plataforma.
    </p>

    <section>
      <h2 className="font-display text-xl font-semibold text-[#20262d]">1. Qué almacenamos</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>
          <strong>Sesión (obligatorio):</strong> un token de autenticación que identifica tu cuenta
          mientras usas la plataforma. Sin él no es posible mantener la sesión iniciada.
        </li>
        <li>
          <strong>Preferencias de interfaz (opcional):</strong> ajustes como el estado del menú lateral,
          para que la plataforma recuerde tu forma de trabajo entre visitas.
        </li>
      </ul>
    </section>

    <section>
      <h2 className="font-display text-xl font-semibold text-[#20262d]">2. Lo que no hacemos</h2>
      <p className="mt-2">
        ClassKids no utiliza cookies de publicidad ni de rastreo de terceros. No compartimos información
        de navegación con redes publicitarias ni con otras plataformas.
      </p>
    </section>

    <section>
      <h2 className="font-display text-xl font-semibold text-[#20262d]">3. Cómo gestionarlas</h2>
      <p className="mt-2">
        Puedes borrar el almacenamiento local de tu navegador en cualquier momento; ten en cuenta que
        esto cerrará tu sesión y deberás iniciar sesión nuevamente.
      </p>
    </section>

    <section>
      <h2 className="font-display text-xl font-semibold text-[#20262d]">4. Contacto</h2>
      <p className="mt-2">
        Si tienes preguntas sobre esta política, escríbenos a{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#147d68] hover:underline">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </section>
  </LegalLayout>
);

export default Cookies;
