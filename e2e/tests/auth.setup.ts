import { test as setup, expect } from '@playwright/test';
import { docente } from './datos';
import { LoginPage } from '../pages/LoginPage';

// Inicia sesión una sola vez por corrida y guarda localStorage (token y usuario)
// en playwright/.auth/docente.json, que los demás tests cargan con storageState.
setup('sesión de docente', async ({ page }) => {
  const login = new LoginPage(page);
  await login.abrir();
  await login.entrar(docente.email, docente.password);
  await expect(page).toHaveURL(/\/app$/);
  await page.context().storageState({ path: 'playwright/.auth/docente.json' });
});
