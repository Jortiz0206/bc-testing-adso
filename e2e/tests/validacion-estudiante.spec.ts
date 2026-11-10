import { test, expect } from '@playwright/test';
import { EstudiantesPage } from '../pages/EstudiantesPage';

// Flujo del rol BD (Jan Janos, S1; actualizado por Jan Janos, BD en S7): validación visible del formulario de estudiantes.
// Desde la semana 7 reutiliza la sesión guardada por auth.setup.ts.

test('registrar un estudiante sin datos muestra que faltan campos obligatorios', async ({ page }) => {
  const estudiantes = new EstudiantesPage(page);
  await estudiantes.abrir();

  await estudiantes.llenarRegistro({ documento: `E2E-${Date.now()}` });
  await estudiantes.botonRegistrar().click();

  await expect(page.getByText('Completa todos los campos')).toBeVisible();
  await expect(estudiantes.dialogo).toBeVisible();
});
