import { test, expect } from './api';
import { CalificacionesPage } from '../pages/CalificacionesPage';

// Rol Front (Johanna Ortiz, S7) · Parte 3: defectos de tiempos en los botones que crean o guardan.
// El retraso se simula dentro de page.route (red lenta); el test nunca espera con timeouts fijos.
const LENTO_MS = 800;

test('doble clic en "Crear grupo" con el API lento envía un solo POST', async ({ page }) => {
  let posts = 0;
  await page.route('**/grupos', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    posts++;
    await new Promise((r) => setTimeout(r, LENTO_MS));
    await route.fallback();
  });
  await page.goto('/app/grupos');
  await page.getByRole('button', { name: 'Nuevo Grupo' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Crear nuevo grupo' });
  await dialogo.getByRole('combobox', { name: 'Curso' }).click();
  await page.getByRole('option', { name: '5°B' }).click();
  await dialogo.getByRole('combobox', { name: 'Turno' }).click();
  await page.getByRole('option', { name: 'Vespertino' }).click();

  await dialogo.getByRole('button', { name: 'Crear grupo' }).dblclick();

  await expect(page.getByText('Grupo creado')).toBeVisible();
  expect(posts).toBe(1);
});

test('doble clic en "Guardar cambios" con el API lento guarda cada nota una sola vez', async ({ page, datos }) => {
  const grupo = await datos.grupo();
  const materia = await datos.materia();
  const actividad = await datos.actividad(grupo.id, materia.id);
  const est = await datos.estudiante(grupo.id);
  let posts = 0;
  await page.route('**/calificaciones', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    posts++;
    await new Promise((r) => setTimeout(r, LENTO_MS));
    await route.fallback();
  });
  const calificaciones = new CalificacionesPage(page);
  await calificaciones.abrir();
  await calificaciones.elegir(grupo.nombre, actividad.titulo);
  await calificaciones.calificar(`${est.nombre} ${est.apellido}`, 90);

  await page.getByRole('button', { name: 'Guardar cambios' }).dblclick();

  await expect(page.getByText('Calificaciones guardadas correctamente')).toBeVisible();
  expect(posts).toBe(1);
});

test('con la carga de grupos lenta, la actividad no se puede elegir antes que el grupo', async ({ page }) => {
  await page.route('**/grupos', async (route) => {
    await new Promise((r) => setTimeout(r, LENTO_MS));
    await route.fallback();
  });
  await page.goto('/app/calificaciones');

  await expect(page.getByRole('combobox', { name: 'Actividad' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Guardar cambios' })).toHaveCount(0);
});
