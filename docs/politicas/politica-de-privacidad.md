# Política de privacidad

> Publicado en la plataforma en [`frontend/src/pages/legal/Privacidad.tsx`](../../frontend/src/pages/legal/Privacidad.tsx), enlazado desde el CTA final y el pie de página de la landing (`/legal/privacidad`).

Última actualización: septiembre de 2026.

En ClassKids se trata la información académica de estudiantes, docentes y administradores con el único
propósito de apoyar el seguimiento y acompañamiento escolar. Esta política explica qué datos se
recopilan, para qué se usan y cómo se protegen.

## 1. Datos que se tratan

- Datos de cuenta: nombre, correo institucional y contraseña (almacenada cifrada con PBKDF2).
- Datos académicos: grupos, materias, actividades, calificaciones y observaciones.
- Datos de estudiantes: nombre, apellido, documento y grupo asignado, registrados por el colegio.
- Datos técnicos básicos de sesión (token de acceso y fecha del último inicio de sesión).

## 2. Finalidad del tratamiento

Los datos se usan exclusivamente para permitir el registro académico, generar alertas de bajo
rendimiento y facilitar el acompañamiento de docentes y coordinación. No se usan con fines comerciales
ni se venden a terceros.

## 3. Acceso a la información

El acceso está segmentado por rol: los docentes ven la información de sus grupos y materias asignadas,
mientras que los administradores tienen una vista institucional. Nadie fuera del colegio tiene acceso a
estos datos.

## 4. Conservación

La información se conserva mientras la cuenta institucional permanezca activa. El colegio puede
solicitar la eliminación o corrección de datos a través de la coordinación académica.

## 5. Contacto

Para ejercer derechos sobre datos personales, escribe al correo de contacto definido en
[`frontend/src/lib/contact.ts`](../../frontend/src/lib/contact.ts). Ver también
[`proteccion-de-datos.md`](proteccion-de-datos.md).
