import LegalLayout from "./LegalLayout";
import { CONTACT_EMAIL } from "@/lib/contact";

const ProteccionDatos = () => (
  <LegalLayout title="Protección de datos" updatedAt="septiembre de 2026">
    <p>
      ClassKids trata datos personales de estudiantes, docentes y administradores en el marco de la
      Ley 1581 de 2012 y el Decreto 1377 de 2013 de Colombia, que regulan la protección de datos
      personales y el derecho de habeas data.
    </p>

    <section>
      <h2 className="font-display text-xl font-semibold text-[#20262d]">1. Responsable del tratamiento</h2>
      <p className="mt-2">
        El colegio que administra la cuenta institucional actúa como responsable del tratamiento de los
        datos académicos registrados en ClassKids. La plataforma actúa como encargada técnica del
        tratamiento, aplicando las medidas de seguridad descritas en esta política.
      </p>
    </section>

    <section>
      <h2 className="font-display text-xl font-semibold text-[#20262d]">2. Medidas de seguridad</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Contraseñas cifradas con PBKDF2; nunca se almacenan en texto plano.</li>
        <li>Autenticación mediante token (JWT) con tiempo de expiración.</li>
        <li>Acceso segmentado por rol (administrador / docente).</li>
        <li>Comunicación entre el navegador y el servidor sobre HTTPS en entornos de producción.</li>
      </ul>
    </section>

    <section>
      <h2 className="font-display text-xl font-semibold text-[#20262d]">3. Derechos de los titulares</h2>
      <p className="mt-2">
        Como titular de los datos (o acudiente de un estudiante menor de edad), puedes solicitar en
        cualquier momento: conocer, actualizar, rectificar o suprimir tus datos, así como revocar la
        autorización de tratamiento cuando la ley lo permita. Estas solicitudes se canalizan a través de
        la coordinación del colegio o directamente a{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#147d68] hover:underline">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </section>

    <section>
      <h2 className="font-display text-xl font-semibold text-[#20262d]">4. Datos de menores de edad</h2>
      <p className="mt-2">
        Los datos de estudiantes menores de edad se registran por el colegio con fines exclusivamente
        académicos y bajo la responsabilidad de la institución educativa, conforme al interés superior
        del menor.
      </p>
    </section>

    <section>
      <h2 className="font-display text-xl font-semibold text-[#20262d]">5. Vigencia</h2>
      <p className="mt-2">
        Esta política aplica mientras exista una relación con el colegio y se conserven datos en la
        plataforma. Puede actualizarse para ajustarse a cambios normativos o técnicos.
      </p>
    </section>
  </LegalLayout>
);

export default ProteccionDatos;
