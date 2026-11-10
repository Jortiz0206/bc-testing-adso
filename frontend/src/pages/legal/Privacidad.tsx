import LegalLayout from "./LegalLayout";
import { CONTACT_EMAIL } from "@/lib/contact";

const Privacidad = () => (
  <LegalLayout title="Política de privacidad" updatedAt="septiembre de 2026">
    <p>
      En ClassKids tratamos la información académica de estudiantes, docentes y administradores con el
      único propósito de apoyar el seguimiento y acompañamiento escolar. Esta política explica qué
      datos se recopilan, para qué se usan y cómo se protegen.
    </p>

    <section>
      <h2 className="font-display text-xl font-semibold text-[#20262d]">1. Datos que tratamos</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Datos de cuenta: nombre, correo institucional y contraseña (almacenada cifrada).</li>
        <li>Datos académicos: grupos, materias, actividades, calificaciones y observaciones.</li>
        <li>Datos de estudiantes: nombre, apellido, documento y grupo asignado, registrados por el colegio.</li>
        <li>Datos técnicos básicos de sesión (token de acceso y fecha del último inicio de sesión).</li>
      </ul>
    </section>

    <section>
      <h2 className="font-display text-xl font-semibold text-[#20262d]">2. Finalidad del tratamiento</h2>
      <p className="mt-2">
        Los datos se usan exclusivamente para permitir el registro académico, generar alertas de bajo
        rendimiento y facilitar el acompañamiento de docentes y coordinación. No se usan con fines
        comerciales ni se venden a terceros.
      </p>
    </section>

    <section>
      <h2 className="font-display text-xl font-semibold text-[#20262d]">3. Acceso a la información</h2>
      <p className="mt-2">
        El acceso está segmentado por rol: los docentes ven la información de sus grupos y materias
        asignadas, mientras que los administradores tienen una vista institucional. Nadie fuera del
        colegio tiene acceso a estos datos.
      </p>
    </section>

    <section>
      <h2 className="font-display text-xl font-semibold text-[#20262d]">4. Conservación</h2>
      <p className="mt-2">
        La información se conserva mientras la cuenta institucional permanezca activa. El colegio puede
        solicitar la eliminación o corrección de datos a través de la coordinación académica.
      </p>
    </section>

    <section>
      <h2 className="font-display text-xl font-semibold text-[#20262d]">5. Contacto</h2>
      <p className="mt-2">
        Para ejercer tus derechos sobre tus datos personales, escribe a{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#147d68] hover:underline">
          {CONTACT_EMAIL}
        </a>
        . Consulta también nuestra{" "}
        <a href="/legal/proteccion-datos" className="text-[#147d68] hover:underline">
          política de protección de datos
        </a>
        .
      </p>
    </section>
  </LegalLayout>
);

export default Privacidad;
