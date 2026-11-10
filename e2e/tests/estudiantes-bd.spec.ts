import { test, expect } from '@playwright/test';
import { crearEstudiante, crearGrupo, entrarComo, sesionDocente, unico } from './api';

// Rol BD (Johanna Ortiz, S6): E2E contra el backend con la BD de pruebas.
// Ningún test depende de datos previos: cada uno crea por el API lo que necesita
// (grupo, estudiante) con valores únicos, así la suite pasa dos veces seguidas y
// después de un `docker compose down -v`.

test('un estudiante registrado por la UI queda en su grupo y aparece al buscarlo', async ({ page, request }) => {
  // Arrange
  const sesion = await sesionDocente(request);
  const grupo = await crearGrupo(request, sesion.access_token);
  const apellido = unico('Ruiz');
  await entrarComo(page, sesion);
  await page.goto('/app/estudiantes');

  // Act
  await page.getByRole('button', { name: 'Nuevo Estudiante' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Registrar nuevo estudiante' });
  await dialogo.getByLabel('Documento').fill(unico('DOC'));
  await dialogo.getByLabel('Nombre').fill('Ana');
  await dialogo.getByLabel('Apellido').fill(apellido);
  await dialogo.getByRole('combobox', { name: 'Grupo' }).click();
  await page.getByRole('option', { name: grupo.nombre }).click();
  await dialogo.getByRole('button', { name: 'Registrar' }).click();

  // Assert
  await expect(page.getByText('Estudiante registrado')).toBeVisible();
  await page.getByRole('textbox', { name: 'Buscar estudiante' }).fill(apellido);
  const fila = page.getByRole('row', { name: new RegExp(apellido) });
  await expect(fila).toHaveCount(1);
  await expect(fila.getByText(grupo.nombre)).toBeVisible();
});

test('registrar un documento que ya existe muestra el motivo y no duplica al estudiante', async ({ page, request }) => {
  const sesion = await sesionDocente(request);
  const grupo = await crearGrupo(request, sesion.access_token);
  const documento = unico('DOC');
  const apellido = unico('Gil');
  await crearEstudiante(request, sesion.access_token, { documento, nombre: 'Beto', apellido, grupo_id: grupo.id });
  await entrarComo(page, sesion);
  await page.goto('/app/estudiantes');

  await page.getByRole('button', { name: 'Nuevo Estudiante' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Registrar nuevo estudiante' });
  await dialogo.getByLabel('Documento').fill(documento);
  await dialogo.getByLabel('Nombre').fill('Otro');
  await dialogo.getByLabel('Apellido').fill(apellido);
  await dialogo.getByRole('combobox', { name: 'Grupo' }).click();
  await page.getByRole('option', { name: grupo.nombre }).click();
  await dialogo.getByRole('button', { name: 'Registrar' }).click();

  await expect(page.getByText(/Ya existe un registro con esos datos/)).toBeVisible();
  await dialogo.getByRole('button', { name: 'Cancelar' }).click();
  await page.getByRole('textbox', { name: 'Buscar estudiante' }).fill(apellido);
  await expect(page.getByRole('row', { name: new RegExp(apellido) })).toHaveCount(1);
});
