import { test, expect, type Page } from '@playwright/test';

// Rol Front (Jan Janos, S5): estados difíciles de provocar con el backend real, usando page.route.
// Todo el API se reemplaza (stub) y la sesión se siembra en localStorage, así que
// estos tests no necesitan backend ni BD: solo el frontend que levanta Playwright.
const API = process.env.E2E_API_URL ?? 'http://127.0.0.1:8000';

async function conSesionDeDocente(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('classkids_token', 'token-de-prueba');
    localStorage.setItem('classkids_user', JSON.stringify({ id: 2, email: 'docente@classkids.local', nombre: 'Laura', rol: 'docente' }));
  });
}

/** Responde [] a cualquier GET del API que el test no haya preparado. */
async function apiVacio(page: Page) {
  await page.route(`${API}/**`, (route) =>
    route.request().method() === 'GET' ? route.fulfill({ json: [] }) : route.fallback(),
  );
}

test('con el API caído, la lista de estudiantes avisa el error y no muestra datos viejos', async ({ page }) => {
  // Arrange
  await conSesionDeDocente(page);
  await apiVacio(page);
  await page.route(`${API}/estudiantes`, (route) => route.abort('connectionrefused'));

  // Act
  await page.goto('/app/estudiantes');

  // Assert
  await expect(page.getByText('Error al cargar los estudiantes')).toBeVisible();
  await expect(page.getByText('No se encontraron estudiantes')).toBeVisible();
});

test('sin alertas registradas, la página lo dice en vez de quedar en blanco', async ({ page }) => {
  await conSesionDeDocente(page);
  await apiVacio(page);

  await page.goto('/app/alertas');

  await expect(page.getByRole('heading', { name: 'Alertas tempranas' })).toBeVisible();
  await expect(page.getByText('No hay alertas con los filtros seleccionados')).toBeVisible();
  await expect(page.getByText('0 alertas')).toBeVisible();
});

test('si el API rechaza el registro (422), el diálogo sigue abierto con el error visible', async ({ page }) => {
  await conSesionDeDocente(page);
  await apiVacio(page);
  await page.route(`${API}/grupos`, (route) => route.fulfill({ json: [{ id: 1, nombre: 'Primero A' }] }));
  await page.route(`${API}/estudiantes`, (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({ status: 422, json: { detail: 'Datos inválidos - documento: String should have at most 50 characters' } })
      : route.fulfill({ json: [] }),
  );

  await page.goto('/app/estudiantes');
  await page.getByRole('button', { name: 'Nuevo Estudiante' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Registrar nuevo estudiante' });
  await dialogo.getByLabel('Documento').fill('9'.repeat(51));
  await dialogo.getByLabel('Nombre').fill('Ana');
  await dialogo.getByLabel('Apellido').fill('Ruiz');
  await dialogo.getByRole('combobox', { name: 'Grupo' }).click();
  await page.getByRole('option', { name: 'Primero A' }).click();
  await dialogo.getByRole('button', { name: 'Registrar' }).click();

  await expect(page.getByText('Error al registrar estudiante')).toBeVisible();
  await expect(dialogo).toBeVisible();
});
