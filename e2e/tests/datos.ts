// Usuarios de prueba para los E2E. Las contraseñas NO se escriben en el repo
// (ver "Datos de demostración" en el README): llegan por variables de entorno.
//
//   E2E_DOCENTE_EMAIL / E2E_DOCENTE_PASSWORD   cuenta docente de la BD de pruebas
//   E2E_ADMIN_EMAIL   / E2E_ADMIN_PASSWORD     cuenta administradora de la BD de pruebas
function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre} para los tests E2E (ver README, sección Pruebas).`);
  }
  return valor;
}

export const docente = {
  email: process.env.E2E_DOCENTE_EMAIL ?? 'docente@classkids.local',
  get password() {
    return requerida('E2E_DOCENTE_PASSWORD');
  },
  nombre: process.env.E2E_DOCENTE_NOMBRE ?? 'Docente ClassKids',
};

export const admin = {
  email: process.env.E2E_ADMIN_EMAIL ?? 'admin@classkids.local',
  get password() {
    return requerida('E2E_ADMIN_PASSWORD');
  },
};
