import { test, expect } from '@playwright/test';
import { docente } from './datos';

// Flujo del rol Backend (Alejandra Guio, S1): inicio de sesión con contraseña incorrecta.
// Es crítico porque protege el acceso: con una clave errada nadie debe entrar
// y la persona debe entender por qué no pudo.

test('con una contraseña incorrecta se muestra un error y no se entra al panel', async ({ page }) => {
  // Arrange
  await page.goto('/auth');

  // Act
  await page.getByLabel('Email').fill(docente.email);
  await page.getByLabel('Contraseña').fill('clave-equivocada');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  // Assert
  await expect(page.getByText('Correo o contraseña incorrectos')).toBeVisible();
  await expect(page).toHaveURL(/\/auth$/);
});
