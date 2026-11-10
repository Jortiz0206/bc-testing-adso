import { test, expect } from '@playwright/test';
import { docente } from './datos';
import { LoginPage } from '../pages/LoginPage';

// Flujo crítico del rol Backend (Alejandra Guio, S7): el acceso a la plataforma.
// Es crítico porque mueve acceso y datos personales de menores: sin él nadie
// registra notas, y con un fallo cualquiera vería información que no le toca.
// Estos tests prueban el inicio de sesión mismo, así que NO usan la sesión guardada.
test.use({ storageState: { cookies: [], origins: [] } });

test('la página de inicio muestra el título de ClassKids', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('ClassKids - Seguimiento Académico');
});

test('un docente con credenciales válidas entra al panel y ve su saludo', async ({ page }) => {
  const login = new LoginPage(page);
  await login.abrir();

  await login.entrar(docente.email, docente.password);

  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('heading', { name: `Hola, ${docente.nombre}.` })).toBeVisible();
});

test('con una contraseña incorrecta se muestra un error y no se entra al panel', async ({ page }) => {
  const login = new LoginPage(page);
  await login.abrir();

  await login.entrar(docente.email, 'clave-equivocada');

  await expect(page.getByText('Correo o contraseña incorrectos')).toBeVisible();
  await expect(page).toHaveURL(/\/auth$/);
});

test('un docente que intenta abrir el panel de administración vuelve a su panel', async ({ page }) => {
  const login = new LoginPage(page);
  await login.abrir();
  await login.entrar(docente.email, docente.password);
  await expect(page).toHaveURL(/\/app$/);

  await page.goto('/admin/usuarios');

  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('heading', { name: 'Usuarios' })).toHaveCount(0);
});
