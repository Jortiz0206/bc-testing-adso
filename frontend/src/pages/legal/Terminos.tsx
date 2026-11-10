import LegalLayout from "./LegalLayout";
import { CONTACT_EMAIL } from "@/lib/contact";

const Terminos = () => (
  <LegalLayout title="Términos y condiciones" updatedAt="septiembre de 2026">
    <p>
      Estos términos regulan el acceso y uso de ClassKids, una plataforma de seguimiento académico
      dirigida a colegios, docentes y personal administrativo. Al acceder con una cuenta institucional
      aceptas las condiciones descritas a continuación.
    </p>

    <section>
      <h2 className="font-display text-xl font-semibold text-[#20262d]">1. Acceso a la plataforma</h2>
      <p className="mt-2">
        El acceso es exclusivamente por invitación del colegio. No existe registro público: cada cuenta
        (administrador o docente) es creada por la coordinación de la institución, que define el rol y
        los permisos asociados. El usuario es responsable de mantener la confidencialidad de su contraseña
        y de no compartir sus credenciales con terceros.
      </p>
    </section>

    <section>
      <h2 className="font-display text-xl font-semibold text-[#20262d]">2. Uso adecuado</h2>
      <p className="mt-2">
        La información registrada en ClassKids (grupos, estudiantes, calificaciones, observaciones y
        alertas) debe usarse únicamente con fines de acompañamiento académico, dentro de las funciones
        propias del rol asignado. Queda prohibido el uso de la plataforma para fines distintos a los
        académicos, así como el intento de acceder a información de grupos o estudiantes fuera del
        alcance del usuario.
      </p>
    </section>

    <section>
      <h2 className="font-display text-xl font-semibold text-[#20262d]">3. Disponibilidad del servicio</h2>
      <p className="mt-2">
        ClassKids es un proyecto de formación desarrollado en el marco del programa Análisis y Desarrollo
        de Software (ADSO) del SENA. Al tratarse de un entorno académico/demostrativo, no se garantiza
        disponibilidad continua ni ausencia de interrupciones.
      </p>
    </section>

    <section>
      <h2 className="font-display text-xl font-semibold text-[#20262d]">4. Modificaciones</h2>
      <p className="mt-2">
        Estos términos pueden actualizarse para reflejar cambios en la plataforma. Los cambios relevantes
        se comunicarán a través de la institución educativa.
      </p>
    </section>

    <section>
      <h2 className="font-display text-xl font-semibold text-[#20262d]">5. Contacto</h2>
      <p className="mt-2">
        Para preguntas sobre estos términos, escribe a{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#147d68] hover:underline">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </section>
  </LegalLayout>
);

export default Terminos;
