import { test, expect } from '@playwright/test';
import { docente } from './datos';

// Flujo del rol BD (Jan Janos, S1): validación visible del formulario de estudiantes.
// Es crítico porque el estudiante es el recurso central de ClassKids: si el formulario
// deja pasar registros incompletos, las notas y alertas quedan sin dueño.

test('registrar un estudiante sin datos muestra que faltan campos obligatorios', async ({ page }) => {
  // Arrange: sesión de docente y formulario de registro abierto
  await page.goto('/auth');
  await page.getByLabel('Email').fill(docente.email);
  await page.getByLabel('Contraseña').fill(docente.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/app$/);
  await page.goto('/app/estudiantes');
  await page.getByRole('button', { name: 'Nuevo Estudiante' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Registrar nuevo estudiante' });

  // Act: se intenta registrar con el documento lleno y el resto vacío
  await dialogo.getByLabel('Documento').fill(`E2E-${Date.now()}`);
  await dialogo.getByRole('button', { name: 'Registrar' }).click();

  // Assert
  await expect(page.getByText('Completa todos los campos')).toBeVisible();
  await expect(dialogo).toBeVisible();
});
