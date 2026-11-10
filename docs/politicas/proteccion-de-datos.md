# Protección de datos

> Publicado en la plataforma en [`frontend/src/pages/legal/ProteccionDatos.tsx`](../../frontend/src/pages/legal/ProteccionDatos.tsx), enlazado desde el CTA final y el pie de página de la landing (`/legal/proteccion-datos`).

Última actualización: septiembre de 2026.

ClassKids trata datos personales de estudiantes, docentes y administradores en el marco de la Ley 1581
de 2012 y el Decreto 1377 de 2013 de Colombia, que regulan la protección de datos personales y el
derecho de habeas data.

## 1. Responsable del tratamiento

El colegio que administra la cuenta institucional actúa como responsable del tratamiento de los datos
académicos registrados en ClassKids. La plataforma actúa como encargada técnica del tratamiento,
aplicando las medidas de seguridad descritas a continuación.

## 2. Medidas de seguridad implementadas

- Contraseñas cifradas con PBKDF2 (`passlib`); nunca se almacenan en texto plano.
- Autenticación mediante token JWT con tiempo de expiración (ver
  [`referencia-tecnica/architecture.md`](../referencia-tecnica/architecture.md)).
- Acceso segmentado por rol (administrador / docente).
- Restricción de copiar/pegar en los campos de contraseña del login, restablecimiento e invitación,
  para reforzar la digitación manual de credenciales (`frontend/src/lib/passwordField.ts`).
- Comunicación entre el navegador y el servidor sobre HTTPS en entornos de producción.

## 3. Derechos de los titulares

Como titular de los datos (o acudiente de un estudiante menor de edad), se puede solicitar en cualquier
momento: conocer, actualizar, rectificar o suprimir los datos, así como revocar la autorización de
tratamiento cuando la ley lo permita. Estas solicitudes se canalizan a través de la coordinación del
colegio o directamente al correo de contacto definido en
[`frontend/src/lib/contact.ts`](../../frontend/src/lib/contact.ts).

## 4. Datos de menores de edad

Los datos de estudiantes menores de edad se registran por el colegio con fines exclusivamente
académicos y bajo la responsabilidad de la institución educativa, conforme al interés superior del
menor.

## 5. Vigencia

Esta política aplica mientras exista una relación con el colegio y se conserven datos en la plataforma.
Puede actualizarse para ajustarse a cambios normativos o técnicos.
