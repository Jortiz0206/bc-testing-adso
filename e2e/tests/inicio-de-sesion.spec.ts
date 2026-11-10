import { test, expect } from '@playwright/test';
import { docente } from './datos';

// Flujo del rol Front (Johanna Ortiz, S1): inicio de sesión con credenciales válidas.
// Es crítico porque sin sesión ningún docente puede registrar notas ni alertas.

test('la página de inicio muestra el título de ClassKids', async ({ page }) => {
  // Arrange / Act
  await page.goto('/');

  // Assert
  await expect(page).toHaveTitle('ClassKids - Seguimiento Académico');
});

test('un docente con credenciales válidas entra al panel y ve su saludo', async ({ page }) => {
  // Arrange
  await page.goto('/auth');

  // Act
  await page.getByLabel('Email').fill(docente.email);
  await page.getByLabel('Contraseña').fill(docente.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  // Assert
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('heading', { name: `Hola, ${docente.nombre}.` })).toBeVisible();
});
